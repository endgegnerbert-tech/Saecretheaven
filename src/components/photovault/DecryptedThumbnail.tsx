"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Cloud } from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import { decryptFile } from "@/lib/crypto";
import { remoteStorage } from "@/lib/storage/remote-storage";
import { isRealIPFSCID } from "@/lib/storage/remote-storage";
import { getPhotoBlob, type PhotoMetadata } from "@/lib/storage/local-db";

interface DecryptedThumbnailProps {
    photo: PhotoMetadata;
    secretKey: Uint8Array | null;
    /** If true, show cloud icon overlay for cloud-only photos */
    showCloudBadge?: boolean;
}

export function DecryptedThumbnail({
    photo,
    secretKey,
    showCloudBadge = true
}: DecryptedThumbnailProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [isFetchingFromCloud, setIsFetchingFromCloud] = useState(false);
    const [isCloudPhoto, setIsCloudPhoto] = useState(false);

    // Track the current image URL for cleanup
    const currentUrlRef = useRef<string | null>(null);

    useEffect(() => {
        // Skip if no key or already have URL
        if (!secretKey) {
            console.log('[Thumbnail] No secretKey available for:', photo.cid);
            return;
        }
        if (imageUrl) return;

        const loadAndDecrypt = async () => {
            setIsDecrypting(true);
            console.log('[Thumbnail] Starting decrypt for:', photo.cid, { id: photo.id, hasBlob: !!photo.encryptedBlob, hasKey: !!secretKey });

            try {
                let blobToDecrypt: Blob | undefined = photo.encryptedBlob;

                // If no blob in memory, try to lazy-load from local IndexedDB first
                if (!blobToDecrypt && photo.id) {
                    console.log('[Thumbnail] Loading from IndexedDB, id:', photo.id);
                    blobToDecrypt = await getPhotoBlob(photo.id);
                    console.log('[Thumbnail] IndexedDB result:', blobToDecrypt ? `${blobToDecrypt.size} bytes` : 'null');
                } else if (!blobToDecrypt && !photo.id) {
                    console.log('[Thumbnail] No photo.id - cannot load from IndexedDB:', photo.cid);
                }

                // If still no local blob, try to fetch from IPFS (cloud)
                if (!blobToDecrypt && photo.cid && isRealIPFSCID(photo.cid)) {
                    setIsFetchingFromCloud(true);
                    setIsCloudPhoto(true);
                    console.log('Fetching from IPFS for thumbnail:', photo.cid);

                    try {
                        blobToDecrypt = await remoteStorage.download(photo.cid);
                        console.log('Fetched from IPFS:', { cid: photo.cid, size: blobToDecrypt.size });
                    } catch (fetchError) {
                        console.error(`Failed to fetch from IPFS (CID: ${photo.cid}):`, fetchError);
                        setError(true);
                        return;
                    } finally {
                        setIsFetchingFromCloud(false);
                    }
                }

                // If still no blob, show error
                if (!blobToDecrypt) {
                    console.log('[Thumbnail] No blob available for:', photo.cid, '- showing as cloud photo');
                    // Don't set error - this might be a cloud-only photo not yet fetched
                    setIsCloudPhoto(true);
                    return;
                }

                // Decrypt the blob
                console.log('[Thumbnail] Decrypting:', { blobSize: blobToDecrypt.size, nonce: photo.nonce?.slice(0, 10) + '...', mimeType: photo.mimeType });
                const decrypted = await decryptFile(
                    blobToDecrypt,
                    photo.nonce,
                    secretKey,
                    photo.mimeType
                );

                if (decrypted) {
                    console.log('[Thumbnail] Decryption success:', decrypted.size, 'bytes');
                    const url = URL.createObjectURL(decrypted);
                    currentUrlRef.current = url;
                    setImageUrl(url);
                } else {
                    console.error('[Thumbnail] Decryption returned null - key/nonce mismatch?', photo.cid);
                    setError(true);
                }
            } catch (err) {
                console.error("Failed to decrypt photo:", photo.cid, err);
                setError(true);
            } finally {
                setIsDecrypting(false);
            }
        };

        loadAndDecrypt();

        // Cleanup: Revoke object URL when component unmounts or photo changes
        return () => {
            if (currentUrlRef.current) {
                // Delay revocation slightly to avoid WebKitBlobResource-Fehler on some browsers
                // while the image might still be painting or being accessed
                const urlToRevoke = currentUrlRef.current;
                setTimeout(() => {
                    try {
                        URL.revokeObjectURL(urlToRevoke);
                    } catch (e) {
                        // Ignore errors during revocation
                    }
                }, 1000);
                currentUrlRef.current = null;
            }
        };
    }, [photo, secretKey, imageUrl]);

    // Error state
    if (error) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-500 p-2 text-center">
                <CustomIcon name="lock" size={24} className="mb-1 opacity-50" />
                <span className="text-[10px]">Fehler</span>
            </div>
        );
    }

    // Loading state (fetching from cloud)
    if (isFetchingFromCloud) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50">
                <Cloud className="w-5 h-5 text-blue-400 mb-1 animate-pulse" />
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-[9px] text-blue-500 mt-1">Laden...</span>
            </div>
        );
    }

    // Loading state (decrypting)
    if (isDecrypting || !imageUrl) {
        // Cloud-only photo placeholder
        if (isCloudPhoto && !imageUrl && !isDecrypting) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 relative">
                    <Cloud className="w-6 h-6 text-gray-400" />
                    <span className="text-[9px] text-gray-500 mt-1">In der Cloud</span>
                </div>
            );
        }

        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    // Image loaded - show with optional cloud badge
    return (
        <div className="relative w-full h-full">
            <img
                src={imageUrl}
                alt=""
                className="w-full h-full object-cover animate-in fade-in duration-500"
                loading="lazy"
            />
            {/* Cloud badge overlay for photos fetched from cloud */}
            {showCloudBadge && isCloudPhoto && (
                <div className="absolute bottom-1 right-1 bg-black/50 rounded-full p-1">
                    <Cloud className="w-3 h-3 text-white" />
                </div>
            )}
        </div>
    );
}
