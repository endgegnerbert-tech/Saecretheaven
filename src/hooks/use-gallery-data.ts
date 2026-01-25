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

// HEIC conversion moved to Web Worker for non-blocking performance
// See src/lib/heic-converter.ts
import { convertHeicToJpeg } from '@/lib/heic-converter';

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
    // WICHTIG: Query ist IMMER enabled - IndexedDB braucht kein secretKey
    // Decryption passiert separat wenn secretKey vorhanden ist
    const {
        data: photos = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ['photos'],
        queryFn: getAllPhotos,
        enabled: true, // Immer laden, unabhängig von secretKey
    });

    // Query: Photo count
    const { data: photoCount = 0 } = useQuery({
        queryKey: ['photoCount'],
        queryFn: getPhotoCount,
    });

    const [uploadProgress, setUploadProgress] = useState<number>(0);

    // Mutation: Upload photo (convert HEIC -> encrypt -> IPFS -> Supabase metadata)
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!secretKey) throw new Error('No encryption key');
            if (!userKeyHash) throw new Error('userKeyHash not ready - bitte kurz warten');

            console.log('[Upload] Starting upload:', file.name);
            setUploadProgress(0);

            // Step 0: Convert HEIC to JPEG if needed (iOS compatibility)
            // Uses Web Worker for non-blocking conversion on iPad/iPhone
            const conversionResult = await convertHeicToJpeg(file);
            const processedFile = conversionResult.file;

            if (conversionResult.converted) {
                console.log('[Upload] HEIC converted:', {
                    originalSize: conversionResult.originalSize,
                    convertedSize: conversionResult.convertedSize
                });
            }

            // Step 1: Encrypt file client-side
            const { encrypted, nonce } = await encryptFile(processedFile, secretKey);
            console.log('[Upload] Encrypted:', { size: encrypted.size });

            // Step 2: Upload encrypted blob to IPFS -> returns real CID
            let cid: string;
            try {
                cid = await remoteStorage.upload(encrypted, processedFile.name, (progress) => {
                    setUploadProgress(progress);
                });
                console.log('[Upload] IPFS CID:', cid);
            } catch (error) {
                console.error('[Upload] IPFS failed:', error);
                // Generate fallback local CID for offline-first
                cid = `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                console.log('[Upload] Using fallback CID:', cid);
            }

            // Step 3: Save to local IndexedDB (for immediate access)
            const metadata: Omit<PhotoMetadata, 'id'> = {
                cid,
                nonce,
                fileName: processedFile.name,
                mimeType: processedFile.type,
                fileSize: processedFile.size,
                uploadedAt: new Date(),
                encryptedBlob: encrypted, // Keep locally for fast access
            };

            try {
                await savePhoto(metadata);
                console.log('[Upload] Saved to IndexedDB:', cid);
            } catch (dbError) {
                console.error('[Upload] IndexedDB save FAILED:', dbError);
                throw dbError; // Fail the mutation - this is critical
            }

            // Step 4: Sync metadata to Supabase (CID only, no blob)
            const deviceId = getDeviceId();
            try {
                await uploadCIDMetadata(
                    cid,
                    processedFile.size,
                    deviceId,
                    nonce,
                    processedFile.type,
                    userKeyHash // Jetzt garantiert nicht undefined
                );
                console.log('[Upload] Supabase synced:', cid);
            } catch (error) {
                console.error('[Upload] Supabase sync failed (local + IPFS OK):', error);
                // Don't throw - local + IPFS save succeeded
            }

            return metadata;
        },
        onSuccess: () => {
            // Sofort Queries invalidieren für UI-Update
            queryClient.invalidateQueries({ queryKey: ['photos'] });
            queryClient.invalidateQueries({ queryKey: ['photoCount'] });
            console.log('[Upload] Complete - queries invalidated');
        },
        onError: (error) => {
            console.error('[Upload] Mutation failed:', error);
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
        uploadProgress,
        userKeyHash
    };
}
