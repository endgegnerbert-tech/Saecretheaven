"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Link as LinkIcon, Clock, AlertTriangle } from "lucide-react";
import { destroyBurnerKey, findKeyIdByPublicKey } from "@/lib/crypto-asymmetric";

interface ManageBurnerLinksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface BurnerLink {
  id: string;
  slug: string;
  theme: string;
  created_at: string;
  expires_at: string | null;
  upload_count: number;
  max_uploads: number | null;
  is_active: boolean;
  public_key: string;
}

export function ManageBurnerLinksDialog({ isOpen, onClose, userId }: ManageBurnerLinksDialogProps) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["burnerLinks", userId],
    queryFn: async () => {
      const res = await fetch("/api/burner/create"); // GET lists links
      if (!res.ok) throw new Error("Failed to load links");
      return (await res.json()).links as BurnerLink[];
    },
    enabled: isOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: async (link: BurnerLink) => {
      // 1. Deactivate on server
      const res = await fetch(`/api/burner/create?slug=${link.slug}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete link");

      // 2. Crypto-Shred: Destroy local private key
      // We need to find the Key ID that matches this link's public key
      const keyId = findKeyIdByPublicKey(link.public_key);
      if (keyId) {
          destroyBurnerKey(keyId);
          console.log("Crypto-shredded key for link:", link.slug);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["burnerLinks"] });
      queryClient.invalidateQueries({ queryKey: ["burnerUploads"] }); // Also refresh uploads
    },
  });

  const handleDelete = async (link: BurnerLink) => {
      // Feature disabled per user request
      alert("Secure Shredding (Delete Everywhere) is coming soon.\n\nYour link and photos are preserved.");
      return; 
      
      /* 
      if (!confirm("Delete this link? Users relying on it will get 404. Key will be destroyed.")) return;
      setDeletingId(link.id);
      try {
          await deleteMutation.mutateAsync(link);
      } catch (e) {
          console.error(e);
          alert("Failed to delete");
      } finally {
          setDeletingId(null);
      }
      */
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl z-[200]">
        <DialogHeader>
          <DialogTitle>Active Burner Links</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : links.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <LinkIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No active links</p>
                </div>
            ) : (
                links.map(link => (
                    <div key={link.id} className={`p-4 rounded-xl border ${link.is_active ? 'border-gray-100 bg-gray-50' : 'border-red-100 bg-red-50 opacity-60'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    {link.theme} 
                                    <span className="text-xs font-normal text-gray-500">/{link.slug.slice(0,8)}...</span>
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(link.created_at).toLocaleDateString()}
                                    {link.expires_at && ` • Exp: ${new Date(link.expires_at).toLocaleDateString()}`}
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                onClick={() => handleDelete(link)}
                                title="Secure Shredding Coming Soon"
                            >
                                <Trash2 className="w-4 h-4 opacity-50" />
                            </Button>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2 bg-white p-2 rounded-lg border border-gray-100">
                            <span>Uploads: {link.upload_count} / {link.max_uploads || '∞'}</span>
                            <span className={link.is_active ? "text-green-600 font-medium" : "text-red-600"}>
                                {link.is_active ? "Active" : "Inactive"}
                            </span>
                        </div>
                    </div>
                ))
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
