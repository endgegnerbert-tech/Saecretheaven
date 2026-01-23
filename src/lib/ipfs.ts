/**
 * IPFS Layer - Content-Addressed Storage with Pinata Remote Pinning
 * All encrypted blobs are stored on IPFS with CIDs
 */

// Pinata Configuration
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud';

// API Endpoints
const PINATA_PIN_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_UNPIN_URL = 'https://api.pinata.cloud/pinning/unpin';

/**
 * Generate a real IPFS CID by uploading to Pinata
 * Returns the CID (Content Identifier) that uniquely identifies this blob
 */
export async function uploadToIPFS(blob: Blob, fileName?: string): Promise<string> {
    if (!PINATA_JWT) {
        console.warn('PINATA_JWT not configured - using local mock CID');
        // Generate a mock CID for development without Pinata
        const mockCid = `Qm${generateMockHash()}`;
        return mockCid;
    }

    const formData = new FormData();
    formData.append('file', blob, fileName || 'encrypted-photo.bin');

    // Optional: Add metadata for better organization
    const metadata = JSON.stringify({
        name: fileName || 'photovault-encrypted',
        keyvalues: {
            app: 'photovault',
            type: 'encrypted-photo',
        }
    });
    formData.append('pinataMetadata', metadata);

    // Pin options for better performance
    const options = JSON.stringify({
        cidVersion: 1,
    });
    formData.append('pinataOptions', options);

    const response = await fetch(PINATA_PIN_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${PINATA_JWT}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Pinata upload failed:', error);
        throw new Error(`IPFS upload failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('IPFS upload successful:', result.IpfsHash);

    return result.IpfsHash; // This is the CID
}

/**
 * Download content from IPFS via Pinata Gateway
 * Uses dedicated gateway for better performance
 */
export async function downloadFromIPFS(cid: string): Promise<Blob> {
    // Try Pinata dedicated gateway first for speed
    const gatewayUrl = `${PINATA_GATEWAY}/ipfs/${cid}`;

    const response = await fetch(gatewayUrl, {
        method: 'GET',
        headers: PINATA_JWT ? {
            'x-pinata-gateway-token': PINATA_JWT,
        } : {},
    });

    if (!response.ok) {
        // Fallback to public IPFS gateway
        const publicGateway = `https://ipfs.io/ipfs/${cid}`;
        const fallbackResponse = await fetch(publicGateway);

        if (!fallbackResponse.ok) {
            throw new Error(`IPFS download failed: ${response.status}`);
        }

        return await fallbackResponse.blob();
    }

    return await response.blob();
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
        const gatewayUrl = `${PINATA_GATEWAY}/ipfs/${cid}`;
        const response = await fetch(gatewayUrl, {
            method: 'HEAD',
            headers: PINATA_JWT ? {
                'x-pinata-gateway-token': PINATA_JWT,
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
    return `${PINATA_GATEWAY}/ipfs/${cid}`;
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
