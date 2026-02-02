"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Copy,
  Check,
  Plus,
  ExternalLink,
  Camera,
  Utensils,
  CloudSun,
  Leaf,
  Dumbbell,
  FileText,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  generateStorableBurnerKeyPair,
  saveBurnerKeyPair,
  buildBurnerLinkUrl,
  importVaultKey,
} from "@/lib/crypto-asymmetric";

// Theme configuration (duplicated from Panel for now, ideally shared config)
interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  icon: typeof Camera;
  color: string;
  disabled?: boolean;
}

const THEMES: ThemeConfig[] = [
  {
    id: "direct",
    name: "Direct Camera",
    description: "Opens camera directly",
    icon: Camera,
    color: "bg-blue-500",
  },
  {
    id: "recipes",
    name: "Recipe Blog",
    description: "Looks like a food blog",
    icon: Utensils,
    color: "bg-orange-500",
  },
  {
    id: "weather",
    name: "Weather App",
    description: "Looks like a weather app",
    icon: CloudSun,
    color: "bg-sky-500",
  },
  {
    id: "garden",
    name: "Garden Tips",
    description: "Looks like a plant care app",
    icon: Leaf,
    color: "bg-green-500",
  },
  {
    id: "fitness",
    name: "Fitness Tracker",
    description: "Looks like a workout app",
    icon: Dumbbell,
    color: "bg-purple-500",
    disabled: true,
  },
  {
    id: "notes",
    name: "Notes",
    description: "Looks like a notes app",
    icon: FileText,
    color: "bg-slate-500",
    disabled: true,
  },
];

const CONTENT_SLUGS: Record<string, { slug: string; name: string }[]> = {
  direct: [{ slug: "capture", name: "Quick Upload" }],
  recipes: [
    { slug: "apple-pie", name: "Apple Pie" },
    { slug: "chocolate-cake", name: "Chocolate Cake" },
  ],
  weather: [
    { slug: "sunny-forecast", name: "Sunny" },
    { slug: "cloudy-day", name: "Cloudy" },
  ],
  garden: [
    { slug: "monstera-care", name: "Monstera Care" },
    { slug: "succulent-guide", name: "Succulents" },
  ],
  fitness: [{ slug: "workout", name: "Workout" }],
  notes: [{ slug: "quick-note", name: "Quick Note" }],
};

interface CreateBurnerLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkCreated?: () => void; // Callback to refresh list
  vaultKeyBytes: Uint8Array | null;
}

export function CreateBurnerLinkDialog({
  isOpen,
  onClose,
  onLinkCreated,
  vaultKeyBytes,
}: CreateBurnerLinkDialogProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>("direct");
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [maxUploads, setMaxUploads] = useState<number | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<{ url: string; slug: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);

  useEffect(() => {
    if (vaultKeyBytes) {
      importVaultKey(vaultKeyBytes).then(setVaultKey).catch(console.error);
    } else {
      setVaultKey(null);
    }
  }, [vaultKeyBytes]);

  // Set default content when theme changes
  useEffect(() => {
    const contents = CONTENT_SLUGS[selectedTheme];
    if (contents && contents.length > 0) {
      setSelectedContent(contents[0].slug);
    }
  }, [selectedTheme]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setCreatedLink(null);
      setSelectedTheme("direct");
      setIsCreating(false);
      setError(null);
    }
  }, [isOpen]);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    try {
        if (!vaultKey) throw new Error("Vault locked");

      // Generate keypair
      const keyPair = await generateStorableBurnerKeyPair();

      // Save keypair locally (Encrypted with Vault Key)
      await saveBurnerKeyPair(keyPair.id, keyPair.publicKey, keyPair.privateKeyJwk, vaultKey);

      // Create burner link via API
      const response = await fetch("/api/burner/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: keyPair.publicKey,
          theme: selectedTheme,
          contentSlug: selectedContent || "default",
          maxUploads: maxUploads || undefined,
          expiresIn: expiresIn || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create link");
      }

      const data = await response.json();

      // Build full URL with public key in fragment
      const baseUrl = window.location.origin;
      const fullUrl = buildBurnerLinkUrl(
        baseUrl,
        selectedTheme,
        selectedContent || "default",
        data.slug,
        keyPair.publicKey
      );

      setCreatedLink({ url: fullUrl, slug: data.slug });
      if (onLinkCreated) onLinkCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto z-[200]">
        <div className="p-6">
          <DialogHeader className="mb-4">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <DialogTitle className="text-center text-xl">New Burner Link</DialogTitle>
            <DialogDescription className="text-center">
              Create an anonymous upload link.
            </DialogDescription>
          </DialogHeader>

          {createdLink ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Link Created!</h2>
                <p className="text-sm text-gray-500">Share this link with your contact</p>
              </div>

              {/* QR Code */}
              <div className="bg-white rounded-2xl p-6 flex flex-col items-center border border-gray-100">
                <QRCodeSVG value={createdLink.url} size={200} level="M" />
                <p className="text-xs text-gray-400 mt-4 text-center break-all">
                  {createdLink.url.slice(0, 50)}...
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(createdLink.url);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl flex items-center justify-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Copy Link
                </Button>

                <Button
                  onClick={() => window.open(createdLink.url, "_blank")}
                  variant="outline"
                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Open Link
                </Button>

                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="w-full h-12 rounded-xl"
                >
                  Done
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Device-Only Key</p>
                    <p className="text-xs text-blue-700 mt-1">
                      The private key is only stored on this device.
                      Only you can decrypt the received photos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Theme Selection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Choose Disguise</h3>
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map((theme) => {
                    const Icon = theme.icon;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => !theme.disabled && setSelectedTheme(theme.id)}
                        disabled={theme.disabled}
                        className={`p-4 rounded-xl text-left transition-all ${
                          theme.disabled
                            ? "bg-gray-100 opacity-50 cursor-not-allowed"
                            : selectedTheme === theme.id
                            ? "bg-blue-50 ring-2 ring-blue-500"
                            : "bg-white hover:bg-gray-50 border border-gray-100"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl ${theme.color} flex items-center justify-center mb-2`}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="font-medium text-gray-900 text-sm">{theme.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Options */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Options</h3>
                <div className="space-y-3">
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Max. Uploads</p>
                        <p className="text-xs text-gray-500">Limits the number</p>
                      </div>
                      <select
                        value={maxUploads || ""}
                        onChange={(e) =>
                          setMaxUploads(e.target.value ? parseInt(e.target.value) : null)
                        }
                        className="bg-gray-100 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Unlimited</option>
                        <option value="1">1 Upload</option>
                        <option value="5">5 Uploads</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl"
                >
                  {isCreating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Create
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
