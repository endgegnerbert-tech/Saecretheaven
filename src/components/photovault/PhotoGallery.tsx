"use client";

import { useState, useRef } from "react";
import { Search, SlidersHorizontal, X, Check, Lock, Upload } from "lucide-react";
import { useEncryption } from "@/hooks/use-encryption";
import { useGalleryData } from "@/hooks/use-gallery-data";

interface PhotoGalleryProps {
  photosCount: number;
}

// Generate placeholder photo URLs with dates
const generatePhotos = (count: number) => {
  const categories = [
    "nature", "architecture", "travel", "food", "animals",
    "city", "landscape", "portrait", "ocean", "forest"
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
      date: date.toISOString().split('T')[0],
      metadata: undefined as any, // Placeholder photos don't have metadata
    };
  });
};

// Group photos by date
const groupPhotosByDate = (photos: ReturnType<typeof generatePhotos>) => {
  const groups: { [key: string]: typeof photos } = {};
  photos.forEach(photo => {
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
  
  if (dateStr === today.toISOString().split('T')[0]) {
    return "Heute";
  } else if (dateStr === yesterday.toISOString().split('T')[0]) {
    return "Gestern";
  } else {
    return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
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
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Encryption & Real Photo Storage
  const { secretKey, hasKey } = useEncryption();
  const { 
    photos: realPhotos, 
    uploadPhoto, 
    deletePhoto: deleteRealPhoto,
    decryptPhoto,
    isUploading 
  } = useGalleryData(secretKey);

  // Use real photos if available, otherwise use placeholders
  const photos = realPhotos.length > 0 
    ? realPhotos.map(p => ({
        id: p.id?.toString() || p.cid,
        cid: p.cid,
        placeholderUrl: '', // Will be decrypted on-demand
        category: 'photo',
        date: p.uploadedAt.toISOString().split('T')[0],
        metadata: p, // Add metadata to identify real photos
      }))
    : generatePhotos(Math.min(photosCount, 50));
  
  const photoGroups = groupPhotosByDate(photos);

  const filteredPhotos = photos.filter(photo => {
    if (selectedFilter && photo.category !== selectedFilter) return false;
    if (searchQuery && !photo.category.includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredGroups = groupPhotosByDate(filteredPhotos);

  const handlePhotoTap = (photoId: string, cid: string) => {
    if (selectMode) {
      setSelectedPhotos(prev => {
        const newSet = new Set(prev);
        if (newSet.has(photoId)) {
          newSet.delete(photoId);
        } else {
          newSet.add(photoId);
        }
        return newSet;
      });
    } else {
      console.log("TODO: Show full photo from IPFS CID:", cid);
      setFullscreenPhoto(photoId);
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
    files.forEach(file => uploadPhoto(file));
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      {/* Header */}
      <header className="h-[60px] bg-white border-b border-[#E5E5EA] px-4 flex items-center justify-between shrink-0">
        {showSearch ? (
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 bg-[#E5E5EA] rounded-lg px-3 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-[#8E8E93]" />
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
                console.log("TODO: Delete selected photos", Array.from(selectedPhotos));
              }}
              className="text-[17px] text-[#FF3B30] ios-tap-target"
            >
              Löschen
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#30D158]" />
              <h1 className="sf-pro-display text-[20px] text-[#1D1D1F]">Galerie</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Upload Button */}
              <label className="ios-tap-target cursor-pointer">
                <Upload className={`w-6 h-6 ${isUploading ? 'text-[#8E8E93] animate-pulse' : 'text-[#007AFF]'}`} />
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
                <Search className="w-6 h-6 text-[#007AFF]" />
              </button>
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="ios-tap-target"
              >
                <SlidersHorizontal className={`w-6 h-6 ${selectedFilter ? "text-[#30D158]" : "text-[#007AFF]"}`} />
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
              <p className="text-[13px] font-semibold text-[#6E6E73]">{group.label}</p>
            </div>
            
            {/* Photos Grid */}
            <div className="grid grid-cols-3 gap-[2px] px-[2px]">
              {group.photos.map((photo) => {
                // For real encrypted photos, we need to decrypt them
                const isRealPhoto = photo.metadata !== undefined;
                
                return (
                  <button
                    key={photo.id}
                    onClick={() => handlePhotoTap(photo.id, photo.cid)}
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
                      // Real encrypted photo - show placeholder until decryption
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E5E5EA] to-[#C7C7CC]">
                        <Lock className="w-8 h-8 text-[#8E8E93]" />
                      </div>
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
            {photos.length} Fotos verschlüsselt gespeichert
          </p>
        </div>
      </div>

      {/* Fullscreen Photo View */}
      {fullscreenPhoto && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <header className="h-[60px] flex items-center justify-between px-4 bg-black/80">
            <button
              onClick={() => setFullscreenPhoto(null)}
              className="ios-tap-target"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <span className="text-[17px] text-white">
              Foto {photos.findIndex(p => p.id === fullscreenPhoto) + 1} von {photos.length}
            </span>
            <div className="w-10" />
          </header>
          <div className="flex-1 flex items-center justify-center p-4">
            {(() => {
              const photo = photos.find(p => p.id === fullscreenPhoto);
              if (!photo) return null;
              
              // Real encrypted photo
              if (photo.metadata) {
                return (
                  <div className="flex flex-col items-center gap-4">
                    <Lock className="w-16 h-16 text-white/60" />
                    <p className="text-white/80 text-center">
                      Entschlüsselung wird implementiert...
                    </p>
                  </div>
                );
              }
              
              // Placeholder photo
              if (photo.placeholderUrl) {
                return (
                  <img
                    src={photo.placeholderUrl}
                    alt=""
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                );
              }
              
              return null;
            })()}
          </div>
          <footer className="h-[80px] flex items-center justify-center bg-black/80">
            <div className="flex items-center gap-2 text-[13px] text-white/60">
              <Lock className="w-4 h-4" />
              <span>Ende-zu-Ende verschlüsselt</span>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
