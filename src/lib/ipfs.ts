/**
 * IPFS Layer - Content-Addressed Storage with Pinata Remote Pinning
 * All encrypted blobs are stored on IPFS with CIDs
 */

// Pinata Configuration
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
 * Generate a real IPFS CID by uploading to Pinata
 * Returns the CID (Content Identifier) that uniquely identifies this blob
 */
export async function uploadToIPFS(
    blob: Blob,
    fileName?: string,
    onProgress?: (progress: number) => void
): Promise<string> {
    if (!PINATA_JWT) {
        console.warn('PINATA_JWT not configured - using local mock CID');
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

        const metadata = JSON.stringify({
            name: fileName || 'photovault-encrypted',
            keyvalues: { app: 'photovault', type: 'encrypted-photo' }
        });
        formData.append('pinataMetadata', metadata);

        const options = JSON.stringify({ cidVersion: 1 });
        formData.append('pinataOptions', options);

        console.log('[IPFS] Sending XHR...');
        xhr.send(formData);
    });
}

/**
 * Download content from IPFS via dedicated gateway (mobile-safe)
 * Uses only CORS-safe gateways to avoid redirect issues on iOS Safari
 */
export async function downloadFromIPFS(cid: string): Promise<Blob> {
    const gatewayBase = getGatewayBase();

    // Mobile-safe gateways only - no redirecting public gateways
    // gateway.ipfs.io and dweb.link cause CORS issues on iOS Safari due to redirects
    const gateways = [
        // Primary: Dedicated Pinata gateway (fastest, no redirects)
        () => {
            const url = new URL(`${gatewayBase}/ipfs/${cid}`);
            if (PINATA_GATEWAY_TOKEN) url.searchParams.set('pinataGatewayToken', PINATA_GATEWAY_TOKEN);
            return url.toString();
        },
        // Fallback: Cloudflare IPFS (reliable, no CORS redirects)
        () => `https://cloudflare-ipfs.com/ipfs/${cid}`,
    ];

    // Create a controller to abort all other requests once one succeeds
    const controller = new AbortController();

    try {
        console.log(`[IPFS] Downloading CID: ${cid}`);

        const fetchPromises = gateways.map(async (getUrl, index) => {
            const url = getUrl();
            console.log(`[IPFS] Trying gateway ${index + 1}: ${url.substring(0, 60)}...`);

            const response = await fetch(url, {
                signal: controller.signal,
                mode: 'cors',
                credentials: 'omit',
                // Prevent following redirects to avoid CORS issues on mobile
                redirect: 'error'
            });

            if (!response.ok) {
                console.warn(`[IPFS] Gateway ${index + 1} failed with status: ${response.status}`);
                throw new Error(`Gateway failed: ${response.status}`);
            }

            console.log(`[IPFS] Gateway ${index + 1} succeeded`);
            return response.blob();
        });

        // Race the fetches - the first successful one wins
        const winningBlob = await Promise.any(fetchPromises);

        // Abort all other pending requests
        controller.abort();

        console.log(`[IPFS] Download complete, size: ${winningBlob.size} bytes`);
        return winningBlob;
    } catch (error) {
        controller.abort();
        console.error('[IPFS] All gateways failed:', error);
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
