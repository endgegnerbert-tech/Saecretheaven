/**
 * Remote Storage Layer - IPFS with Pinata Remote Pinning
 * Encrypted blobs are stored on IPFS, identified by CID
 */

import { uploadToIPFS, downloadFromIPFS, isIPFSConfigured } from '@/lib/ipfs';

export interface RemoteStorageProvider {
    /**
     * Upload encrypted blob to IPFS
     * @param blob - The encrypted blob to upload
     * @param fileName - Optional filename for metadata
     * @returns The IPFS CID (Content Identifier)
     */
    upload: (blob: Blob, fileName?: string) => Promise<string>;

    /**
     * Download encrypted blob from IPFS by CID
     * @param cid - The IPFS Content Identifier
     * @returns The encrypted blob
     */
    download: (cid: string) => Promise<Blob>;

    /**
     * Check if remote storage is configured
     */
    isConfigured: () => boolean;
}

/**
 * IPFS Remote Storage Provider
 * Uses Pinata for pinning and dedicated gateway for downloads
 */
export const remoteStorage: RemoteStorageProvider = {
    upload: async (blob: Blob, fileName?: string) => {
        try {
            console.log('Uploading to IPFS...', { size: blob.size, fileName });
            const cid = await uploadToIPFS(blob, fileName);
            console.log('IPFS upload successful:', cid);
            return cid;
        } catch (error) {
            console.error('Remote Storage Upload failed:', error);
            throw error;
        }
    },

    download: async (cid: string) => {
        try {
            console.log('Downloading from IPFS:', cid);
            const blob = await downloadFromIPFS(cid);
            console.log('IPFS download successful:', { cid, size: blob.size });
            return blob;
        } catch (error) {
            console.error('Remote Storage Download failed:', error);
            throw error;
        }
    },

    isConfigured: () => {
        return isIPFSConfigured();
    }
};

/**
 * Helper: Check if a CID looks like a real IPFS CID or a mock/legacy CID
 */
export function isRealIPFSCID(cid: string): boolean {
    // Real IPFS CIDs start with Qm (v0) or bafy/bafk (v1)
    return cid.startsWith('Qm') || cid.startsWith('bafy') || cid.startsWith('bafk');
}

/**
 * Helper: Check if a CID is a legacy local-only CID (cid_timestamp_random)
 */
export function isLegacyLocalCID(cid: string): boolean {
    return cid.startsWith('cid_');
}
