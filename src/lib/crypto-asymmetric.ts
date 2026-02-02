/**
 * Asymmetric Crypto Layer - ECDH + AES-GCM Hybrid Encryption
 *
 * This module implements zero-knowledge encryption for anonymous "Stealth Drop" uploads.
 *
 * SECURITY PROPERTIES:
 * - Private keys are marked non-extractable (never leave client device)
 * - Forward secrecy: Each upload uses a unique ephemeral key
 * - Authenticated encryption via AES-GCM (tamper detection)
 * - HKDF key derivation with unique info string
 *
 * FLOW:
 * 1. Agent generates P-256 keypair, stores private in localStorage/keychain
 * 2. Public key Base64URL-encoded into burner URL
 * 3. Source generates ephemeral P-256 keypair
 * 4. ECDH derives shared secret (HKDF-SHA256, 32 bytes)
 * 5. AES-GCM-256 encrypts photo with derived key
 * 6. Upload: ciphertext + ephemeral public key + IV
 * 7. Agent uses ECDH with private key to derive same secret, decrypts
 */

// Constants
const ECDH_ALGORITHM = 'ECDH';
const ECDH_CURVE = 'P-256';
const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const HKDF_INFO = 'SaecretHeaven-Burner-v1';
const HKDF_SALT_LENGTH = 16;

/**
 * Result from burner keypair generation
 */
export interface BurnerKeyPair {
  /** Base64URL-encoded JWK public key (shareable, goes in URL) */
  publicKey: string;
  /** CryptoKey object (non-extractable, never leaves device) */
  privateKey: CryptoKey;
  /** Unique ID for this burner keypair */
  id: string;
}

/**
 * Result from encrypting for a burner link
 */
export interface BurnerEncryptedData {
  /** Encrypted data as ArrayBuffer */
  ciphertext: ArrayBuffer;
  /** Base64URL-encoded ephemeral public key for ECDH */
  ephemeralPublicKey: string;
  /** Base64-encoded AES-GCM IV (12 bytes) */
  iv: string;
  /** Base64-encoded HKDF salt (16 bytes) */
  salt: string;
}

/**
 * Serialized burner keypair for storage
 */
export interface SerializedBurnerKeyPair {
  id: string;
  publicKey: string;
  /** Base64-encoded encrypted private key (for localStorage) */
  privateKeyJwk: JsonWebKey;
  createdAt: string;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Convert ArrayBuffer to Base64URL string
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Convert Base64URL string to ArrayBuffer
 */
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  // Add padding back
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to Base64 string (standard, with padding)
 */
/**
 * Import a raw Uint8Array key as a WebCrypto AES-GCM CryptoKey
 */
export async function importVaultKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    rawKey as unknown as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a secure random ID
 */
function generateSecureId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return arrayBufferToBase64Url(bytes.buffer);
}

// ============================================================
// KEY GENERATION
// ============================================================

/**
 * Generate a P-256 keypair for burner links
 *
 * SECURITY: Private key is marked non-extractable by default.
 * For storage, we generate a separate extractable copy that gets encrypted.
 *
 * @returns BurnerKeyPair with public key string and CryptoKey private key
 */
export async function generateBurnerKeyPair(): Promise<BurnerKeyPair> {
  // Generate non-extractable keypair for runtime use
  const keyPair = await crypto.subtle.generateKey(
    {
      name: ECDH_ALGORITHM,
      namedCurve: ECDH_CURVE,
    },
    false, // NOT extractable - private key stays in memory
    ['deriveKey', 'deriveBits']
  );

  // Export public key as JWK for URL embedding
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const encoded = new TextEncoder().encode(JSON.stringify(publicKeyJwk));
  const publicKeyString = arrayBufferToBase64Url(encoded.buffer);

  return {
    publicKey: publicKeyString,
    privateKey: keyPair.privateKey,
    id: generateSecureId(),
  };
}

/**
 * Generate an extractable keypair for storage
 * This is used when we need to persist the private key (e.g., localStorage)
 *
 * @returns Keypair with extractable private key
 */
export async function generateStorableBurnerKeyPair(): Promise<{
  publicKey: string;
  privateKey: CryptoKey;
  privateKeyJwk: JsonWebKey;
  id: string;
}> {
  // Generate extractable keypair for storage
  const keyPair = await crypto.subtle.generateKey(
    {
      name: ECDH_ALGORITHM,
      namedCurve: ECDH_CURVE,
    },
    true, // Extractable for storage
    ['deriveKey', 'deriveBits']
  );

  // Export both keys
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  const encodedPublic = new TextEncoder().encode(JSON.stringify(publicKeyJwk));
  const publicKeyString = arrayBufferToBase64Url(encodedPublic.buffer);

  return {
    publicKey: publicKeyString,
    privateKey: keyPair.privateKey,
    privateKeyJwk,
    id: generateSecureId(),
  };
}

/**
 * Import a private key from JWK (for restoring from storage)
 */
export async function importBurnerPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: ECDH_ALGORITHM,
      namedCurve: ECDH_CURVE,
    },
    false, // Non-extractable after import
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Import a public key from Base64URL-encoded JWK string
 */
export async function importBurnerPublicKey(publicKeyString: string): Promise<CryptoKey> {
  const jwkBytes = base64UrlToArrayBuffer(publicKeyString);
  const jwkString = new TextDecoder().decode(jwkBytes);
  const jwk = JSON.parse(jwkString) as JsonWebKey;

  return crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: ECDH_ALGORITHM,
      namedCurve: ECDH_CURVE,
    },
    true, // Public keys can be extractable
    [] // No operations needed for public key alone
  );
}

// ============================================================
// ENCRYPTION (Source/Anonymous side)
// ============================================================

/**
 * Encrypt data for a burner link using ECDH + AES-GCM
 *
 * This is called by the anonymous source when uploading.
 *
 * FLOW:
 * 1. Generate ephemeral P-256 keypair
 * 2. ECDH with recipient's public key to get shared secret
 * 3. HKDF to derive AES key from shared secret
 * 4. AES-GCM encrypt the data
 * 5. Return ciphertext + ephemeral public key + IV + salt
 *
 * @param data - Raw data to encrypt (photo as ArrayBuffer)
 * @param recipientPublicKey - Base64URL-encoded public key from burner URL
 * @returns Encrypted data with metadata for decryption
 */
export async function encryptForBurner(
  data: ArrayBuffer,
  recipientPublicKey: string
): Promise<BurnerEncryptedData> {
  // 1. Import recipient's public key
  const recipientKey = await importBurnerPublicKey(recipientPublicKey);

  // 2. Generate ephemeral keypair (extractable to export public key)
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    {
      name: ECDH_ALGORITHM,
      namedCurve: ECDH_CURVE,
    },
    true, // Extractable to export public key
    ['deriveKey', 'deriveBits']
  );

  // 3. ECDH: Derive shared secret bits
  const sharedSecretBits = await crypto.subtle.deriveBits(
    {
      name: ECDH_ALGORITHM,
      public: recipientKey,
    },
    ephemeralKeyPair.privateKey,
    256 // 32 bytes
  );

  // 4. Generate salt for HKDF
  const salt = crypto.getRandomValues(new Uint8Array(HKDF_SALT_LENGTH));

  // 5. Import shared secret for HKDF
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecretBits,
    'HKDF',
    false,
    ['deriveKey']
  );

  // 6. HKDF: Derive AES key from shared secret
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: salt,
      info: new TextEncoder().encode(HKDF_INFO),
      hash: 'SHA-256',
    },
    sharedSecretKey,
    {
      name: AES_ALGORITHM,
      length: AES_KEY_LENGTH,
    },
    false,
    ['encrypt']
  );

  // 7. Generate IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // 8. AES-GCM encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: AES_ALGORITHM,
      iv: iv,
    },
    aesKey,
    data
  );

  // 9. Export ephemeral public key
  const ephemeralPublicJwk = await crypto.subtle.exportKey('jwk', ephemeralKeyPair.publicKey);
  const encodedEphemeral = new TextEncoder().encode(JSON.stringify(ephemeralPublicJwk));
  const ephemeralPublicKeyString = arrayBufferToBase64Url(encodedEphemeral.buffer);

  // 10. SECURITY: Zero out the ephemeral private key from memory
  // Note: JavaScript doesn't provide direct memory access, but we can
  // at least not keep references to it

  return {
    ciphertext,
    ephemeralPublicKey: ephemeralPublicKeyString,
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
  };
}

// ============================================================
// DECRYPTION (Agent/Vault side)
// ============================================================

/**
 * Decrypt data from a burner link upload using ECDH + AES-GCM
 *
 * This is called by the vault owner when viewing uploads.
 *
 * FLOW:
 * 1. Import ephemeral public key from upload
 * 2. ECDH with our private key to get shared secret
 * 3. HKDF to derive AES key from shared secret
 * 4. AES-GCM decrypt the data
 *
 * @param ciphertext - Encrypted data
 * @param ephemeralPublicKey - Base64URL-encoded ephemeral public key from upload
 * @param iv - Base64-encoded IV
 * @param salt - Base64-encoded HKDF salt
 * @param privateKey - Our private key (CryptoKey)
 * @returns Decrypted data as ArrayBuffer
 */
export async function decryptFromBurner(
  ciphertext: ArrayBuffer,
  ephemeralPublicKey: string,
  iv: string,
  salt: string,
  privateKey: CryptoKey
): Promise<ArrayBuffer> {
  // 1. Import ephemeral public key
  const ephemeralKey = await importBurnerPublicKey(ephemeralPublicKey);

  // 2. ECDH: Derive shared secret bits
  const sharedSecretBits = await crypto.subtle.deriveBits(
    {
      name: ECDH_ALGORITHM,
      public: ephemeralKey,
    },
    privateKey,
    256 // 32 bytes
  );

  // 3. Import shared secret for HKDF
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecretBits,
    'HKDF',
    false,
    ['deriveKey']
  );

  // 4. HKDF: Derive AES key from shared secret
  const saltBuffer = base64ToArrayBuffer(salt);
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: new Uint8Array(saltBuffer),
      info: new TextEncoder().encode(HKDF_INFO),
      hash: 'SHA-256',
    },
    sharedSecretKey,
    {
      name: AES_ALGORITHM,
      length: AES_KEY_LENGTH,
    },
    false,
    ['decrypt']
  );

  // 5. Decode IV
  const ivBuffer = base64ToArrayBuffer(iv);

  // 6. AES-GCM decrypt
  const plaintext = await crypto.subtle.decrypt(
    {
      name: AES_ALGORITHM,
      iv: new Uint8Array(ivBuffer),
    },
    aesKey,
    ciphertext
  );

  return plaintext;
}

// ============================================================
// STORAGE HELPERS
// ============================================================

// ============================================================
// STORAGE HELPERS (ENCRYPTED)
// ============================================================

const BURNER_KEYS_STORAGE_KEY = 'photovault_burner_keys_v2'; // New key for encrypted version

export interface EncryptedBurnerKeyPair {
  id: string;
  publicKey: string; // Public key is safe to be public
  encryptedPrivateKey: string; // Base64 ciphertext
  iv: string; // Base64 IV
  salt: string; // Base64 Salt
  createdAt: string;
}

/**
 * Encrypt and save burner keypair to localStorage
 * 
 * SECURITY: Private key is AES-GCM encrypted with the User's Vault Key.
 * Even if localStorage is dumped, the keys are useless without the vault password.
 */
export async function saveBurnerKeyPair(
  id: string,
  publicKey: string,
  privateKeyJwk: JsonWebKey,
  vaultKey: CryptoKey
): Promise<void> {
  const stored = loadEncryptedStore();

  // Serialize private key
  const privateKeyString = JSON.stringify(privateKeyJwk);
  const dataRef = new TextEncoder().encode(privateKeyString);

  // Encrypt with Vault Key
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    vaultKey,
    dataRef
  );

  const serialized: EncryptedBurnerKeyPair = {
    id,
    publicKey,
    encryptedPrivateKey: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
    salt: "", // Not used if using VaultKey directly (which is already derived)
    createdAt: new Date().toISOString(),
  };

  stored[id] = serialized;
  localStorage.setItem(BURNER_KEYS_STORAGE_KEY, JSON.stringify(stored));
}

function loadEncryptedStore(): Record<string, EncryptedBurnerKeyPair> {
  const stored = localStorage.getItem(BURNER_KEYS_STORAGE_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

/**
 * Load and decrypt a specific burner keypair
 */
export async function loadBurnerKeyPair(
  id: string,
  vaultKey: CryptoKey
): Promise<{ publicKey: string; privateKey: CryptoKey; privateKeyJwk: JsonWebKey } | null> {
  const stored = loadEncryptedStore();
  const encrypted = stored[id];

  if (!encrypted) return null;

  try {
    // Decrypt
    const ciphertext = base64ToArrayBuffer(encrypted.encryptedPrivateKey);
    const iv = base64ToArrayBuffer(encrypted.iv);

    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      vaultKey,
      ciphertext
    );

    const privateKeyString = new TextDecoder().decode(plaintextBuffer);
    const privateKeyJwk = JSON.parse(privateKeyString);
    const privateKey = await importBurnerPrivateKey(privateKeyJwk);

    return {
      publicKey: encrypted.publicKey,
      privateKey,
      privateKeyJwk
    };
  } catch (e) {
    console.error("Failed to decrypt burner key", e);
    return null;
  }
}

/**
 * Load ALL public keys (doesn't require decryption)
 * Useful for finding which key matches an upload's public key
 */
export function getBurnerPublicKeys(): Record<string, string> {
  const stored = loadEncryptedStore();
  const result: Record<string, string> = {};
  Object.values(stored).forEach(k => {
    result[k.id] = k.publicKey;
  });
  return result;
}

/**
 * Load all encrypted burner keypairs (without decrypting private keys)
 */
export function loadAllBurnerKeyPairs(): Record<string, EncryptedBurnerKeyPair> {
  return loadEncryptedStore();
}

/**
 * Find Key ID by Public Key
 */
export function findKeyIdByPublicKey(publicKey: string): string | null {
  const stored = loadEncryptedStore();
  const found = Object.values(stored).find(k => k.publicKey === publicKey);
  return found ? found.id : null;
}

/**
 * Securely destroy a burner key
 * "Crypto-Shredding": Deletes the key, making all associated data permanently inaccessible.
 */
export function destroyBurnerKey(id: string): void {
  const stored = loadEncryptedStore();
  if (stored[id]) {
    // Overwrite in memory before delete (best effort in JS)
    stored[id].encryptedPrivateKey = "0000000000000000";
    stored[id].iv = "0000";
    delete stored[id];
    localStorage.setItem(BURNER_KEYS_STORAGE_KEY, JSON.stringify(stored));
  }
}

export function secureWipeAllBurnerKeys(): void {
  // Overwrite 3x with random data
  for (let i = 0; i < 3; i++) {
    const noise = new Uint8Array(1024);
    crypto.getRandomValues(noise);
    localStorage.setItem(BURNER_KEYS_STORAGE_KEY, arrayBufferToBase64(noise.buffer));
  }
  localStorage.removeItem(BURNER_KEYS_STORAGE_KEY);
}

// ============================================================
// FILE HELPERS
// ============================================================

/**
 * Encrypt a File/Blob for burner upload
 *
 * Convenience wrapper that handles File → ArrayBuffer conversion
 */
export async function encryptFileForBurner(
  file: Blob,
  recipientPublicKey: string
): Promise<{
  encryptedBlob: Blob;
  ephemeralPublicKey: string;
  iv: string;
  salt: string;
  originalSize: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const encrypted = await encryptForBurner(arrayBuffer, recipientPublicKey);

  return {
    encryptedBlob: new Blob([encrypted.ciphertext], { type: 'application/octet-stream' }),
    ephemeralPublicKey: encrypted.ephemeralPublicKey,
    iv: encrypted.iv,
    salt: encrypted.salt,
    originalSize: file.size,
  };
}

/**
 * Decrypt a blob from burner upload to original file
 */
export async function decryptFileFromBurner(
  encryptedBlob: Blob,
  ephemeralPublicKey: string,
  iv: string,
  salt: string,
  privateKey: CryptoKey,
  originalMimeType: string = 'image/jpeg'
): Promise<Blob> {
  const ciphertext = await encryptedBlob.arrayBuffer();
  const plaintext = await decryptFromBurner(
    ciphertext,
    ephemeralPublicKey,
    iv,
    salt,
    privateKey
  );

  return new Blob([plaintext], { type: originalMimeType });
}

// ============================================================
// URL HELPERS
// ============================================================

/**
 * Parse URL fragment manually (URLSearchParams can't handle Base64 correctly)
 *
 * URLSearchParams interprets '=' as key-value separator, which breaks Base64 padding.
 * This function handles fragments like: #s=abc123&k=eyJhbGc...==
 */
function parseFragment(fragment: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!fragment) return params;

  // Remove leading # if present
  const clean = fragment.startsWith('#') ? fragment.slice(1) : fragment;

  // Split by & and find first = for each part
  clean.split('&').forEach(part => {
    const eqIndex = part.indexOf('=');
    if (eqIndex > 0) {
      params[part.slice(0, eqIndex)] = part.slice(eqIndex + 1);
    }
  });

  return params;
}

/**
 * Extract public key and slug from a burner link URL
 *
 * NEW URL format: /d/[theme]/[content]#s=[slug]&k=[publicKey]
 * Both slug and key are in fragment - never sent to server or logged by messengers
 *
 * Backwards compatible with old format: /d/[theme]/[content]?s=[slug]#k=[publicKey]
 */
export function extractFromBurnerUrl(url: string): { slug: string | null; publicKey: string | null } {
  try {
    const urlObj = new URL(url, window.location.origin);

    // Parse fragment manually (not URLSearchParams - Base64 issues)
    const fragmentParams = parseFragment(urlObj.hash);

    // Get values from fragment first (preferred - privacy)
    let publicKey = fragmentParams['k'] || null;
    let slug = fragmentParams['s'] || null;

    // Backwards compatibility: Check query params if not in fragment
    if (!slug) {
      slug = urlObj.searchParams.get('s');
    }

    return { slug, publicKey };
  } catch {
    return { slug: null, publicKey: null };
  }
}

/**
 * Extract public key from a burner link URL
 * @deprecated Use extractFromBurnerUrl() instead for both slug and key
 */
export function extractPublicKeyFromUrl(url: string): string | null {
  return extractFromBurnerUrl(url).publicKey;
}

/**
 * Build a burner link URL
 *
 * SECURITY: Both slug and public key are in the URL fragment (#s=...&k=...)
 * This means they are NEVER sent to the server and NEVER logged by:
 * - Server logs
 * - CDN/proxy logs
 * - Messenger preview crawlers (WhatsApp, Telegram, etc.)
 * - Browser referrer headers
 *
 * WhatsApp/Messenger will only see: https://app.com/d/recipes/apple-pie
 */
export function buildBurnerLinkUrl(
  baseUrl: string,
  theme: string,
  contentSlug: string,
  slug: string,
  publicKey: string
): string {
  // Both slug and public key in fragment for maximum privacy
  return `${baseUrl}/d/${theme}/${contentSlug}#s=${slug}&k=${publicKey}`;
}

// ============================================================
// SIGNAL-STYLE KEY BUNDLE EXPORT/IMPORT
// ============================================================

/**
 * Exported bundle format for Signal-style device pairing
 * Contains all burner keys encrypted with the vault key
 */
export interface BurnerKeyBundle {
  version: 1;
  keys: Array<{
    id: string;
    publicKey: string;
    encryptedPrivateKey: string;
    iv: string;
    createdAt: string;
  }>;
  exportedAt: string;
}

/**
 * Export all burner keys as a bundle for device pairing
 *
 * SECURITY: The bundle is already encrypted with the vault key.
 * This function just serializes the encrypted store.
 * The receiving device must have the same vault key to decrypt.
 */
export function exportBurnerKeyBundle(): BurnerKeyBundle | null {
  const stored = loadEncryptedStore();
  const keys = Object.values(stored);

  if (keys.length === 0) return null;

  return {
    version: 1,
    keys: keys.map(k => ({
      id: k.id,
      publicKey: k.publicKey,
      encryptedPrivateKey: k.encryptedPrivateKey,
      iv: k.iv,
      createdAt: k.createdAt,
    })),
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Import burner keys from a bundle (Signal-style device pairing)
 *
 * SECURITY: The bundle keys are already encrypted with the vault key.
 * This function merges them into the local store, skipping duplicates.
 *
 * @returns Number of new keys imported
 */
export function importBurnerKeyBundle(bundle: BurnerKeyBundle): number {
  if (bundle.version !== 1) {
    console.warn("Unknown bundle version:", bundle.version);
    return 0;
  }

  const stored = loadEncryptedStore();
  let imported = 0;

  for (const key of bundle.keys) {
    // Skip if we already have this key
    if (stored[key.id]) {
      console.log("Skipping duplicate key:", key.id);
      continue;
    }

    // Also skip if we have a key with the same public key (different ID)
    const existingByPublicKey = Object.values(stored).find(k => k.publicKey === key.publicKey);
    if (existingByPublicKey) {
      console.log("Skipping key with duplicate public key:", key.id);
      continue;
    }

    // Add to store
    stored[key.id] = {
      id: key.id,
      publicKey: key.publicKey,
      encryptedPrivateKey: key.encryptedPrivateKey,
      iv: key.iv,
      salt: "", // Not used for vault key encryption
      createdAt: key.createdAt,
    };
    imported++;
  }

  localStorage.setItem(BURNER_KEYS_STORAGE_KEY, JSON.stringify(stored));
  console.log(`Imported ${imported} burner keys`);
  return imported;
}

/**
 * Get count of burner keys in the store
 */
export function getBurnerKeyCount(): number {
  const stored = loadEncryptedStore();
  return Object.keys(stored).length;
}
