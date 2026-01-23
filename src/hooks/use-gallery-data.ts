/**
 * useGalleryData Hook - Local Photo Gallery Management with IPFS Cloud Sync
 * Photos are encrypted client-side and stored on IPFS
 * Only metadata (CID, nonce, etc.) is stored in Supabase
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAllPhotos,
    savePhoto,
    deletePhoto,
    getPhotoCount,
    type PhotoMetadata,
} from '@/lib/storage/local-db';
import { encryptFile, decryptFile, getUserKeyHash } from '@/lib/crypto';
import { uploadCIDMetadata } from '@/lib/supabase';
import { remoteStorage } from '@/lib/storage/remote-storage';
import { getDeviceId } from '@/lib/deviceId';

export function useGalleryData(secretKey: Uint8Array | null) {
    const queryClient = useQueryClient();
    const [userKeyHash, setUserKeyHash] = useState<string | null>(null);

    // Generate Key Hash when secretKey changes
    useEffect(() => {
        if (secretKey) {
            getUserKeyHash(secretKey).then(setUserKeyHash);
        } else {
            setUserKeyHash(null);
        }
    }, [secretKey]);

    // Query: Load all photos from local IndexedDB
    const {
        data: photos = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ['photos'],
        queryFn: getAllPhotos,
        enabled: !!secretKey,
    });

    // Query: Photo count
    const { data: photoCount = 0 } = useQuery({
        queryKey: ['photoCount'],
        queryFn: getPhotoCount,
    });

    // Mutation: Upload photo (encrypt -> IPFS -> Supabase metadata)
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!secretKey) throw new Error('No encryption key');

            // Step 1: Encrypt file client-side
            const { encrypted, nonce } = await encryptFile(file, secretKey);
            console.log('File encrypted:', { size: encrypted.size, nonce: nonce.slice(0, 8) + '...' });

            // Step 2: Upload encrypted blob to IPFS -> returns real CID
            let cid: string;
            try {
                cid = await remoteStorage.upload(encrypted, file.name);
                console.log('Uploaded to IPFS with CID:', cid);
            } catch (error) {
                console.error('IPFS upload failed:', error);
                // Generate fallback local CID for offline-first
                cid = `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                console.log('Using local fallback CID:', cid);
            }

            // Step 3: Save to local IndexedDB (for immediate access)
            const metadata: Omit<PhotoMetadata, 'id'> = {
                cid,
                nonce,
                fileName: file.name,
                mimeType: file.type,
                fileSize: file.size,
                uploadedAt: new Date(),
                encryptedBlob: encrypted, // Keep locally for fast access
            };
            await savePhoto(metadata);
            console.log('Saved to local IndexedDB');

            // Step 4: Sync metadata to Supabase (CID only, no blob)
            const deviceId = getDeviceId();
            try {
                await uploadCIDMetadata(
                    cid,
                    file.size,
                    deviceId,
                    nonce,
                    file.type,
                    userKeyHash || undefined
                );
                console.log('Metadata synced to Supabase:', cid);
            } catch (error) {
                console.error('Supabase metadata sync failed (photo saved locally & on IPFS):', error);
                // Don't throw - local + IPFS save succeeded
            }

            return metadata;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['photos'] });
            queryClient.invalidateQueries({ queryKey: ['photoCount'] });
        },
    });

    // Mutation: Delete photo
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await deletePhoto(id);
            // Note: IPFS content is immutable - we just remove our reference
            // In production, you might want to unpin from Pinata
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['photos'] });
            queryClient.invalidateQueries({ queryKey: ['photoCount'] });
        },
    });

    // Decrypt photo for display
    const decryptPhoto = useCallback(
        async (photo: PhotoMetadata): Promise<string | null> => {
            if (!secretKey || !photo.encryptedBlob) return null;

            const decrypted = await decryptFile(
                photo.encryptedBlob,
                photo.nonce,
                secretKey,
                photo.mimeType
            );

            if (!decrypted) return null;

            return URL.createObjectURL(decrypted);
        },
        [secretKey]
    );

    return {
        photos,
        photoCount,
        isLoading,
        error,
        uploadPhoto: uploadMutation.mutate,
        deletePhoto: deleteMutation.mutate,
        decryptPhoto,
        isUploading: uploadMutation.isPending,
        userKeyHash
    };
}
