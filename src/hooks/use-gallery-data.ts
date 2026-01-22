/**
 * useGalleryData Hook - Local Photo Gallery Management with Cloud Sync
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
import { encryptFile, decryptFile } from '@/lib/crypto';
import { uploadCIDMetadata, cidExistsInSupabase } from '@/lib/supabase';
import { getDeviceId } from '@/lib/deviceId';

export function useGalleryData(secretKey: Uint8Array | null) {
    const queryClient = useQueryClient();

    // Query: Load all photos
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

    // Mutation: Upload photo
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!secretKey) throw new Error('No encryption key');

            // Encrypt file
            const { encrypted, nonce } = await encryptFile(file, secretKey);

            // Generate CID (simplified - in production use IPFS)
            const cid = `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;

            // Save metadata locally
            const metadata: Omit<PhotoMetadata, 'id'> = {
                cid,
                nonce,
                fileName: file.name,
                mimeType: file.type,
                fileSize: file.size,
                uploadedAt: new Date(),
                encryptedBlob: encrypted,
            };

            await savePhoto(metadata);

            // Sync to Supabase Cloud
            try {
                const deviceId = getDeviceId();
                await uploadCIDMetadata(cid, file.size, deviceId);
                console.log('Photo synced to cloud:', cid);
            } catch (error) {
                console.error('Cloud sync failed (photo saved locally):', error);
                // Don't throw - local save succeeded
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
    };
}
