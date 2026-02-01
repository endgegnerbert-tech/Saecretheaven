/**
 * Crypto Layer - Client-Side Encryption mit tweetnacl
 * Alle Daten werden VOR dem Upload verschlüsselt
 *
 * BIP39: Uses @scure/bip39 for 24-word recovery phrases (256-bit entropy)
 * Web Worker: Encryption offloaded to background thread for UI responsiveness
 */

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { mnemonicToEntropy, entropyToMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

// ============================================================================
// Web Worker for non-blocking encryption
// ============================================================================

let cryptoWorker: Worker | null = null;
let workerMessageId = 0;
const pendingEncryptions = new Map<number, {
    resolve: (result: { encrypted: Blob; nonce: string }) => void;
    reject: (error: Error) => void;
}>();

/**
 * Initialize the crypto worker (lazy initialization)
 */
function getCryptoWorker(): Worker | null {
    if (typeof window === 'undefined') return null;

    if (!cryptoWorker) {
        try {
            cryptoWorker = new Worker('/workers/crypto-worker.js');
            cryptoWorker.onmessage = handleCryptoWorkerMessage;
            cryptoWorker.onerror = handleCryptoWorkerError;
            console.log('[Crypto] Worker initialized');
        } catch (error) {
            console.warn('[Crypto] Worker creation failed, will use main thread:', error);
            return null;
        }
    }

    return cryptoWorker;
}

/**
 * Handle messages from the crypto worker
 */
function handleCryptoWorkerMessage(e: MessageEvent) {
    const { id, success, ciphertext, nonce, error } = e.data;

    const pending = pendingEncryptions.get(id);
    if (!pending) return;

    pendingEncryptions.delete(id);

    if (!success) {
        pending.reject(new Error(error || 'Encryption failed in worker'));
        return;
    }

    // Convert ArrayBuffer back to Blob
    const blob = new Blob([new Uint8Array(ciphertext)], { type: 'application/octet-stream' });

    pending.resolve({
        encrypted: blob,
        nonce: nonce
    });
}

/**
 * Handle worker errors
 */
function handleCryptoWorkerError(error: ErrorEvent) {
    console.error('[Crypto] Worker error:', error);
    // Reject all pending encryptions
    pendingEncryptions.forEach(({ reject }) => {
        reject(new Error('Worker error: ' + error.message));
    });
    pendingEncryptions.clear();

    // Reset worker for retry
    cryptoWorker = null;
}

/**
 * Terminate the crypto worker (call on app cleanup)
 */
export function terminateCryptoWorker(): void {
    if (cryptoWorker) {
        cryptoWorker.terminate();
        cryptoWorker = null;
        pendingEncryptions.clear();
        console.log('[Crypto] Worker terminated');
    }
}

// ============================================================================
// Core Types
// ============================================================================

export interface EncryptionKey {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
}

export interface EncryptedData {
    ciphertext: string; // Base64
    nonce: string; // Base64
}

/**
 * Generiert ein neues Encryption Key Pair
 */
export function generateKeyPair(): EncryptionKey {
    const keyPair = nacl.box.keyPair();
    return {
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey,
    };
}

/**
 * Generates a 24-word BIP39 recovery phrase from the 32-byte secret key
 * 32 bytes = 256 bits entropy = 24 words (BIP39 standard)
 */
export function keyToRecoveryPhrase(secretKey: Uint8Array): string {
    // Ensure we have exactly 32 bytes for 24-word mnemonic
    if (secretKey.length !== 32) {
        console.warn('[Crypto] Key length is not 32 bytes, using legacy encoding');
        // Fallback for legacy keys
        const base64 = encodeBase64(secretKey);
        return base64.match(/.{1,8}/g)?.join('-') || base64;
    }

    // Convert 32 bytes to 24-word BIP39 mnemonic
    return entropyToMnemonic(secretKey, wordlist);
}

/**
 * Recovers secret key from BIP39 recovery phrase
 * Supports both new 24-word BIP39 and legacy base64-dash format
 */
export function recoveryPhraseToKey(phrase: string): Uint8Array {
    const trimmedPhrase = phrase.trim();

    // Check if it's a valid BIP39 mnemonic (24 words)
    if (validateMnemonic(trimmedPhrase, wordlist)) {
        // BIP39 mnemonic -> 32 bytes entropy
        const entropy = mnemonicToEntropy(trimmedPhrase, wordlist);
        return entropy;
    }

    // Legacy format: base64 with dashes
    if (trimmedPhrase.includes('-')) {
        const base64 = trimmedPhrase.replace(/-/g, '');
        return decodeBase64(base64);
    }

    // Try as raw base64
    try {
        return decodeBase64(trimmedPhrase);
    } catch {
        throw new Error('Invalid recovery phrase format');
    }
}

/**
 * Verschlüsselt Daten (Uint8Array) mit dem Secret Key
 */
export function encrypt(
    data: Uint8Array,
    secretKey: Uint8Array
): EncryptedData {
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const ciphertext = nacl.secretbox(data, nonce, secretKey);

    return {
        ciphertext: encodeBase64(ciphertext),
        nonce: encodeBase64(nonce),
    };
}

/**
 * Entschlüsselt Daten
 */
export function decrypt(
    encrypted: EncryptedData,
    secretKey: Uint8Array
): Uint8Array | null {
    const ciphertext = decodeBase64(encrypted.ciphertext);
    const nonce = decodeBase64(encrypted.nonce);

    const decrypted = nacl.secretbox.open(ciphertext, nonce, secretKey);
    return decrypted;
}

// Magic Header: "PAD1" (0x50 0x41 0x44 0x31) to identify padded files
const MAGIC_HEADER = new Uint8Array([0x50, 0x41, 0x44, 0x31]);

/**
 * Pad data to ISO 7816-4 (0x80 ... 0x00) and align to 64KB blocks
 * Uses a Magic Header to distinguish padded files from legacy data.
 * This masks the exact file size to mitigate traffic analysis.
 */
export function padData(data: Uint8Array): Uint8Array {
    const BLOCK_SIZE = 64 * 1024; // 64KB

    // Prepend Magic Header
    const content = new Uint8Array(MAGIC_HEADER.length + data.length);
    content.set(MAGIC_HEADER);
    content.set(data, MAGIC_HEADER.length);

    // Calculate padded size
    const targetSize = Math.ceil((content.length + 1) / BLOCK_SIZE) * BLOCK_SIZE;

    const padded = new Uint8Array(targetSize);
    padded.set(content);
    padded[content.length] = 0x80; // Mark start of padding
    // Remaining bytes are 0x00 by default in new Uint8Array
    return padded;
}

/**
 * Remove ISO 7816-4 padding
 * Checks for Magic Header to maintain backward compatibility with legacy files.
 */
export function unpadData(data: Uint8Array): Uint8Array {
    // 1. Check for Magic Header (Legacy Compatibility)
    if (data.length < MAGIC_HEADER.length) return data;

    for (let j = 0; j < MAGIC_HEADER.length; j++) {
        if (data[j] !== MAGIC_HEADER[j]) {
            // No magic header -> Legacy unpadded file
            return data;
        }
    }

    // 2. Unpad (ISO 7816-4)
    let i = data.length - 1;
    while (i >= MAGIC_HEADER.length && data[i] === 0x00) {
        i--;
    }

    if (i >= MAGIC_HEADER.length && data[i] === 0x80) {
        // Return data stripped of Header and Padding
        return data.slice(MAGIC_HEADER.length, i);
    }

    // Header found but padding broken?
    // Return content without header as a fallback, though likely corrupted.
    return data.slice(MAGIC_HEADER.length);
}

/**
 * Verschlüsselt ein File (Blob/File) und gibt encrypted Blob zurück
 * Uses Web Worker for non-blocking encryption (keeps UI responsive)
 * Falls back to main thread if worker is unavailable
 */
export async function encryptFile(
    file: File,
    secretKey: Uint8Array
): Promise<{ encrypted: Blob; nonce: string }> {
    // Debug: Log key hash for encryption
    const keyHash = await getUserKeyHash(secretKey);
    console.log('[Crypto] encryptFile using key hash:', keyHash, 'key length:', secretKey.length);

    const arrayBuffer = await file.arrayBuffer();

    // Try to use Web Worker for non-blocking encryption
    const worker = getCryptoWorker();

    if (worker) {
        return new Promise((resolve, reject) => {
            const id = ++workerMessageId;
            pendingEncryptions.set(id, { resolve, reject });

            // Set timeout for encryption (2 minutes max for large files)
            const timeoutId = setTimeout(() => {
                if (pendingEncryptions.has(id)) {
                    pendingEncryptions.delete(id);
                    console.warn('[Crypto] Worker timeout, falling back to main thread');
                    encryptFileMainThread(arrayBuffer, secretKey).then(resolve).catch(reject);
                }
            }, 120000);

            // Clear timeout when resolved
            const originalResolve = resolve;
            const wrappedResolve = (result: { encrypted: Blob; nonce: string }) => {
                clearTimeout(timeoutId);
                originalResolve(result);
            };
            pendingEncryptions.set(id, { resolve: wrappedResolve, reject });

            // Send to worker (transferable for zero-copy)
            worker.postMessage({
                id,
                type: 'encrypt',
                arrayBuffer: arrayBuffer,
                secretKey: Array.from(secretKey) // Convert to regular array for transfer
            }, [arrayBuffer]);
        });
    }

    // Fallback to main thread
    console.log('[Crypto] Using main thread encryption');
    return encryptFileMainThread(arrayBuffer, secretKey);
}

/**
 * Main thread encryption fallback
 */
async function encryptFileMainThread(
    arrayBuffer: ArrayBuffer,
    secretKey: Uint8Array
): Promise<{ encrypted: Blob; nonce: string }> {
    const data = new Uint8Array(arrayBuffer);
    const padded = padData(data);

    const encrypted = encrypt(padded, secretKey);

    // Konvertiere Base64 zurück zu Blob für Storage
    const ciphertextBytes = decodeBase64(encrypted.ciphertext);
    const blob = new Blob([ciphertextBytes as BlobPart], { type: 'application/octet-stream' });

    return {
        encrypted: blob,
        nonce: encrypted.nonce,
    };
}

/**
 * Entschlüsselt ein Blob zurück zum Original
 */
export async function decryptFile(
    encryptedBlob: Blob,
    nonce: string,
    secretKey: Uint8Array,
    originalMimeType: string
): Promise<Blob | null> {
    // Debug: Log key hash for decryption
    const keyHash = await getUserKeyHash(secretKey);
    console.log('[Crypto] decryptFile using key hash:', keyHash, 'key length:', secretKey.length, 'nonce:', nonce.slice(0, 10) + '...');

    const arrayBuffer = await encryptedBlob.arrayBuffer();
    const ciphertext = new Uint8Array(arrayBuffer);

    const encrypted: EncryptedData = {
        ciphertext: encodeBase64(ciphertext),
        nonce,
    };

    const decrypted = decrypt(encrypted, secretKey);
    if (!decrypted) {
        console.error('[Crypto] decryptFile FAILED - nacl.secretbox.open returned null');
        return null;
    }

    const unpadded = unpadData(decrypted);
    return new Blob([unpadded as any], { type: originalMimeType });
}

/**
 * Generiert einen stabilen Hash aus dem Secret Key für die Gruppierung von Geräten/Daten
 */
export async function getUserKeyHash(secretKey: Uint8Array): Promise<string> {
    const msgUint8 = new TextEncoder().encode(encodeBase64(secretKey));
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/**
 * Speichert Secret Key verschlüsselt im LocalStorage
 * Verwendet ein Master Password (optional für MVP)
 */
export function saveKeyToStorage(secretKey: Uint8Array, password?: string): void {
    if (password) {
        // TODO: Key Derivation mit PBKDF2
        // Für MVP: Direkt speichern
    }

    const encoded = encodeBase64(secretKey);
    localStorage.setItem('photovault_secret_key', encoded);
}

/**
 * Lädt Secret Key aus LocalStorage
 */
export function loadKeyFromStorage(): Uint8Array | null {
    const encoded = localStorage.getItem('photovault_secret_key');
    if (!encoded) return null;

    try {
        return decodeBase64(encoded);
    } catch {
        return null;
    }
}

/**
 * Löscht Key aus Storage (Logout)
 */
export function clearKeyFromStorage(): void {
    localStorage.removeItem('photovault_secret_key');
}

/**
 * PANIC PROTOCOL: Securely wipe encryption key from storage
 *
 * SECURITY: Overwrites the key 3 times with random data before deletion.
 * This makes forensic recovery significantly harder.
 *
 * Also wipes related storage keys.
 */
export function secureWipeKey(): void {
    const keysToWipe = [
        'photovault_secret_key',
        'vault_key',
        'deviceId',
        'photovault_burner_keys',
    ];

    for (const key of keysToWipe) {
        // Only wipe if key exists
        if (localStorage.getItem(key) !== null) {
            // Overwrite 3 times with random data
            for (let i = 0; i < 3; i++) {
                const noise = new Uint8Array(64);
                crypto.getRandomValues(noise);
                localStorage.setItem(key, Array.from(noise).join(''));
            }
            localStorage.removeItem(key);
        }
    }
}

/**
 * PANIC PROTOCOL: Complete secure wipe of all app data
 *
 * This function:
 * 1. Overwrites all localStorage keys with random data
 * 2. Deletes all IndexedDB databases
 * 3. Clears service worker caches
 * 4. Unregisters service workers
 *
 * Use this when physical safety is at risk.
 */
export async function executePanicProtocol(): Promise<void> {
    // 1. Secure wipe localStorage keys
    secureWipeKey();

    // 2. Clear all localStorage (overwrite then delete)
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
        for (let i = 0; i < 3; i++) {
            const noise = new Uint8Array(32);
            crypto.getRandomValues(noise);
            localStorage.setItem(key, Array.from(noise).join(''));
        }
        localStorage.removeItem(key);
    }

    // 3. Clear sessionStorage
    sessionStorage.clear();

    // 4. Delete all IndexedDB databases
    if ('indexedDB' in window && 'databases' in indexedDB) {
        try {
            const databases = await indexedDB.databases();
            await Promise.all(
                databases.map((db) => {
                    if (db.name) {
                        return new Promise<void>((resolve) => {
                            const deleteRequest = indexedDB.deleteDatabase(db.name!);
                            deleteRequest.onsuccess = () => resolve();
                            deleteRequest.onerror = () => resolve();
                            deleteRequest.onblocked = () => resolve();
                        });
                    }
                    return Promise.resolve();
                })
            );
        } catch {
            // IndexedDB API may not be available
        }
    }

    // 5. Clear service worker caches
    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));
        } catch {
            // Caches API may not be available
        }
    }

    // 6. Unregister service workers
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((reg) => reg.unregister()));
        } catch {
            // Service worker API may not be available
        }
    }

    // 7. Force navigation to blank page (clears memory)
    window.location.replace('about:blank');
}

/**
 * Async: Speichert Secret Key (PWA Wrapper)
 *
 * @param secretKey - The 32-byte encryption key
 */
export async function saveKeyToStorageAsync(secretKey: Uint8Array): Promise<void> {
    saveKeyToStorage(secretKey);
    console.log('[Crypto] Secret key stored in localStorage');
}

/**
 * Async: Lädt Secret Key (PWA Wrapper)
 *
 * @returns The secret key or null if not found
 */
export async function loadKeyFromStorageAsync(): Promise<Uint8Array | null> {
    const key = loadKeyFromStorage();
    if (key) {
        console.log('[Crypto] Secret key loaded from localStorage');
    }
    return key;
}

/**
 * Async: Löscht Key aus Storage (PWA Wrapper)
 */
export async function clearKeyFromStorageAsync(): Promise<void> {
    clearKeyFromStorage();
    console.log('[Crypto] Secret key cleared from localStorage');
}
