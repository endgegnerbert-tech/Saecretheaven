"use client";

import { useState, useRef, useCallback } from "react";
import { SlidersHorizontal, X, Check, CloudOff, Download, Loader2, Cloud } from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import { useEncryption } from "@/hooks/use-encryption";
import { useGalleryData } from "@/hooks/use-gallery-data";
import { useRealtimeSync, type SyncedPhoto } from "@/hooks/useRealtimeSync";
import { DecryptedThumbnail } from "./DecryptedThumbnail";
import { remoteStorage, isRealIPFSCID } from "@/lib/storage/remote-storage";
import { decryptFile } from "@/lib/crypto";
import type { PhotoMetadata } from "@/lib/storage/local-db";

interface PhotoGalleryProps {
    photosCount: number;
}

// Generate placeholder photo URLs with dates
const generatePhotos = (count: number) => {
    const categories = [
        "nature",
        "architecture",
        "travel",
        "food",
        "animals",
        "city",
        "landscape",
        "portrait",
        "ocean",
        "forest",
    ];

    // Create photos with dates going backwards from today
    const today = new Date();
    return Array.from({ length: count }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - Math.floor(i / 3)); // 3 photos per day

        return {
            id: `photo-${i}`,
            cid: `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
            placeholderUrl: `https://picsum.photos/seed/${i + 100}/400/400`,
            category: categories[i % categories.length],
            date: date.toISOString().split("T")[0],
            metadata: undefined as PhotoMetadata | undefined,
        };
    });
};

// Group photos by date
const groupPhotosByDate = (photos: ReturnType<typeof generatePhotos>) => {
    const groups: { [key: string]: typeof photos } = {};
    photos.forEach((photo) => {
        if (!groups[photo.date]) {
            groups[photo.date] = [];
        }
        groups[photo.date].push(photo);
    });
    return Object.entries(groups).map(([date, photos]) => ({
        date,
        photos,
        label: formatDateLabel(date),
    }));
};

const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split("T")[0]) {
        return "Heute";
    } else if (dateStr === yesterday.toISOString().split("T")[0]) {
        return "Gestern";
    } else {
        return date.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
        });
    }
};

export function PhotoGallery({ photosCount }: PhotoGalleryProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [showFilter, setShowFilter] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
    const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
    const [syncNotification, setSyncNotification] = useState<string | null>(null);

    // Fullscreen photo state
    const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
    const [isLoadingFullscreen, setIsLoadingFullscreen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    // Encryption & Real Photo Storage
    const { secretKey } = useEncryption();
    const {
        photos: realPhotos,
        uploadPhoto,
        isUploading,
    } = useGalleryData(secretKey);

    // Realtime Sync - receive photos from other devices
    const handleNewPhoto = useCallback((photo: SyncedPhoto) => {
        console.log('New photo from device:', photo.device_id);
        setSyncNotification(`Neues Foto von anderem Gerät empfangen`);
        setTimeout(() => setSyncNotification(null), 3000);
    }, []);

    const {
        remoteCIDs,
        remoteCIDsFromOtherDevices,
        isConnected,
    } = useRealtimeSync({
        onNewPhoto: handleNewPhoto,
        enabled: true,
        secretKey,
    });

    // Combine local photos with remote-only photos
    const allPhotos = (() => {
        // Start with local photos
        const localPhotos = realPhotos.map((p) => ({
            id: p.id?.toString() || p.cid,
            cid: p.cid,
            placeholderUrl: "",
            category: "photo",
            date: p.uploadedAt.toISOString().split("T")[0],
            metadata: p,
            isLocal: true,
            isCloud: isRealIPFSCID(p.cid),
        }));

        // Add remote-only photos (from other devices, not in local DB)
        const localCids = new Set(realPhotos.map(p => p.cid));
        const remoteOnlyPhotos = remoteCIDs
            .filter(r => !localCids.has(r.cid))
            .map((r) => ({
                id: r.cid,
                cid: r.cid,
                placeholderUrl: "",
                category: "cloud",
                date: r.uploaded_at ? new Date(r.uploaded_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                metadata: {
                    cid: r.cid,
                    nonce: r.nonce || '',
                    fileName: `cloud_${r.cid}`,
                    mimeType: r.mime_type || 'image/jpeg',
                    fileSize: r.file_size_bytes || 0,
                    uploadedAt: r.uploaded_at ? new Date(r.uploaded_at) : new Date(),
                } as PhotoMetadata,
                isLocal: false,
                isCloud: true,
            }));

        return [...localPhotos, ...remoteOnlyPhotos];
    })();

    // Use real photos if available, otherwise use placeholders
    const photos = allPhotos.length > 0 ? allPhotos : generatePhotos(Math.min(photosCount, 50));

    const filteredPhotos = photos.filter((photo) => {
        if (selectedFilter && photo.category !== selectedFilter) return false;
        if (searchQuery && !photo.category.includes(searchQuery.toLowerCase()))
            return false;
        return true;
    });

    const filteredGroups = groupPhotosByDate(filteredPhotos);

    // Load fullscreen photo (on-demand from IPFS if needed)
    const loadFullscreenPhoto = async (photo: typeof photos[0]) => {
        if (!secretKey || !photo.metadata) return;

        setIsLoadingFullscreen(true);
        setFullscreenImageUrl(null);

        try {
            let blobToDecrypt: Blob | undefined = photo.metadata.encryptedBlob;

            // Fetch from IPFS if not local
            if (!blobToDecrypt && photo.cid && isRealIPFSCID(photo.cid)) {
                console.log('Loading full-res from IPFS:', photo.cid);
                blobToDecrypt = await remoteStorage.download(photo.cid);
            }

            if (!blobToDecrypt) {
                console.error('No blob available for fullscreen');
                return;
            }

            // Decrypt
            const decrypted = await decryptFile(
                blobToDecrypt,
                photo.metadata.nonce,
                secretKey,
                photo.metadata.mimeType
            );

            if (decrypted) {
                const url = URL.createObjectURL(decrypted);
                setFullscreenImageUrl(url);
            }
        } catch (error) {
            console.error('Failed to load fullscreen photo:', error);
        } finally {
            setIsLoadingFullscreen(false);
        }
    };

    // Download photo to device
    const downloadPhoto = async (photo: typeof photos[0]) => {
        if (!secretKey || !photo.metadata) return;

        setIsDownloading(true);

        try {
            let blobToDecrypt: Blob | undefined = photo.metadata.encryptedBlob;

            // Fetch from IPFS if not local
            if (!blobToDecrypt && photo.cid && isRealIPFSCID(photo.cid)) {
                blobToDecrypt = await remoteStorage.download(photo.cid);
            }

            if (!blobToDecrypt) return;

            // Decrypt
            const decrypted = await decryptFile(
                blobToDecrypt,
                photo.metadata.nonce,
                secretKey,
                photo.metadata.mimeType
            );

            if (decrypted) {
                // Create download link
                const url = URL.createObjectURL(decrypted);
                const a = document.createElement('a');
                a.href = url;
                a.download = photo.metadata.fileName || `photo_${photo.cid.slice(0, 8)}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                setSyncNotification('Foto heruntergeladen!');
                setTimeout(() => setSyncNotification(null), 2000);
            }
        } catch (error) {
            console.error('Failed to download photo:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePhotoTap = (photoId: string, photo: typeof photos[0]) => {
        if (selectMode) {
            setSelectedPhotos((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(photoId)) {
                    newSet.delete(photoId);
                } else {
                    newSet.add(photoId);
                }
                return newSet;
            });
        } else {
            setFullscreenPhoto(photoId);
            if (photo.metadata) {
                loadFullscreenPhoto(photo);
            }
        }
    };

    const closeFullscreen = () => {
        setFullscreenPhoto(null);
        if (fullscreenImageUrl) {
            URL.revokeObjectURL(fullscreenImageUrl);
            setFullscreenImageUrl(null);
        }
    };

    const handleTouchStart = (photoId: string) => {
        longPressTimer.current = setTimeout(() => {
            setSelectMode(true);
            setSelectedPhotos(new Set([photoId]));
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const categories = [
        { id: "nature", label: "Natur" },
        { id: "architecture", label: "Architektur" },
        { id: "travel", label: "Reisen" },
        { id: "food", label: "Essen" },
        { id: "animals", label: "Tiere" },
        { id: "city", label: "Stadt" },
        { id: "landscape", label: "Landschaft" },
    ];

    // Handle file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach((file) => uploadPhoto(file));
    };

    return (
        <div className="flex flex-col h-full bg-[#F2F2F7]">
            {/* Header */}
            <header className="h-[60px] bg-white border-b border-[#E5E5EA] px-4 flex items-center justify-between shrink-0">
                {showSearch ? (
                    <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 bg-[#E5E5EA] rounded-lg px-3 py-2 flex items-center gap-2">
                            <CustomIcon name="search" size={16} />
                            <input
                                type="text"
                                placeholder="Suchen..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-[15px] text-[#1D1D1F] outline-none"
                                autoFocus
                            />
                        </div>
                        <button
                            onClick={() => {
                                setShowSearch(false);
                                setSearchQuery("");
                            }}
                            className="text-[17px] text-[#007AFF] ios-tap-target"
                        >
                            Abbrechen
                        </button>
                    </div>
                ) : selectMode ? (
                    <>
                        <button
                            onClick={() => {
                                setSelectMode(false);
                                setSelectedPhotos(new Set());
                            }}
                            className="text-[17px] text-[#007AFF] ios-tap-target"
                        >
                            Abbrechen
                        </button>
                        <span className="sf-pro-display text-[17px] text-[#1D1D1F]">
                            {selectedPhotos.size} ausgewählt
                        </span>
                        <button
                            onClick={() => {
                                console.log(
                                    "TODO: Delete selected photos",
                                    Array.from(selectedPhotos),
                                );
                            }}
                            className="text-[17px] text-[#FF3B30] ios-tap-target"
                        >
                            Löschen
                        </button>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <CustomIcon name="lock" size={20} />
                            <h1 className="sf-pro-display text-[20px] text-[#1D1D1F]">
                                Galerie
                            </h1>
                            {/* Sync Status Indicator */}
                            {isConnected ? (
                                <Cloud className="w-4 h-4 text-[#007AFF]" />
                            ) : (
                                <CloudOff className="w-4 h-4 text-[#8E8E93]" />
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Upload Button */}
                            <label className="ios-tap-target cursor-pointer">
                                <div className={isUploading ? "animate-pulse opacity-50" : ""}>
                                    <CustomIcon name="upload" size={24} />
                                </div>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    disabled={isUploading}
                                />
                            </label>
                            <button
                                onClick={() => setShowSearch(true)}
                                className="ios-tap-target"
                            >
                                <CustomIcon name="search" size={24} />
                            </button>
                            <button
                                onClick={() => setShowFilter(!showFilter)}
                                className="ios-tap-target"
                            >
                                <SlidersHorizontal
                                    className={`w-6 h-6 ${selectedFilter ? "text-[#30D158]" : "text-[#007AFF]"}`}
                                />
                            </button>
                        </div>
                    </>
                )}
            </header>

            {/* Filter Bar */}
            {showFilter && (
                <div className="bg-white border-b border-[#E5E5EA] px-4 py-3 shrink-0">
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                        <button
                            onClick={() => setSelectedFilter(null)}
                            className={`px-4 py-1.5 rounded-full text-[15px] whitespace-nowrap shrink-0 ${
                                selectedFilter === null
                                    ? "bg-[#007AFF] text-white"
                                    : "bg-[#E5E5EA] text-[#1D1D1F]"
                            }`}
                        >
                            Alle
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedFilter(cat.id)}
                                className={`px-4 py-1.5 rounded-full text-[15px] whitespace-nowrap shrink-0 ${
                                    selectedFilter === cat.id
                                        ? "bg-[#007AFF] text-white"
                                        : "bg-[#E5E5EA] text-[#1D1D1F]"
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Photo Grid with Date Groups */}
            <div className="flex-1 overflow-y-auto">
                {filteredGroups.map((group) => (
                    <div key={group.date} className="mb-2">
                        {/* Date Header */}
                        <div className="sticky top-0 bg-[#F2F2F7]/95 backdrop-blur-sm px-3 py-2 z-10">
                            <p className="text-[13px] font-semibold text-[#6E6E73]">
                                {group.label}
                            </p>
                        </div>

                        {/* Photos Grid */}
                        <div className="grid grid-cols-3 gap-[2px] px-[2px]">
                            {group.photos.map((photo) => {
                                const isRealPhoto = photo.metadata !== undefined;

                                return (
                                    <button
                                        key={photo.id}
                                        onClick={() => handlePhotoTap(photo.id, photo)}
                                        onTouchStart={() => handleTouchStart(photo.id)}
                                        onTouchEnd={handleTouchEnd}
                                        onTouchCancel={handleTouchEnd}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setSelectMode(true);
                                            setSelectedPhotos(new Set([photo.id]));
                                        }}
                                        className="relative aspect-square overflow-hidden bg-[#E5E5EA]"
                                    >
                                        {isRealPhoto ? (
                                            <DecryptedThumbnail
                                                photo={photo.metadata!}
                                                secretKey={secretKey}
                                                showCloudBadge={true}
                                            />
                                        ) : photo.placeholderUrl ? (
                                            // Placeholder photo (demo data)
                                            <img
                                                src={photo.placeholderUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : null}

                                        {selectMode && (
                                            <div className="absolute inset-0 bg-black/20">
                                                <div
                                                    className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                                        selectedPhotos.has(photo.id)
                                                            ? "bg-[#007AFF] border-[#007AFF]"
                                                            : "border-white bg-black/30"
                                                    }`}
                                                >
                                                    {selectedPhotos.has(photo.id) && (
                                                        <Check className="w-4 h-4 text-white" />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Help text */}
                <div className="text-center py-6 px-4">
                    <p className="text-[13px] text-[#8E8E93]">
                        Lange drücken zum Auswählen • Tippen zum Öffnen
                    </p>
                    <p className="text-[11px] text-[#C7C7CC] mt-1">
                        {realPhotos.length} Fotos lokal • {remoteCIDs.length} in der Cloud
                    </p>
                    {remoteCIDsFromOtherDevices.length > 0 && (
                        <div className="text-[11px] text-[#007AFF] mt-1 flex items-center justify-center gap-1">
                            <CustomIcon name="smartphone" size={12} />
                            {remoteCIDsFromOtherDevices.length} von anderen Geräten
                        </div>
                    )}
                </div>
            </div>

            {/* Sync Notification Toast */}
            {syncNotification && (
                <div className="fixed top-[70px] left-1/2 -translate-x-1/2 bg-[#1D1D1F] text-white px-4 py-2 rounded-full text-[13px] flex items-center gap-2 z-50 animate-pulse">
                    <Cloud className="w-4 h-4" />
                    {syncNotification}
                </div>
            )}

            {/* Fullscreen Photo View */}
            {fullscreenPhoto && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col">
                    <header className="h-[60px] flex items-center justify-between px-4 bg-black/80">
                        <button
                            onClick={closeFullscreen}
                            className="ios-tap-target"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>
                        <span className="text-[17px] text-white">
                            Foto {photos.findIndex((p) => p.id === fullscreenPhoto) + 1} von{" "}
                            {photos.length}
                        </span>
                        <div className="w-10" />
                    </header>
                    <div className="flex-1 flex items-center justify-center p-4">
                        {isLoadingFullscreen ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="w-12 h-12 animate-spin text-white/60" />
                                <p className="text-white/60 text-center">
                                    Lade von IPFS...
                                </p>
                            </div>
                        ) : fullscreenImageUrl ? (
                            <img
                                src={fullscreenImageUrl}
                                alt=""
                                className="max-w-full max-h-full object-contain rounded-lg"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <CustomIcon name="lock" size={64} />
                                <p className="text-white/80 text-center">
                                    Verschlüsseltes Foto
                                </p>
                            </div>
                        )}
                    </div>
                    <footer className="h-[80px] flex items-center justify-center gap-6 bg-black/80 px-4">
                        {/* Download Button */}
                        <button
                            onClick={() => {
                                const photo = photos.find((p) => p.id === fullscreenPhoto);
                                if (photo) downloadPhoto(photo);
                            }}
                            disabled={isDownloading}
                            className="flex flex-col items-center gap-1 ios-tap-target"
                        >
                            {isDownloading ? (
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                            ) : (
                                <Download className="w-6 h-6 text-white" />
                            )}
                            <span className="text-[11px] text-white/80">Herunterladen</span>
                        </button>

                        {/* Lock indicator */}
                        <div className="flex flex-col items-center gap-1">
                            <CustomIcon name="lock" size={20} />
                            <span className="text-[11px] text-white/60">Verschlüsselt</span>
                        </div>
                    </footer>
                </div>
            )}
        </div>
    );
}
