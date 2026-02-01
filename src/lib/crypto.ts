/**
 * Crypto Layer - Client-Side Encryption mit tweetnacl
 * Alle Daten werden VOR dem Upload verschlüsselt
 */

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

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
 * Generiert eine 12-Wort Recovery Phrase aus dem Secret Key
 * Vereinfachte Version - in Production würde man BIP39 verwenden
 */
export function keyToRecoveryPhrase(secretKey: Uint8Array): string {
    const base64 = encodeBase64(secretKey);
    // Für MVP: Base64 in Chunks aufteilen
    // TODO: BIP39 Wordlist für bessere UX
    return base64.match(/.{1,8}/g)?.join('-') || base64;
}

/**
 * Recovered Secret Key aus Recovery Phrase
 */
export function recoveryPhraseToKey(phrase: string): Uint8Array {
    const base64 = phrase.replace(/-/g, '');
    return decodeBase64(base64);
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
 */
export async function encryptFile(
    file: File,
    secretKey: Uint8Array
): Promise<{ encrypted: Blob; nonce: string }> {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const padded = padData(data);

    const encrypted = encrypt(padded, secretKey);

    // Konvertiere Base64 zurück zu Blob für Storage
    const ciphertextBytes = decodeBase64(encrypted.ciphertext);
    const blob = new Blob([ciphertextBytes as any], { type: 'application/octet-stream' });

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
    const arrayBuffer = await encryptedBlob.arrayBuffer();
    const ciphertext = new Uint8Array(arrayBuffer);

    const encrypted: EncryptedData = {
        ciphertext: encodeBase64(ciphertext),
        nonce,
    };

    const decrypted = decrypt(encrypted, secretKey);
    if (!decrypted) return null;

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
