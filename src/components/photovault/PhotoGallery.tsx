"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CustomIcon } from "@/components/ui/custom-icon";
import { useEncryption } from "@/hooks/use-encryption";
import { useGalleryData } from "@/hooks/use-gallery-data";
import { useRealtimeSync, type SyncedPhoto } from "@/hooks/useRealtimeSync";
import { DecryptedThumbnail } from "./DecryptedThumbnail";
import { SecureShareDialog } from "./SecureShareDialog";
import {
  Plus,
  Search,
  Filter,
  Image as ImageIcon,
  LayoutGrid,

  Calendar,
  MoreVertical,
  X,
  Share2,
  Trash2,
  Heart,
  ExternalLink,
  RefreshCw,
  Loader2,
  SlidersHorizontal,
  Check,
  CloudOff,
  Download,
  Cloud,
  Lock,
  Info,
  ChevronLeft,
  Link2,
} from "lucide-react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";
import { remoteStorage, isRealIPFSCID } from "@/lib/storage/remote-storage";
import { decryptFile } from "@/lib/crypto";
import { getPhotoBlob, type PhotoMetadata } from "@/lib/storage/local-db";

import { CreateBurnerLinkDialog } from "./CreateBurnerLinkDialog";
import { BurnerGallerySection } from "./BurnerGallerySection";


interface PhotoGalleryProps {
  photosCount?: number;
  authUser: { id: string; email: string } | null;
  onNavigateToBurnerLinks?: () => void;
}



// Allowed MIME types for upload
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
];

// Get file extension from MIME type
const getExtensionFromMime = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/heic": ".jpg", // HEIC gets converted to JPEG
    "image/heif": ".jpg",
  };
  return mimeToExt[mimeType] || ".jpg";
};

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
    return "Today";
  } else if (dateStr === yesterday.toISOString().split("T")[0]) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }
};

export function PhotoGallery({ photosCount = 0, authUser, onNavigateToBurnerLinks }: PhotoGalleryProps) {
  const queryClient = useQueryClient();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showBurnerDialog, setShowBurnerDialog] = useState(false);
  const [photoToShare, setPhotoToShare] = useState<any>(null);


  const handleShareClick = (photo: any) => {
    setPhotoToShare(photo);
    setShowShareDialog(true);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  // Fullscreen photo state
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(
    null,
  );
  const [isLoadingFullscreen, setIsLoadingFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Encryption & Real Photo Storage
  const { secretKey } = useEncryption();
  const {
    photos: realPhotos,
    uploadPhoto,
    deletePhoto,
    isUploading,
    uploadProgress,
  } = useGalleryData(secretKey);

  // Realtime Sync - receive photos from other devices
  // When a new photo arrives, invalidate the gallery query to refresh
  const handleNewPhoto = useCallback(
    (photo: SyncedPhoto) => {
      console.log(
        "[Realtime] New photo from device:",
        photo.device_id,
        photo.cid,
      );
      setSyncNotification(`New photo received from another device`);
      setTimeout(() => setSyncNotification(null), 3000);

      // Invalidate gallery queries to refresh the photo list
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["photoCount"] });
    },
    [queryClient],
  );

  // Handle photo deletion from another device
  const handlePhotoDeleted = useCallback(
    (cid: string) => {
      console.log("[Realtime] Photo deleted from another device:", cid);
      setSyncNotification(`Photo deleted from another device`);
      setTimeout(() => setSyncNotification(null), 3000);

      // Invalidate gallery queries to refresh the photo list
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["photoCount"] });
    },
    [queryClient],
  );

  const { remoteCIDs, remoteCIDsFromOtherDevices, isConnected } =
    useRealtimeSync({
      onNewPhoto: handleNewPhoto,
      onPhotoDeleted: handlePhotoDeleted,
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
    const localCids = new Set(realPhotos.map((p) => p.cid));
    const remoteOnlyPhotos = remoteCIDs
      .filter((r) => !localCids.has(r.cid))
      .map((r) => ({
        id: r.cid,
        cid: r.cid,
        placeholderUrl: "",
        category: "cloud",
        date: r.uploaded_at
          ? new Date(r.uploaded_at).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        metadata: {
          cid: r.cid,
          nonce: r.nonce || "",
          fileName: `cloud_${r.cid}`,
          mimeType: r.mime_type || "image/jpeg",
          fileSize: r.file_size_bytes || 0,
          uploadedAt: r.uploaded_at ? new Date(r.uploaded_at) : new Date(),
        } as PhotoMetadata,
        isLocal: false,
        isCloud: true,
      }));

    return [...localPhotos, ...remoteOnlyPhotos];
  })();

  // Use real photos if available, otherwise use placeholders
  const photos = useMemo(
    () =>
      allPhotos.length > 0
        ? allPhotos
        : generatePhotos(Math.min(photosCount, 50)),
    [allPhotos, photosCount],
  );

  const filteredPhotos = useMemo(
    () =>
      photos.filter((photo) => {
        if (selectedFilter && photo.category !== selectedFilter) return false;
        if (searchQuery && !photo.category.includes(searchQuery.toLowerCase()))
          return false;
        return true;
      }),
    [photos, selectedFilter, searchQuery],
  );

  const filteredGroups = useMemo(
    () => groupPhotosByDate(filteredPhotos),
    [filteredPhotos],
  );

  // Animate fullscreen entrance
  useEffect(() => {
    if (fullscreenPhoto) {
      requestAnimationFrame(() => {
        setFullscreenVisible(true);
      });
    }
  }, [fullscreenPhoto]);

  // Load fullscreen photo (lazy-load from IndexedDB, then IPFS if needed)
  const loadFullscreenPhoto = async (photo: (typeof photos)[0]) => {
    if (!secretKey || !photo.metadata) return;

    setIsLoadingFullscreen(true);
    setFullscreenImageUrl(null);

    try {
      let blobToDecrypt: Blob | undefined = photo.metadata.encryptedBlob;

      // Lazy-load from local IndexedDB first
      if (!blobToDecrypt && photo.metadata.id) {
        blobToDecrypt = await getPhotoBlob(photo.metadata.id);
      }

      // Fetch from IPFS if not in local DB
      if (!blobToDecrypt && photo.cid && isRealIPFSCID(photo.cid)) {
        console.log("Loading full-res from IPFS:", photo.cid);
        blobToDecrypt = await remoteStorage.download(photo.cid);
      }

      if (!blobToDecrypt) {
        console.error("No blob available for fullscreen");
        return;
      }

      // Decrypt
      const decrypted = await decryptFile(
        blobToDecrypt,
        photo.metadata.nonce,
        secretKey,
        photo.metadata.mimeType,
      );

      if (decrypted) {
        const url = URL.createObjectURL(decrypted);
        setFullscreenImageUrl(url);
      }
    } catch (error) {
      console.error("Failed to load fullscreen photo:", error);
    } finally {
      setIsLoadingFullscreen(false);
    }
  };

  // Download photo to device with correct extension
  const downloadPhoto = async (photo: (typeof photos)[0]) => {
    if (!secretKey || !photo.metadata) return;

    setIsDownloading(true);

    try {
      let blobToDecrypt: Blob | undefined = photo.metadata.encryptedBlob;

      // Lazy-load from local IndexedDB first
      if (!blobToDecrypt && photo.metadata.id) {
        blobToDecrypt = await getPhotoBlob(photo.metadata.id);
      }

      // Fetch from IPFS if not in local DB
      if (!blobToDecrypt && photo.cid && isRealIPFSCID(photo.cid)) {
        blobToDecrypt = await remoteStorage.download(photo.cid);
      }

      if (!blobToDecrypt) return;

      // Decrypt
      const decrypted = await decryptFile(
        blobToDecrypt,
        photo.metadata.nonce,
        secretKey,
        photo.metadata.mimeType,
      );

      if (decrypted) {
        // Create download link with correct extension
        const url = URL.createObjectURL(decrypted);
        const a = document.createElement("a");
        a.href = url;

        // Ensure correct file extension
        const ext = getExtensionFromMime(photo.metadata.mimeType);
        let fileName = photo.metadata.fileName || `photo_${photo.cid.slice(0, 8)}`;

        // Remove existing extension if present and add correct one
        const lastDot = fileName.lastIndexOf(".");
        if (lastDot > 0) {
          fileName = fileName.substring(0, lastDot);
        }
        fileName = fileName + ext;

        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSyncNotification("Photo saved to device");
        setTimeout(() => setSyncNotification(null), 2000);
      }
    } catch (error) {
      console.error("Failed to download photo:", error);
      setSyncNotification("Download failed");
      setTimeout(() => setSyncNotification(null), 2000);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePhotoTap = (photoId: string, photo: (typeof photos)[0]) => {
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
    setFullscreenVisible(false);
    setTimeout(() => {
      setFullscreenPhoto(null);
      if (fullscreenImageUrl) {
        URL.revokeObjectURL(fullscreenImageUrl);
        setFullscreenImageUrl(null);
      }
    }, 200);
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

  // Filter categories - removed as per request


  // Handle file upload with strict type validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Filter valid files
    const validFiles = files.filter((file) => {
      const isValidType = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
      if (!isValidType) {
        console.warn(`Rejected file ${file.name}: invalid type ${file.type}`);
      }
      return isValidType;
    });

    if (validFiles.length < files.length) {
      const rejected = files.length - validFiles.length;
      setSyncNotification(`${rejected} file(s) skipped (unsupported format)`);
      setTimeout(() => setSyncNotification(null), 3000);
    }

    validFiles.forEach((file) => uploadPhoto(file));

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const allPhotosCount = photos.length;

  return (
    <div className="flex flex-col h-full bg-[#FAFBFC]">
      {/* Header with refined UI */}
      <header className="px-5 pt-10 pb-4 bg-[#FAFBFC] sticky top-0 z-30 border-b border-gray-200/60">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gallery</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2.5 rounded-full transition-all duration-200 ${
                showSearch
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Stealth Drop Button */}
            <button
                onClick={() => onNavigateToBurnerLinks ? onNavigateToBurnerLinks() : setShowBurnerDialog(true)}
                className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-2 rounded-full transition-all duration-200 mr-2 border border-indigo-100/50"
                title="Create secure anonymous link"
            >
                <Link2 className="w-4 h-4" />
                <span className="text-xs font-semibold">Stealth Drop</span>
            </button>
            <Button


              onClick={handleUploadClick}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add
            </Button>
          </div>
        </div>

        {/* Subtitle / Status */}
        <div className="flex items-center justify-between px-0.5 mb-4">
          <p className="text-sm font-medium text-gray-500">
            {allPhotosCount} {allPhotosCount === 1 ? "photo" : "photos"} backed up
          </p>
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <div className="flex items-center gap-1.5 text-green-600">
                <Cloud className="w-4 h-4" />
                <span className="text-xs font-medium">Synced</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-400">
                <CloudOff className="w-4 h-4" />
                <span className="text-xs font-medium">Offline</span>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mb-4 relative animate-in slide-in-from-top-2 duration-200">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search photos..."
              className="w-full pl-10 bg-gray-100 border-none rounded-xl h-11 text-sm focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        )}


      </header>

      {/* Gallery Grid */}
      <main className="flex-1 overflow-y-auto pb-[100px]">
        {authUser && (
            <BurnerGallerySection 
                userId={authUser.id} 
                vaultKeyBytes={secretKey}
            />
        )}
        
        {filteredGroups.length === 0 ? (

          <div className="pt-20 text-center px-10">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-100 flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-lg font-semibold text-gray-700">
              No photos yet
            </p>
            <p className="text-sm text-gray-500 mt-2 mb-6">
              Start by adding your first photo
            </p>
            <Button
              onClick={handleUploadClick}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Photos
            </Button>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.date} className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 px-4 mb-2 sticky top-0 bg-[#FAFBFC]/95 backdrop-blur-sm z-10 py-2">
                {group.label}
              </h2>
              <div className="grid grid-cols-3 gap-[2px] px-[2px]">
                {group.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative aspect-square overflow-hidden cursor-pointer transition-all duration-150 ${
                      selectedPhotos.has(photo.id)
                        ? "ring-2 ring-blue-500 ring-inset scale-[0.96]"
                        : "hover:opacity-90 active:scale-[0.98]"
                    }`}
                    onClick={() => handlePhotoTap(photo.id, photo)}
                    onTouchStart={() => handleTouchStart(photo.id)}
                    onTouchEnd={handleTouchEnd}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectMode(true);
                      setSelectedPhotos(new Set([photo.id]));
                    }}
                  >
                    <DecryptedThumbnail
                      photo={photo.metadata!}
                      secretKey={secretKey}
                      showCloudBadge={true}
                    />

                    {/* Select Indicator */}
                    {selectMode && (
                      <div className="absolute top-2 right-2 z-10">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 ${
                            selectedPhotos.has(photo.id)
                              ? "bg-blue-600 shadow-lg"
                              : "bg-white/90 border-2 border-gray-300 backdrop-blur-sm"
                          }`}
                        >
                          {selectedPhotos.has(photo.id) && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Non-blocking Status Pill for Notifications */}
      {syncNotification && (
        <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-gray-900/90 backdrop-blur-md py-2.5 px-5 rounded-full shadow-lg">
            <p className="text-white text-sm font-medium flex items-center gap-2">
              {syncNotification.includes("received") && <Cloud className="w-4 h-4 text-blue-400" />}
              {syncNotification.includes("saved") && <Check className="w-4 h-4 text-green-400" />}
              {syncNotification.includes("deleted") && <Trash2 className="w-4 h-4 text-red-400" />}
              {syncNotification.includes("skipped") && <AlertTriangle className="w-4 h-4 text-gray-400" />}
              {syncNotification}
            </p>
          </div>
        </div>
      )}

      {/* Non-blocking Upload Status Pill */}
      {isUploading && (
        <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-md py-3 px-5 rounded-2xl shadow-xl border border-gray-200/50 min-w-[200px]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Uploading...</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 tabular-nums">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Fullscreen Viewer */}
      {fullscreenPhoto && (
        <div
          className={`fixed inset-0 z-[100] transition-all duration-300 ease-out ${
            fullscreenVisible
              ? "bg-black/95 backdrop-blur-xl"
              : "bg-black/0 backdrop-blur-none"
          }`}
          onClick={closeFullscreen}
        >
          {/* Glassmorphism Header */}
          <div
            className={`absolute top-0 left-0 right-0 z-10 transition-all duration-300 ${
              fullscreenVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white/10 backdrop-blur-2xl border-b border-white/10">
              <div className="flex items-center justify-between p-4 safe-top">
                <button
                  onClick={closeFullscreen}
                  className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                  <span className="text-sm font-medium">Back</span>
                </button>
                <div className="flex items-center gap-1">
                  <button 
                    className="p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
                    onClick={() => {
                        setSyncNotification("Favorites coming soon");
                        setTimeout(() => setSyncNotification(null), 2000);
                    }}
                  >
                    <Heart className="w-5 h-5" />
                  </button>
                  <button 
                    className="p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
                    onClick={() => handleShareClick(photos.find(p => p.id === fullscreenPhoto))}
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button 
                    className="p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
                    onClick={() => {
                        setSyncNotification("Info view coming soon");
                        setTimeout(() => setSyncNotification(null), 2000);
                    }}
                  >
                    <Info className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Image Container */}
          <div
            className={`absolute inset-0 flex items-center justify-center p-4 pt-20 pb-28 transition-all duration-300 ${
              fullscreenVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {isLoadingFullscreen ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <p className="text-white/60 text-sm font-medium">Decrypting...</p>
              </div>
            ) : fullscreenImageUrl ? (
              <img
                src={fullscreenImageUrl}
                alt="Photo"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div className="text-center p-10 bg-white/5 backdrop-blur-md rounded-2xl">
                <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                <p className="text-white font-medium">Unable to load photo</p>
                <p className="text-white/50 text-sm mt-1">Please try again</p>
              </div>
            )}
          </div>

          {/* Glassmorphism Footer Actions */}
          <div
            className={`absolute bottom-0 left-0 right-0 z-10 transition-all duration-300 ${
              fullscreenVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white/10 backdrop-blur-2xl border-t border-white/10 safe-bottom">
              <div className="flex items-center justify-around py-4 px-6">
                <button
                  className="flex flex-col items-center gap-1.5 text-white/80 hover:text-white transition-colors min-w-[64px]"
                  onClick={() => {
                    const photo = photos.find((p) => p.id === fullscreenPhoto);
                    if (photo) downloadPhoto(photo);
                  }}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Download className="w-6 h-6" />
                  )}
                  <span className="text-xs font-medium">Save</span>
                </button>

                <button 
                  className="flex flex-col items-center gap-1.5 text-white/80 hover:text-white transition-colors min-w-[64px]"
                  onClick={() => handleShareClick(photos.find(p => p.id === fullscreenPhoto))}
                >
                  <Share2 className="w-6 h-6" />
                  <span className="text-xs font-medium">Share</span>
                </button>

                <button
                  className="flex flex-col items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors min-w-[64px]"
                  onClick={async () => {
                    const photo = photos.find((p) => p.id === fullscreenPhoto);
                    if (!photo) return;

                    if (confirm("Delete this photo permanently?")) {
                      try {
                        const isPlaceholder = photo.id.startsWith('photo-');
                        if (isPlaceholder) {
                          setSyncNotification("Demo photo cannot be deleted");
                          setTimeout(() => setSyncNotification(null), 2000);
                          return;
                        }

                        if (photo.metadata) {
                          await deletePhoto({
                            cid: photo.metadata.cid,
                            id: photo.metadata.id
                          });
                          closeFullscreen();
                          setSyncNotification("Photo deleted");
                          setTimeout(() => setSyncNotification(null), 2000);
                        }
                      } catch (e) {
                        console.error("Delete failed", e);
                        setSyncNotification("Failed to delete photo");
                        setTimeout(() => setSyncNotification(null), 2000);
                      }
                    }
                  }}
                >
                  <Trash2 className="w-6 h-6" />
                  <span className="text-xs font-medium">Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateBurnerLinkDialog 
        isOpen={showBurnerDialog}
        onClose={() => setShowBurnerDialog(false)}
        onLinkCreated={() => {
            // Optional: refresh something explicitly if needed, but react-query should handle it
        }}
        vaultKeyBytes={secretKey}
      />

      {/* Share Dialog */}
      <SecureShareDialog 
         isOpen={showShareDialog} 
         onClose={() => setShowShareDialog(false)}
         photo={photoToShare}
         secretKey={secretKey}
       />

      {/* Hidden upload input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
