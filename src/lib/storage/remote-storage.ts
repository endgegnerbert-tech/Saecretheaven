
import { uploadPhotoBlob, downloadPhotoBlob } from '@/lib/supabase';

export interface RemoteStorageProvider {
    upload: (path: string, blob: Blob) => Promise<string>;
    download: (path: string) => Promise<Blob>;
}

// Current Provider: Supabase Storage
// Future: IPFS / Web3.Storage
export const remoteStorage: RemoteStorageProvider = {
    upload: async (path: string, blob: Blob) => {
        try {
            return await uploadPhotoBlob(path, blob);
        } catch (error) {
            console.error('Remote Storage Upload failed:', error);
            throw error;
        }
    },
    download: async (path: string) => {
        try {
            return await downloadPhotoBlob(path);
        } catch (error) {
            console.error('Remote Storage Download failed:', error);
            throw error;
        }
    }
};
