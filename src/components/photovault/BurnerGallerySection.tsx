"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, AlertTriangle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
    findKeyIdByPublicKey, 
    loadBurnerKeyPair, 
    decryptFileFromBurner, 
    importVaultKey 
} from "@/lib/crypto-asymmetric";
import { remoteStorage } from "@/lib/storage/remote-storage";
import type { StealthUpload, BurnerLink } from "@/lib/supabase";
import { ManageBurnerLinksDialog } from "./ManageBurnerLinksDialog";

interface BurnerGallerySectionProps {
  userId: string;
  vaultKeyBytes: Uint8Array | null;
}

// Extends StealthUpload to include the joined burner_link info
type EnrichedUpload = StealthUpload & {
  burner_links: BurnerLink;
  salt: string;
  ephemeral_public_key: string;
  iv: string;
};

export function BurnerGallerySection({ userId, vaultKeyBytes }: BurnerGallerySectionProps) {
  const [decryptedUrls, setDecryptedUrls] = useState<Record<string, string>>({});
  const [decryptingIds, setDecryptingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [showManageDialog, setShowManageDialog] = useState(false);

  useEffect(() => {
    if (vaultKeyBytes) {
      importVaultKey(vaultKeyBytes).then(setVaultKey).catch(console.error);
    } else {
      setVaultKey(null);
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

  const handleDecrypt = async (upload: EnrichedUpload) => {
    if (decryptedUrls[upload.id]) return; // Already decrypted

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

      // 1. Find matching private key locally
      const keyId = findKeyIdByPublicKey(upload.burner_links.public_key);
      if (!keyId) throw new Error("Key shred or missing");

      const keyData = await loadBurnerKeyPair(keyId, vaultKey);
      if (!keyData) {
        throw new Error("Private key missing or decryption failed");
      }

      // 2. Download from IPFS
      const blob = await remoteStorage.download(upload.cid);
      if (!blob) throw new Error("Download failed");

      // 3. Decrypt
      const decryptedBlob = await decryptFileFromBurner(
        blob,
        upload.ephemeral_public_key,
        upload.iv,
        upload.salt,
        keyData.privateKey
      );

      const url = URL.createObjectURL(decryptedBlob);
      setDecryptedUrls((prev) => ({ ...prev, [upload.id]: url }));
    } catch (err) {
      console.error("Decryption error:", err);
      setErrors((prev) => ({ 
        ...prev, 
        [upload.id]: err instanceof Error ? err.message : "Decryption failed" 
      }));
    } finally {
      setDecryptingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(upload.id);
        return newSet;
      });
    }
  };

  // If no uploads, check if we might want to show Manage button
  if (uploads.length === 0 && !isLoading) {
      // Return just the header with manage button? 
      // User asked for "Burner Pictures" section.
      // If empty, user might still want to manage links.
      return (
        <div className="mt-8 mb-4 px-5">
           <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-purple-600" />
                    Burner Pictures
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowManageDialog(true)}>
                    <Settings className="w-4 h-4 text-gray-400" />
                </Button>
            </div>
            <p className="text-sm text-gray-500">No uploads yet.</p>

            <ManageBurnerLinksDialog 
                isOpen={showManageDialog}
                onClose={() => setShowManageDialog(false)}
                userId={userId}
            />
        </div>
      );
  }

  if (uploads.length === 0 && isLoading) return null; // Or loader

  return (
    <div className="mt-8 mb-4">
      <div className="flex items-center justify-between px-5 mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-purple-600" />
          Burner Pictures
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setShowManageDialog(true)}>
            <Settings className="w-4 h-4 text-gray-400" />
        </Button>
      </div>
      
      <div className="grid grid-cols-3 gap-0.5 sm:gap-2 px-0.5 sm:px-5">
        {uploads.map((upload) => (
          <div 
            key={upload.id} 
            className="aspect-square relative bg-gray-100 overflow-hidden group"
          >
            {decryptedUrls[upload.id] ? (
              <img 
                src={decryptedUrls[upload.id]} 
                alt="Decrypted" 
                className="w-full h-full object-cover"
                onClick={() => window.open(decryptedUrls[upload.id], '_blank')} 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                <Lock className="w-8 h-8 text-gray-300 mb-2" />
                
                {decryptingIds.has(upload.id) ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                ) : errors[upload.id] ? (
                    <div className="flex flex-col items-center">
                        <AlertTriangle className="w-5 h-5 text-red-500 mb-1" />
                        <span className="text-[10px] text-red-500 leading-tight">Key Error</span>
                    </div>
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
                
                <span className="text-[10px] text-gray-400 absolute bottom-1 right-1">
                    {new Date(upload.uploaded_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <ManageBurnerLinksDialog 
        isOpen={showManageDialog}
        onClose={() => setShowManageDialog(false)}
        userId={userId}
      />
    </div>
  );
}
