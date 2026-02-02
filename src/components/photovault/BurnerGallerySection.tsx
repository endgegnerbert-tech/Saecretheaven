"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Lock,
  AlertTriangle,
  Settings,
  Smartphone,
  CloudUpload,
  Trash2,
  X,
  Clock,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  findKeyIdByPublicKey,
  loadBurnerKeyPair,
  decryptFileFromBurner,
  importVaultKey,
} from "@/lib/crypto-asymmetric";
import { encryptFile, getUserKeyHash } from "@/lib/crypto";
import { savePhoto, type PhotoMetadata } from "@/lib/storage/local-db";
import { uploadCIDMetadata } from "@/lib/supabase";
import { remoteStorage } from "@/lib/storage/remote-storage";
import { getDeviceId } from "@/lib/deviceId";
import type { StealthUpload, BurnerLink } from "@/lib/supabase";
import { ManageBurnerLinksDialog } from "./ManageBurnerLinksDialog";

// Auto-delete timer: 24 hours
const AUTO_DELETE_HOURS = 24;

interface BurnerGallerySectionProps {
  userId: string;
  vaultKeyBytes: Uint8Array | null;
  onOpenPairing?: () => void;
}

type EnrichedUpload = StealthUpload & {
  burner_links: BurnerLink;
  salt: string;
  ephemeral_public_key: string;
  iv: string;
};

type ErrorType = "missing_key" | "decrypt_failed" | "download_failed" | "other";

interface UploadError {
  type: ErrorType;
  message: string;
}

// Store decrypted blobs in memory for re-encryption
const decryptedBlobCache = new Map<string, Blob>();

export function BurnerGallerySection({
  userId,
  vaultKeyBytes,
  onOpenPairing,
}: BurnerGallerySectionProps) {
  const queryClient = useQueryClient();
  const [decryptedUrls, setDecryptedUrls] = useState<Record<string, string>>({});
  const [decryptingIds, setDecryptingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, UploadError>>({});
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState<EnrichedUpload | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [userKeyHash, setUserKeyHash] = useState<string | null>(null);

  // Generate user key hash for vault uploads
  useEffect(() => {
    if (vaultKeyBytes) {
      importVaultKey(vaultKeyBytes).then(setVaultKey).catch(console.error);
      getUserKeyHash(vaultKeyBytes).then(setUserKeyHash).catch(console.error);
    } else {
      setVaultKey(null);
      setUserKeyHash(null);
    }
  }, [vaultKeyBytes]);

  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ["burnerUploads", userId],
    queryFn: async () => {
      const response = await fetch("/api/burner/uploads");
      if (!response.ok) throw new Error("Failed to fetch uploads");
      const data = await response.json();
      return data.uploads as EnrichedUpload[];
    },
  });

  // Calculate time remaining before auto-delete
  const getTimeRemaining = useCallback((uploadedAt: string) => {
    const uploadTime = new Date(uploadedAt).getTime();
    const deleteTime = uploadTime + AUTO_DELETE_HOURS * 60 * 60 * 1000;
    const now = Date.now();
    const remaining = deleteTime - now;

    if (remaining <= 0) return "Expiring soon";

    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  }, []);

  const handleDecrypt = async (upload: EnrichedUpload) => {
    if (decryptedUrls[upload.id]) {
      setSelectedUpload(upload);
      setShowDecisionModal(true);
      return;
    }

    setDecryptingIds((prev) => new Set(prev).add(upload.id));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[upload.id];
      return newErrors;
    });

    try {
      if (!vaultKey) throw new Error("Vault locked");
      if (!upload.burner_links?.public_key) {
        throw new Error("Missing burner link key info");
      }

      const keyId = findKeyIdByPublicKey(upload.burner_links.public_key);
      if (!keyId) {
        setErrors((prev) => ({
          ...prev,
          [upload.id]: { type: "missing_key", message: "Key not on this device" },
        }));
        return;
      }

      const keyData = await loadBurnerKeyPair(keyId, vaultKey);
      if (!keyData) {
        setErrors((prev) => ({
          ...prev,
          [upload.id]: { type: "missing_key", message: "Key decryption failed" },
        }));
        return;
      }

      const blob = await remoteStorage.download(upload.cid);
      if (!blob) {
        setErrors((prev) => ({
          ...prev,
          [upload.id]: { type: "download_failed", message: "Download failed" },
        }));
        return;
      }

      const decryptedBlob = await decryptFileFromBurner(
        blob,
        upload.ephemeral_public_key,
        upload.iv,
        upload.salt,
        keyData.privateKey
      );

      // Cache the decrypted blob for re-encryption
      decryptedBlobCache.set(upload.id, decryptedBlob);

      const url = URL.createObjectURL(decryptedBlob);
      setDecryptedUrls((prev) => ({ ...prev, [upload.id]: url }));

      setSelectedUpload(upload);
      setShowDecisionModal(true);
    } catch (err) {
      console.error("Decryption error:", err);
      setErrors((prev) => ({
        ...prev,
        [upload.id]: {
          type: "decrypt_failed",
          message: err instanceof Error ? err.message : "Decryption failed",
        },
      }));
    } finally {
      setDecryptingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(upload.id);
        return newSet;
      });
    }
  };

  // Import to Vault: Re-encrypt with vault key and save to main gallery
  const handleImportToVault = async (upload: EnrichedUpload) => {
    if (!vaultKeyBytes || !userKeyHash) {
      alert("Vault is locked. Please unlock first.");
      return;
    }

    setIsImporting(true);

    try {
      // 1. Get the decrypted blob from cache
      const decryptedBlob = decryptedBlobCache.get(upload.id);
      if (!decryptedBlob) {
        throw new Error("Photo not decrypted. Please try again.");
      }

      // 2. Convert blob to File for encryption
      const file = new File([decryptedBlob], `burner_${upload.id}.jpg`, {
        type: decryptedBlob.type || "image/jpeg",
      });

      console.log("[Import] Starting vault import:", file.name);

      // 3. Re-encrypt with vault key (same as regular upload)
      const { encrypted, nonce } = await encryptFile(file, vaultKeyBytes);
      console.log("[Import] Re-encrypted with vault key");

      // 4. Upload encrypted blob to IPFS
      let cid: string;
      try {
        cid = await remoteStorage.upload(encrypted, file.name);
        console.log("[Import] Uploaded to IPFS:", cid);
      } catch (error) {
        console.error("[Import] IPFS upload failed:", error);
        cid = `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        console.log("[Import] Using fallback CID:", cid);
      }

      // 5. Save to local IndexedDB
      const metadata: Omit<PhotoMetadata, "id"> = {
        cid,
        nonce,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        uploadedAt: new Date(),
        encryptedBlob: encrypted,
      };

      await savePhoto(metadata);
      console.log("[Import] Saved to IndexedDB");

      // 6. Sync metadata to Supabase
      const deviceId = getDeviceId();
      try {
        await uploadCIDMetadata(cid, file.size, deviceId, nonce, file.type, userKeyHash);
        console.log("[Import] Synced to Supabase");
      } catch (error) {
        console.error("[Import] Supabase sync failed (local + IPFS OK):", error);
      }

      // 7. Delete the original burner upload
      await deleteUploadMutation.mutateAsync(upload.id);
      console.log("[Import] Deleted burner upload");

      // 8. Clean up cache
      decryptedBlobCache.delete(upload.id);
      if (decryptedUrls[upload.id]) {
        URL.revokeObjectURL(decryptedUrls[upload.id]);
        setDecryptedUrls((prev) => {
          const newUrls = { ...prev };
          delete newUrls[upload.id];
          return newUrls;
        });
      }

      // 9. Refresh photos query
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["photoCount"] });

      setShowDecisionModal(false);
      setSelectedUpload(null);

      // Show success feedback
      console.log("[Import] Successfully imported to vault!");
    } catch (err) {
      console.error("[Import] Failed:", err);
      alert(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Delete permanently
  const deleteUploadMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      const res = await fetch(`/api/burner/uploads?id=${uploadId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete upload");
    },
    onSuccess: (_, uploadId) => {
      // Clean up cache and URLs
      decryptedBlobCache.delete(uploadId);
      if (decryptedUrls[uploadId]) {
        URL.revokeObjectURL(decryptedUrls[uploadId]);
        setDecryptedUrls((prev) => {
          const newUrls = { ...prev };
          delete newUrls[uploadId];
          return newUrls;
        });
      }
      queryClient.invalidateQueries({ queryKey: ["burnerUploads"] });
      setShowDecisionModal(false);
      setSelectedUpload(null);
    },
  });

  const handleDeletePermanently = async (upload: EnrichedUpload) => {
    if (
      !confirm(
        "Delete this photo permanently?\n\nThis will remove it from all devices and cannot be undone."
      )
    ) {
      return;
    }
    deleteUploadMutation.mutate(upload.id);
  };

  // Empty state
  if (uploads.length === 0 && !isLoading) {
    return (
      <div className="mt-8 mb-4 px-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-600" />
            Stealth Drop
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setShowManageDialog(true)}>
            <Settings className="w-4 h-4 text-gray-400" />
          </Button>
        </div>
        <p className="text-sm text-gray-500">No incoming photos yet.</p>

        <ManageBurnerLinksDialog
          isOpen={showManageDialog}
          onClose={() => setShowManageDialog(false)}
          userId={userId}
        />
      </div>
    );
  }

  if (uploads.length === 0 && isLoading) return null;

  return (
    <div className="mt-8 mb-4">
      <div className="flex items-center justify-between px-5 mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-purple-600" />
          Stealth Drop
          {uploads.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
              {uploads.length} new
            </span>
          )}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setShowManageDialog(true)}>
          <Settings className="w-4 h-4 text-gray-400" />
        </Button>
      </div>

      {/* Notification Banner */}
      <div className="mx-5 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Action Required</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Tap each photo to decide: Import to your vault or delete permanently.
              Undecided photos auto-delete after {AUTO_DELETE_HOURS}h.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-0.5 sm:gap-2 px-0.5 sm:px-5">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="aspect-square relative bg-gray-100 overflow-hidden group"
          >
            {decryptedUrls[upload.id] ? (
              <>
                <img
                  src={decryptedUrls[upload.id]}
                  alt="Decrypted"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => {
                    setSelectedUpload(upload);
                    setShowDecisionModal(true);
                  }}
                />
                {/* Timer overlay */}
                <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {getTimeRemaining(upload.uploaded_at)}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                <Lock className="w-8 h-8 text-gray-300 mb-2" />

                {decryptingIds.has(upload.id) ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                ) : errors[upload.id] ? (
                  errors[upload.id].type === "missing_key" ? (
                    <div className="flex flex-col items-center">
                      <Smartphone className="w-5 h-5 text-blue-500 mb-1" />
                      <span className="text-[10px] text-blue-600 leading-tight mb-1">
                        Key on another device
                      </span>
                      {onOpenPairing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] text-blue-600 hover:bg-blue-50 p-1"
                          onClick={onOpenPairing}
                        >
                          Connect Device
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <AlertTriangle className="w-5 h-5 text-red-500 mb-1" />
                      <span className="text-[10px] text-red-500 leading-tight">
                        {errors[upload.id].message}
                      </span>
                    </div>
                  )
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs bg-white/50 backdrop-blur-sm hover:bg-white/80"
                    onClick={() => handleDecrypt(upload)}
                  >
                    Tap to Unlock
                  </Button>
                )}

                {/* Timer for locked photos */}
                <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/40 rounded text-[9px] text-white flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {getTimeRemaining(upload.uploaded_at)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Burner Decision Modal */}
      {showDecisionModal && selectedUpload && decryptedUrls[selectedUpload.id] && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Stealth Photo</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {getTimeRemaining(selectedUpload.uploaded_at)} before auto-delete
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDecisionModal(false);
                  setSelectedUpload(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Photo Preview */}
            <div className="relative bg-gray-100">
              <img
                src={decryptedUrls[selectedUpload.id]}
                alt="Decrypted"
                className="w-full max-h-[50vh] object-contain"
              />
            </div>

            {/* Meta Info */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <Lock className="w-3 h-3" />
                <span>Received {new Date(selectedUpload.uploaded_at).toLocaleString()}</span>
              </div>

              {/* Decision Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={() => handleImportToVault(selectedUpload)}
                  disabled={isImporting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl flex items-center justify-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      Import to Vault
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleDeletePermanently(selectedUpload)}
                  variant="outline"
                  disabled={deleteUploadMutation.isPending || isImporting}
                  className="w-full h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                >
                  {deleteUploadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Permanently
                    </>
                  )}
                </Button>
              </div>

              <p className="text-[10px] text-gray-400 text-center mt-3">
                Import saves the photo encrypted with your vault key.
                <br />
                Delete removes it from all devices forever.
              </p>
            </div>
          </div>
        </div>
      )}

      <ManageBurnerLinksDialog
        isOpen={showManageDialog}
        onClose={() => setShowManageDialog(false)}
        userId={userId}
      />
    </div>
  );
}
