'use client';

/**
 * BurnerLinksPanel - Stealth Drop Management UI
 *
 * Allows users to:
 * - Create new burner links with different themes
 * - View existing burner links with QR codes
 * - See received anonymous uploads
 * - Decrypt and view stealth uploads
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Link2,
  Plus,
  Copy,
  Check,
  Trash2,
  QrCode,
  Camera,
  ChevronRight,
  ChevronLeft,
  Download,
  Eye,
  Clock,
  Upload,
  X,
  Loader2,
  AlertTriangle,
  Lock,
  Utensils,
  CloudSun,
  Leaf,
  Dumbbell,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { loadKeyFromStorage } from '@/lib/crypto';
import {
  generateStorableBurnerKeyPair,
  saveBurnerKeyPair,
  loadBurnerKeyPair,
  loadAllBurnerKeyPairs,
  decryptFileFromBurner,
  buildBurnerLinkUrl,
  importVaultKey,
} from '@/lib/crypto-asymmetric';
import type { BurnerLink, StealthUpload } from '@/lib/supabase';

// Theme configuration
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
    id: 'direct',
    name: 'Direct Camera',
    description: 'Opens camera directly',
    icon: Camera,
    color: 'bg-blue-500',
  },
  {
    id: 'recipes',
    name: 'Recipe Blog',
    description: 'Looks like a food blog',
    icon: Utensils,
    color: 'bg-orange-500',
  },
  {
    id: 'weather',
    name: 'Weather App',
    description: 'Looks like a weather app',
    icon: CloudSun,
    color: 'bg-sky-500',
  },
  {
    id: 'garden',
    name: 'Garden Tips',
    description: 'Looks like a plant care app',
    icon: Leaf,
    color: 'bg-green-500',
  },
  {
    id: 'fitness',
    name: 'Fitness Tracker',
    description: 'Looks like a workout app',
    icon: Dumbbell,
    color: 'bg-purple-500',
    disabled: true,
  },
  {
    id: 'notes',
    name: 'Notes',
    description: 'Looks like a notes app',
    icon: FileText,
    color: 'bg-slate-500',
    disabled: true,
  },
];

const CONTENT_SLUGS: Record<string, { slug: string; name: string }[]> = {
  direct: [{ slug: 'capture', name: 'Quick Upload' }],
  recipes: [
    { slug: 'apple-pie', name: 'Apple Pie' },
    { slug: 'chocolate-cake', name: 'Chocolate Cake' },
  ],
  weather: [
    { slug: 'sunny-forecast', name: 'Sunny' },
    { slug: 'cloudy-day', name: 'Cloudy' },
  ],
  garden: [
    { slug: 'monstera-care', name: 'Monstera Care' },
    { slug: 'succulent-guide', name: 'Succulents' },
  ],
  fitness: [{ slug: 'workout', name: 'Workout' }],
  notes: [{ slug: 'quick-note', name: 'Quick Note' }],
};

interface BurnerLinksPanelProps {
  userId: string;
  vaultKeyHash: string;
  onBack: () => void;
}

type View = 'list' | 'create' | 'detail' | 'uploads';

export function BurnerLinksPanel({ userId, vaultKeyHash, onBack }: BurnerLinksPanelProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('list');
  const [selectedLink, setSelectedLink] = useState<BurnerLink | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Fetch burner links
  const { data: burnerLinks = [], isLoading: isLoadingLinks } = useQuery({
    queryKey: ['burnerLinks', userId],
    queryFn: async () => {
      const response = await fetch('/api/burner/create');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      return data.links as BurnerLink[];
    },
  });

  const handleViewDetail = (link: BurnerLink) => {
    setSelectedLink(link);
    setView('detail');
  };

  const handleBack = () => {
    if (view === 'detail' || view === 'create' || view === 'uploads') {
      setView('list');
      setSelectedLink(null);
    } else {
      onBack();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 bg-white border-b border-gray-100">
        <button
          onClick={handleBack}
          className="text-blue-600 mb-2 flex items-center gap-1 text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          {view === 'list' ? 'Back' : 'Burner Links'}
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {view === 'list' && 'Stealth Drop'}
          {view === 'create' && 'New Link'}
          {view === 'detail' && 'Link Details'}
          {view === 'uploads' && 'Received Uploads'}
        </h1>
        {view === 'list' && (
          <p className="text-sm text-gray-500 mt-1">
            Create anonymous upload links for contacts
          </p>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'list' && (
          <BurnerLinksList
            links={burnerLinks}
            isLoading={isLoadingLinks}
            onViewDetail={handleViewDetail}
            onViewUploads={() => setView('uploads')}
            onCreate={() => setView('create')}
            copiedSlug={copiedSlug}
            setCopiedSlug={setCopiedSlug}
          />
        )}
        {view === 'create' && (
          <CreateBurnerLink
            userId={userId}
            vaultKeyHash={vaultKeyHash}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['burnerLinks'] });
              setView('list');
            }}
            onCancel={() => setView('list')}
          />
        )}
        {view === 'detail' && selectedLink && (
          <BurnerLinkDetail
            link={selectedLink}
            onDelete={() => {
              queryClient.invalidateQueries({ queryKey: ['burnerLinks'] });
              setView('list');
            }}
          />
        )}
        {view === 'uploads' && (
          <StealthUploadsView
            userId={userId}
            vaultKeyHash={vaultKeyHash}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Burner Links List
// ============================================================

function BurnerLinksList({
  links,
  isLoading,
  onViewDetail,
  onViewUploads,
  onCreate,
  copiedSlug,
  setCopiedSlug,
}: {
  links: BurnerLink[];
  isLoading: boolean;
  onViewDetail: (link: BurnerLink) => void;
  onViewUploads: () => void;
  onCreate: () => void;
  copiedSlug: string | null;
  setCopiedSlug: (slug: string | null) => void;
}) {
  const totalUploads = links.reduce((sum, l) => sum + l.upload_count, 0);

  const copyLink = async (link: BurnerLink) => {
    const storedKeys = loadAllBurnerKeyPairs();
    const keyData = Object.values(storedKeys).find(
      (k) => k.publicKey === link.public_key
    );

    const baseUrl = window.location.origin;
    const url = buildBurnerLinkUrl(
      baseUrl,
      link.theme,
      link.content_slug,
      link.slug,
      link.public_key
    );

    await navigator.clipboard.writeText(url);
    setCopiedSlug(link.slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Stats Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Received Uploads</p>
            <p className="text-3xl font-bold">{totalUploads}</p>
          </div>
          <button
            onClick={onViewUploads}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">View</span>
          </button>
        </div>
      </div>

      {/* Create Button */}
      <Button
        onClick={onCreate}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Create New Link
      </Button>

      {/* Links List */}
      {links.length === 0 ? (
        <div className="text-center py-12">
          <Link2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No burner links created yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Create a link to receive photos anonymously
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1">
            Active Links ({links.filter((l) => l.is_active).length})
          </h3>
          {links.map((link) => {
            const theme = THEMES.find((t) => t.id === link.theme);
            const Icon = theme?.icon || Link2;
            const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
            const isFull = link.max_uploads && link.upload_count >= link.max_uploads;

            return (
              <div
                key={link.id}
                className={`bg-white rounded-xl border ${
                  !link.is_active || isExpired || isFull
                    ? 'border-gray-200 opacity-60'
                    : 'border-gray-100'
                } overflow-hidden`}
              >
                <div className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${theme?.color || 'bg-gray-500'} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {theme?.name || link.theme}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Upload className="w-3 h-3" />
                      {link.upload_count}
                      {link.max_uploads && ` / ${link.max_uploads}`} Uploads
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyLink(link)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy Link"
                    >
                      {copiedSlug === link.slug ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => onViewDetail(link)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
                {(isExpired || isFull || !link.is_active) && (
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                    <AlertTriangle className="w-3 h-3" />
                    {!link.is_active
                      ? 'Disabled'
                      : isExpired
                      ? 'Expired'
                      : 'Limit reached'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Create Burner Link
// ============================================================

function CreateBurnerLink({
  userId,
  vaultKeyHash,
  onSuccess,
  onCancel,
}: {
  userId: string;
  vaultKeyHash: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [selectedTheme, setSelectedTheme] = useState<string>('direct');
  const [selectedContent, setSelectedContent] = useState<string>('');
  const [maxUploads, setMaxUploads] = useState<number | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<{ url: string; slug: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Set default content when theme changes
  useEffect(() => {
    const contents = CONTENT_SLUGS[selectedTheme];
    if (contents && contents.length > 0) {
      setSelectedContent(contents[0].slug);
    }
  }, [selectedTheme]);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    try {
      // Generate keypair
      const keyPair = await generateStorableBurnerKeyPair();

      // Load vault key for encryption
      const rawVaultKey = loadKeyFromStorage();
      if (!rawVaultKey) throw new Error('Vault is locked');
      const vaultKey = await importVaultKey(rawVaultKey);

      // Save keypair locally (encrypted)
      await saveBurnerKeyPair(keyPair.id, keyPair.publicKey, keyPair.privateKeyJwk, vaultKey);

      // Create burner link via API
      const response = await fetch('/api/burner/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: keyPair.publicKey,
          theme: selectedTheme,
          contentSlug: selectedContent || 'default',
          maxUploads: maxUploads || undefined,
          expiresIn: expiresIn || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create link');
      }

      const data = await response.json();

      // Build full URL with public key in fragment
      const baseUrl = window.location.origin;
      const fullUrl = buildBurnerLinkUrl(
        baseUrl,
        selectedTheme,
        selectedContent || 'default',
        data.slug,
        keyPair.publicKey
      );

      setCreatedLink({ url: fullUrl, slug: data.slug });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setIsCreating(false);
    }
  };

  // Show success view with QR code
  if (createdLink) {
    return (
      <div className="p-4 space-y-6">
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
            onClick={() => window.open(createdLink.url, '_blank')}
            variant="outline"
            className="w-full h-12 rounded-xl flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            Open Link
          </Button>

          <Button
            onClick={onSuccess}
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
    );
  }

  return (
    <div className="p-4 space-y-6">
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
                    ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                    : selectedTheme === theme.id
                    ? 'bg-blue-50 ring-2 ring-blue-500'
                    : 'bg-white hover:bg-gray-50 border border-gray-100'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${theme.color} flex items-center justify-center mb-2`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="font-medium text-gray-900 text-sm">{theme.name}</p>
                <p className="text-xs text-gray-500">{theme.description}</p>
                {theme.disabled && (
                  <span className="text-xs text-gray-400 mt-1 block">Coming soon</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Selection (for themes with multiple options) */}
      {CONTENT_SLUGS[selectedTheme]?.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Choose Content</h3>
          <div className="space-y-2">
            {CONTENT_SLUGS[selectedTheme].map((content) => (
              <button
                key={content.slug}
                onClick={() => setSelectedContent(content.slug)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  selectedContent === content.slug
                    ? 'bg-blue-50 ring-2 ring-blue-500'
                    : 'bg-white hover:bg-gray-50 border border-gray-100'
                }`}
              >
                <p className="font-medium text-gray-900">{content.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Options */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Options</h3>
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Max. Uploads</p>
                <p className="text-xs text-gray-500">Limits the number of uploads</p>
              </div>
              <select
                value={maxUploads || ''}
                onChange={(e) => setMaxUploads(e.target.value ? parseInt(e.target.value) : null)}
                className="bg-gray-100 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Unlimited</option>
                <option value="1">1 Upload</option>
                <option value="5">5 Uploads</option>
                <option value="10">10 Uploads</option>
                <option value="25">25 Uploads</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Expiration</p>
                <p className="text-xs text-gray-500">Link automatically deactivates</p>
              </div>
              <select
                value={expiresIn || ''}
                onChange={(e) => setExpiresIn(e.target.value ? parseInt(e.target.value) : null)}
                className="bg-gray-100 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Never</option>
                <option value="3600000">1 Hour</option>
                <option value="86400000">24 Hours</option>
                <option value="604800000">7 Days</option>
                <option value="2592000000">30 Days</option>
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
          onClick={onCancel}
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
  );
}

// ============================================================
// Burner Link Detail
// ============================================================

function BurnerLinkDetail({
  link,
  onDelete,
}: {
  link: BurnerLink;
  onDelete: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const theme = THEMES.find((t) => t.id === link.theme);
  const Icon = theme?.icon || Link2;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const fullUrl = buildBurnerLinkUrl(
    baseUrl,
    link.theme,
    link.content_slug,
    link.slug,
    link.public_key
  );

  const handleDelete = async () => {
    if (!confirm('Really deactivate link? Uploads will be preserved.')) return;

    setIsDeleting(true);
    try {
      await fetch(`/api/burner/create?slug=${link.slug}`, {
        method: 'DELETE',
      });
      onDelete();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl ${theme?.color || 'bg-gray-500'} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{theme?.name || link.theme}</p>
            <p className="text-sm text-gray-500">{link.content_slug}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Uploads</p>
            <p className="text-xl font-bold text-gray-900">
              {link.upload_count}
              {link.max_uploads && <span className="text-sm font-normal text-gray-500"> / {link.max_uploads}</span>}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Status</p>
            <p className={`text-sm font-medium ${link.is_active ? 'text-green-600' : 'text-gray-500'}`}>
              {link.is_active ? 'Active' : 'Disabled'}
            </p>
          </div>
        </div>

        {link.expires_at && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Clock className="w-4 h-4" />
            Expires: {new Date(link.expires_at).toLocaleDateString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={copyLink}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10 rounded-xl"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button
            onClick={() => setShowQR(true)}
            variant="outline"
            className="h-10 rounded-xl px-3"
          >
            <QrCode className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => window.open(fullUrl, '_blank')}
            variant="outline"
            className="h-10 rounded-xl px-3"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Delete */}
      <Button
        onClick={handleDelete}
        disabled={isDeleting || !link.is_active}
        variant="outline"
        className="w-full h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
      >
        {isDeleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Trash2 className="w-4 h-4 mr-2" />
            Link deaktivieren
          </>
        )}
      </Button>

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">QR Code</h3>
              <button onClick={() => setShowQR(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center p-4 bg-gray-50 rounded-xl">
              <QRCodeSVG value={fullUrl} size={200} level="M" />
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">
              Scanne diesen Code mit der Kamera
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Stealth Uploads View
// ============================================================

function StealthUploadsView({
  userId,
  vaultKeyHash,
}: {
  userId: string;
  vaultKeyHash: string;
}) {
  const [selectedUpload, setSelectedUpload] = useState<StealthUpload | null>(null);
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch uploads from all burner links
  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ['stealthUploads', userId],
    queryFn: async () => {
      const response = await fetch('/api/burner/uploads');
      if (!response.ok) throw new Error('Failed to fetch uploads');
      const data = await response.json();
      return data.uploads as (StealthUpload & { burner_links: BurnerLink })[];
    },
  });

  const handleDecrypt = async (upload: StealthUpload) => {
    setSelectedUpload(upload);
    setIsDecrypting(true);
    setError(null);

    try {
      // Find the keypair for this upload's burner link
      const storedKeys = loadAllBurnerKeyPairs();

      // We need to find which key matches this upload
      // This requires the burner_link's public_key which we'd need from the join

      // For now, show a placeholder
      setError('Entschlüsselung wird implementiert...');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Entschlüsselung fehlgeschlagen');
    } finally {
      setIsDecrypting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <Lock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Noch keine Uploads empfangen</p>
          <p className="text-sm text-gray-400 mt-1">
            Uploads erscheinen hier sobald jemand ein Foto sendet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {uploads.map((upload: StealthUpload) => (
        <div
          key={upload.id}
          className="bg-white rounded-xl border border-gray-100 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">Verschlüsseltes Foto</p>
              <p className="text-sm text-gray-500">
                {new Date(upload.uploaded_at).toLocaleDateString('de-DE')}
              </p>
            </div>
            <Button
              onClick={() => handleDecrypt(upload)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <Eye className="w-4 h-4 mr-1" />
              Anzeigen
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default BurnerLinksPanel;
