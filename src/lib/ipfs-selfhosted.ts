/**
 * Self-Hosted IPFS Layer - Contabo VPS
 * Primary storage for encrypted photo blobs
 */

// Self-hosted IPFS Configuration
const IPFS_API_URL = process.env.NEXT_PUBLIC_IPFS_API_URL || 'https://ipfs.saecretheaven.com/api/v0';
const IPFS_GATEWAY_URL = process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || 'https://ipfs.saecretheaven.com';
const IPFS_API_USERNAME = process.env.IPFS_API_USERNAME || 'admin';
const IPFS_API_PASSWORD = process.env.IPFS_API_PASSWORD || '';

/**
 * Get Basic Auth header for API access
 */
function getAuthHeader(): string {
    const credentials = btoa(`${IPFS_API_USERNAME}:${IPFS_API_PASSWORD}`);
    return `Basic ${credentials}`;
}

/**
 * Check if self-hosted IPFS is configured
 */
export function isSelfHostedConfigured(): boolean {
    return !!IPFS_API_PASSWORD && IPFS_API_PASSWORD.length > 0;
}

/**
 * Upload blob to self-hosted IPFS node
 * Returns the CID (Content Identifier)
 */
export async function uploadToSelfHosted(
    blob: Blob,
    fileName?: string,
    onProgress?: (progress: number) => void
): Promise<string> {
    if (!isSelfHostedConfigured()) {
        throw new Error('Self-hosted IPFS not configured - missing credentials');
    }

    console.log('[IPFS-SelfHosted] Starting upload...', { blobSize: blob.size, fileName });

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${IPFS_API_URL}/add?cid-version=1`);
        xhr.setRequestHeader('Authorization', getAuthHeader());

        // Timeout: 2 minutes for large files
        xhr.timeout = 120000;

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                console.log(`[IPFS-SelfHosted] Upload progress: ${percentComplete}%`);
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            console.log('[IPFS-SelfHosted] XHR onload, status:', xhr.status);
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    // IPFS API returns newline-delimited JSON, take the last non-empty line
                    const lines = xhr.responseText.trim().split('\n');
                    const lastLine = lines[lines.length - 1];
                    const result = JSON.parse(lastLine);

                    if (result.Hash) {
                        console.log('[IPFS-SelfHosted] Upload success, CID:', result.Hash);
                        resolve(result.Hash);
                    } else {
                        reject(new Error('No Hash in IPFS response'));
                    }
                } catch (e) {
                    console.error('[IPFS-SelfHosted] Failed to parse response:', xhr.responseText);
                    reject(new Error('Failed to parse IPFS response'));
                }
            } else if (xhr.status === 401) {
                console.error('[IPFS-SelfHosted] Authentication failed');
                reject(new Error('IPFS authentication failed - check credentials'));
            } else {
                console.error('[IPFS-SelfHosted] Upload failed:', { status: xhr.status, response: xhr.responseText });
                reject(new Error(`IPFS upload failed: ${xhr.status}`));
            }
        };

        xhr.onerror = (event) => {
            console.error('[IPFS-SelfHosted] XHR network error:', event);
            reject(new Error('Network error during IPFS upload'));
        };

        xhr.ontimeout = () => {
            console.error('[IPFS-SelfHosted] Upload timeout');
            reject(new Error('IPFS upload timeout'));
        };

        const formData = new FormData();
        formData.append('file', blob, fileName || 'encrypted-photo.bin');

        console.log('[IPFS-SelfHosted] Sending request...');
        xhr.send(formData);
    });
}

/**
 * Download content from self-hosted IPFS gateway
 */
export async function downloadFromSelfHosted(cid: string): Promise<Blob> {
    console.log(`[IPFS-SelfHosted] Downloading CID: ${cid}`);

    const url = `${IPFS_GATEWAY_URL}/ipfs/${cid}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': '*/*',
        },
    });

    if (!response.ok) {
        throw new Error(`Self-hosted gateway failed: ${response.status}`);
    }

    const blob = await response.blob();
    console.log(`[IPFS-SelfHosted] Download success, size: ${blob.size} bytes`);
    return blob;
}

/**
 * Check if content exists on self-hosted gateway
 */
export async function existsOnSelfHosted(cid: string): Promise<boolean> {
    try {
        const url = `${IPFS_GATEWAY_URL}/ipfs/${cid}`;
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get the gateway URL for a CID
 */
export function getSelfHostedGatewayUrl(cid: string): string {
    return `${IPFS_GATEWAY_URL}/ipfs/${cid}`;
}
