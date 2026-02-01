/**
 * IPFS Layer - Hybrid Storage (Contabo Primary + Pinata Fallback)
 * All encrypted blobs are stored on IPFS with CIDs
 * 
 * Upload Strategy: Contabo first → Pinata fallback
 * Download Strategy: Contabo → Pinata → Cloudflare
 */

import {
    uploadToSelfHosted,
    downloadFromSelfHosted,
    isSelfHostedConfigured,
    getSelfHostedGatewayUrl,
} from './ipfs-selfhosted';

// Pinata Configuration (Fallback)
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud';
const PINATA_GATEWAY_TOKEN = process.env.NEXT_PUBLIC_PINATA_GATEWAY_TOKEN || '';

// API Endpoints
const PINATA_PIN_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_UNPIN_URL = 'https://api.pinata.cloud/pinning/unpin';

/**
 * Helper: Get the full gateway base URL
 */
function getGatewayBase(): string {
    if (PINATA_GATEWAY.startsWith('http')) return PINATA_GATEWAY;

    // If it's just a subdomain or already includes mypinata.cloud but lacks protocol
    if (PINATA_GATEWAY.includes('.')) {
        return `https://${PINATA_GATEWAY}`;
    }

    // Default to mypinata.cloud for simple subdomain strings
    return `https://${PINATA_GATEWAY}.mypinata.cloud`;
}

/**
 * Upload to IPFS using hybrid strategy:
 * 1. Try Contabo (self-hosted) first - cheaper, EU-based
 * 2. Fall back to Pinata if Contabo fails
 * Returns the CID (Content Identifier) that uniquely identifies this blob
 */
export async function uploadToIPFS(
    blob: Blob,
    fileName?: string,
    onProgress?: (progress: number) => void
): Promise<string> {
    // Strategy 1: Try Contabo (self-hosted) first
    if (isSelfHostedConfigured()) {
        try {
            console.log('[IPFS] Trying Contabo (primary)...');
            const cid = await uploadToSelfHosted(blob, fileName, onProgress);
            console.log('[IPFS] Contabo upload success:', cid);
            return cid;
        } catch (error) {
            console.warn('[IPFS] Contabo failed, falling back to Pinata:', error);
        }
    }

    // Strategy 2: Fall back to Pinata
    if (!PINATA_JWT) {
        console.warn('Neither Contabo nor Pinata configured - using local mock CID');
        const mockCid = `Qm${generateMockHash()}`;
        return mockCid;
    }

    console.log('[IPFS] Starting upload to Pinata...', { blobSize: blob.size, fileName });

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', PINATA_PIN_URL);
        xhr.setRequestHeader('Authorization', `Bearer ${PINATA_JWT}`);

        // Timeout: 2 minutes for large files on mobile
        xhr.timeout = 120000;

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                console.log(`[IPFS] Upload progress: ${percentComplete}%`);
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            console.log('[IPFS] XHR onload, status:', xhr.status);
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const result = JSON.parse(xhr.responseText);
                    console.log('[IPFS] Upload success, CID:', result.IpfsHash);
                    resolve(result.IpfsHash);
                } catch (e) {
                    console.error('[IPFS] Failed to parse response:', xhr.responseText);
                    reject(new Error('Failed to parse Pinata response'));
                }
            } else {
                console.error('[IPFS] Upload failed:', { status: xhr.status, response: xhr.responseText });
                reject(new Error(`IPFS upload failed: ${xhr.status} - ${xhr.responseText}`));
            }
        };

        xhr.onerror = (event) => {
            console.error('[IPFS] XHR network error:', event);
            reject(new Error('Network error during IPFS upload - check connection'));
        };

        xhr.ontimeout = () => {
            console.error('[IPFS] Upload timeout (2 min)');
            reject(new Error('IPFS upload timeout - file too large or slow connection'));
        };

        const formData = new FormData();
        formData.append('file', blob, fileName || 'encrypted-photo.bin');

        // SECURITY: Do not include specific app/type metadata to prevent indexing
        // by the storage provider or "Eye in the Sky" adversaries.
        const metadata = JSON.stringify({
            name: 'blob',
            keyvalues: { type: 'blob' }
        });
        formData.append('pinataMetadata', metadata);

        const options = JSON.stringify({ cidVersion: 1 });
        formData.append('pinataOptions', options);

        console.log('[IPFS] Sending XHR...');
        xhr.send(formData);
    });
}

/**
 * Download content from IPFS
 * Uses API proxy to avoid CORS issues on production
 * Falls back to direct gateway access for development
 */
export async function downloadFromIPFS(cid: string): Promise<Blob> {
    console.log(`[IPFS] Downloading CID: ${cid}`);

    // Primary: Use API proxy (avoids all CORS issues)
    try {
        console.log(`[IPFS] Trying API proxy...`);
        const response = await fetch(`/api/ipfs/download?cid=${encodeURIComponent(cid)}`);

        if (response.ok) {
            const blob = await response.blob();
            console.log(`[IPFS] API proxy succeeded, size: ${blob.size} bytes`);
            return blob;
        }

        console.warn(`[IPFS] API proxy failed: ${response.status}`);
    } catch (err) {
        console.warn(`[IPFS] API proxy error:`, err);
    }

    // Fallback: Direct gateway access with multi-gateway strategy
    // Order: Contabo (self-hosted) -> Pinata -> Cloudflare
    const gatewayBase = getGatewayBase();
    const gateways = [
        // Gateway 1: Self-hosted Contabo (fastest for our content)
        () => getSelfHostedGatewayUrl(cid),
        // Gateway 2: Pinata (fallback for old content)
        () => {
            const url = new URL(`${gatewayBase}/ipfs/${cid}`);
            if (PINATA_GATEWAY_TOKEN) url.searchParams.set('pinataGatewayToken', PINATA_GATEWAY_TOKEN);
            return url.toString();
        },
        // Gateway 3: Cloudflare public gateway (last resort)
        () => `https://cloudflare-ipfs.com/ipfs/${cid}`,
    ];

    const controller = new AbortController();

    try {
        const fetchPromises = gateways.map(async (getUrl, index) => {
            const url = getUrl();
            console.log(`[IPFS] Trying gateway ${index + 1}: ${url.substring(0, 60)}...`);

            const response = await fetch(url, {
                signal: controller.signal,
                mode: 'cors',
                credentials: 'omit',
            });

            if (!response.ok) {
                throw new Error(`Gateway failed: ${response.status}`);
            }

            console.log(`[IPFS] Gateway ${index + 1} succeeded`);
            return response.blob();
        });

        const winningBlob = await Promise.any(fetchPromises);
        controller.abort();

        console.log(`[IPFS] Download complete, size: ${winningBlob.size} bytes`);
        return winningBlob;
    } catch (error) {
        controller.abort();
        console.error('[IPFS] All methods failed:', error);
        throw new Error(`IPFS download failed for CID: ${cid}. Check network/CORS.`);
    }
}

/**
 * Unpin content from Pinata (optional cleanup)
 */
export async function unpinFromIPFS(cid: string): Promise<void> {
    if (!PINATA_JWT) {
        console.warn('PINATA_JWT not configured - skipping unpin');
        return;
    }

    const response = await fetch(`${PINATA_UNPIN_URL}/${cid}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${PINATA_JWT}`,
        },
    });

    if (!response.ok) {
        console.error('Pinata unpin failed:', await response.text());
        // Don't throw - unpin failure is not critical
    }
}

/**
 * Check if a CID exists on IPFS (via gateway)
 */
export async function cidExistsOnIPFS(cid: string): Promise<boolean> {
    try {
        const gatewayBase = getGatewayBase();
        const url = new URL(`${gatewayBase}/ipfs/${cid}`);
        if (PINATA_GATEWAY_TOKEN) {
            url.searchParams.set('pinataGatewayToken', PINATA_GATEWAY_TOKEN);
        }

        const response = await fetch(url.toString(), {
            method: 'HEAD',
            headers: PINATA_GATEWAY_TOKEN ? {
                'x-pinata-gateway-token': PINATA_GATEWAY_TOKEN,
            } : {},
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get the gateway URL for a CID (for direct browser access)
 */
export function getIPFSGatewayUrl(cid: string): string {
    const gatewayBase = getGatewayBase();
    const url = new URL(`${gatewayBase}/ipfs/${cid}`);
    if (PINATA_GATEWAY_TOKEN) {
        url.searchParams.set('pinataGatewayToken', PINATA_GATEWAY_TOKEN);
    }
    return url.toString();
}

/**
 * Validate if a string looks like a valid IPFS CID
 */
export function isValidCID(cid: string): boolean {
    // CIDv0 starts with Qm and is 46 chars
    // CIDv1 starts with bafy and varies in length
    return (
        (cid.startsWith('Qm') && cid.length === 46) ||
        cid.startsWith('bafy') ||
        cid.startsWith('bafk')
    );
}

/**
 * Generate a mock hash for development without Pinata
 */
function generateMockHash(): string {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let hash = '';
    for (let i = 0; i < 44; i++) {
        hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
}

/**
 * Check if IPFS/Pinata is configured
 */
export function isIPFSConfigured(): boolean {
    return !!PINATA_JWT && PINATA_JWT.length > 0;
}
