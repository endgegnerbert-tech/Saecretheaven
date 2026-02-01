/**
 * Crypto Web Worker - Offloads encryption to background thread
 * Prevents UI blocking during photo encryption (especially on mobile devices)
 *
 * SECURITY: Libraries loaded locally from /js/ to avoid CDN metadata leakage
 *
 * Phase 2: Performance Optimization
 */

// Load tweetnacl libraries locally (no external CDN for privacy)
importScripts('/js/nacl.min.js', '/js/nacl-util.min.js');

// nacl is now available as self.nacl
const nacl = self.nacl;
const naclUtil = self.nacl.util;

// Magic Header: "PAD1" (0x50 0x41 0x44 0x31) to identify padded files
const MAGIC_HEADER = new Uint8Array([0x50, 0x41, 0x44, 0x31]);
const BLOCK_SIZE = 64 * 1024; // 64KB

/**
 * Pad data to ISO 7816-4 (0x80 ... 0x00) and align to 64KB blocks
 * Duplicated from crypto.ts since workers can't import TypeScript modules
 */
function padData(data) {
    // Prepend Magic Header
    const content = new Uint8Array(MAGIC_HEADER.length + data.length);
    content.set(MAGIC_HEADER);
    content.set(data, MAGIC_HEADER.length);

    // Calculate padded size
    const targetSize = Math.ceil((content.length + 1) / BLOCK_SIZE) * BLOCK_SIZE;

    const padded = new Uint8Array(targetSize);
    padded.set(content);
    padded[content.length] = 0x80; // Mark start of padding
    // Remaining bytes are 0x00 by default
    return padded;
}

/**
 * Encrypt data with tweetnacl secretbox
 */
function encrypt(data, secretKey) {
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

    // Debug: Log encryption parameters (compare with main thread decrypt)
    console.log('[Crypto Worker] encrypt params:', {
        keyLength: secretKey.length,
        keyFirst4: Array.from(secretKey.slice(0, 4)),
        nonceLength: nonce.length,
        dataLength: data.length,
    });

    const ciphertext = nacl.secretbox(data, nonce, secretKey);

    return {
        ciphertext: ciphertext,
        nonce: naclUtil.encodeBase64(nonce)
    };
}

/**
 * Handle encryption requests from main thread
 */
self.onmessage = async function(e) {
    const { id, type, arrayBuffer, secretKey } = e.data;

    if (type !== 'encrypt') {
        self.postMessage({
            id,
            success: false,
            error: 'Unknown message type: ' + type
        });
        return;
    }

    try {
        console.log('[Crypto Worker] Starting encryption, size:', arrayBuffer.byteLength);
        const startTime = performance.now();

        // Convert ArrayBuffer to Uint8Array
        const data = new Uint8Array(arrayBuffer);

        // Pad data (masks file size for traffic analysis protection)
        const padded = padData(data);
        console.log('[Crypto Worker] Padded size:', padded.length);

        // Encrypt
        const { ciphertext, nonce } = encrypt(padded, new Uint8Array(secretKey));

        const endTime = performance.now();
        console.log('[Crypto Worker] Encryption complete in', Math.round(endTime - startTime), 'ms');

        // Transfer the ciphertext back (transferable for zero-copy)
        self.postMessage({
            id,
            success: true,
            ciphertext: ciphertext.buffer,
            nonce: nonce
        }, [ciphertext.buffer]);

    } catch (error) {
        console.error('[Crypto Worker] Encryption failed:', error);
        self.postMessage({
            id,
            success: false,
            error: error.message || 'Encryption failed'
        });
    }
};

console.log('[Crypto Worker] Worker initialized with local tweetnacl');
