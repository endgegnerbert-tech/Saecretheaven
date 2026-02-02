'use client';

/**
 * Chameleon Page - Dynamic Theme Renderer
 *
 * Renders the appropriate theme based on URL parameters.
 *
 * URL Format: /d/[theme]/[contentSlug]#s=[burnerSlug]&k=[publicKey]
 *
 * - theme: 'recipes', 'weather', 'garden', etc.
 * - contentSlug: Content identifier (e.g., 'apple-pie')
 * - s: Burner link slug (URL fragment - not sent to server!)
 * - k: Public key (URL fragment - not sent to server!)
 *
 * SECURITY:
 * - BOTH slug and public key are in URL fragment (#s=...&k=...)
 * - Fragment is NEVER sent to server (HTTP spec)
 * - WhatsApp/Messenger only see: /d/recipes/apple-pie
 * - All encryption happens client-side
 * - Public key MUST come from fragment - never trust server fallback
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RecipeTheme } from '@/components/chameleon/themes/RecipeTheme';
import { WeatherTheme } from '@/components/chameleon/themes/WeatherTheme';
import { GardenTheme } from '@/components/chameleon/themes/GardenTheme';
import { DirectCameraTheme } from '@/components/chameleon/themes/DirectCameraTheme';
import { EyeOff, Shield, X } from 'lucide-react';
import { useBurnerCleanup } from '@/hooks/use-burner-cleanup';
import { IncognitoGuard } from '@/components/security/IncognitoGuard';
import { StealthShield } from '@/components/security/StealthShield';

interface ChameleonPageProps {
  params: Promise<{
    theme: string;
    slug: string;
  }>;
}

type ThemeType = 'direct' | 'recipes' | 'weather' | 'garden' | 'fitness' | 'notes';

interface BurnerLinkData {
  publicKey: string;
  theme: string;
  contentSlug: string;
}

export default function ChameleonPage({ params }: ChameleonPageProps) {
  const searchParams = useSearchParams();
  const [resolvedParams, setResolvedParams] = useState<{ theme: string; slug: string } | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [burnerSlug, setBurnerSlug] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { wipeAndExit } = useBurnerCleanup();
  const [showWarning, setShowWarning] = useState(true);

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Extract slug and public key from URL fragment
  // SECURITY: Both are in fragment to prevent server/messenger logging
  useEffect(() => {
    if (!resolvedParams) return;

    // Parse URL fragment manually - URLSearchParams can't handle Base64 correctly
    // because it interprets '=' as key-value separator, breaking Base64 padding
    let fragmentSlug: string | null = null;
    let fragmentKey: string | null = null;

    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.length > 1) {
        const fragment = hash.slice(1); // Remove #

        // Manual parsing: split by & and find first = for each part
        fragment.split('&').forEach(part => {
          const eqIndex = part.indexOf('=');
          if (eqIndex > 0) {
            const paramKey = part.slice(0, eqIndex);
            const paramValue = part.slice(eqIndex + 1);
            if (paramKey === 's') {
              fragmentSlug = paramValue;
            } else if (paramKey === 'k') {
              fragmentKey = paramValue;
            }
          }
        });
      }
    }

    // Backwards compatibility: Check query params if fragment is empty
    // This supports old links with ?s=slug format
    const querySlug = searchParams.get('s');
    const finalSlug = fragmentSlug || querySlug;

    setBurnerSlug(finalSlug);

    // SECURITY: Public key MUST come from fragment only
    // Never accept it from server - that defeats the purpose of fragment privacy
    if (fragmentKey) {
      setPublicKey(fragmentKey);
    }

    // Validate burner link if slug is provided
    if (finalSlug) {
      validateBurnerLink(finalSlug, fragmentKey);
    } else {
      setIsValidating(false);
    }
  }, [resolvedParams, searchParams]);

  // Validate burner link is active
  const validateBurnerLink = async (slug: string, fragmentPublicKey: string | null) => {
    try {
      const response = await fetch(`/api/burner/${slug}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('This link is no longer available.');
        } else if (response.status === 410) {
          setError('This link has expired or reached its limit.');
        } else {
          setError('Unable to load content.');
        }
        setIsValidating(false);
        return;
      }

      // Parse response but DON'T use publicKey from server
      await response.json();

      // SECURITY: Public key MUST come from URL fragment only
      // The server's publicKey is intentionally ignored to ensure:
      // 1. Fragment privacy is maintained (server compromise can't leak key)
      // 2. Man-in-the-middle can't inject wrong key
      if (!fragmentPublicKey) {
        setError('Invalid link. Please use the complete link including the encryption key.');
        setIsValidating(false);
        return;
      }

      setIsValidating(false);
    } catch {
      setError('Unable to load content.');
      setIsValidating(false);
    }
  };

  // Loading state
  if (!resolvedParams || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { theme, slug } = resolvedParams;

  // Render appropriate theme
  const renderTheme = () => {
    switch (theme) {
      case 'direct':
        return (
          <DirectCameraTheme
            contentSlug={slug}
            publicKey={publicKey}
            burnerSlug={burnerSlug || ''}
          />
        );

      case 'recipes':
        return (
          <RecipeTheme
            contentSlug={slug}
            publicKey={publicKey}
            burnerSlug={burnerSlug || ''}
          />
        );

      case 'weather':
        return (
          <WeatherTheme
            contentSlug={slug}
            publicKey={publicKey}
            burnerSlug={burnerSlug || ''}
          />
        );

      case 'garden':
        return (
          <GardenTheme
            contentSlug={slug}
            publicKey={publicKey}
            burnerSlug={burnerSlug || ''}
          />
        );

      // TODO: Add more themes
      case 'fitness':
      case 'notes':
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">Theme coming soon...</p>
          </div>
        );

      default:
        // Unknown theme - show generic content
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">Content not found</p>
          </div>
        );
    }
  };

  return (
    <IncognitoGuard>
    <StealthShield>
    <div className="relative">
      {/* Incognito Warning - Keep as reminder even after unlock */}
      {showWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 text-yellow-900 px-4 py-2 text-xs font-medium flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Security Note: Incognito Mode is recommended.</span>
            </div>
            <button onClick={() => setShowWarning(false)}>
                <X className="w-4 h-4" />
            </button>
        </div>
      )}

      {/* Main Content */}
      {renderTheme()}

      {/* Panic Exit Button */}
      <button 
        onClick={wipeAndExit}
        className="fixed bottom-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white rounded-full p-3 shadow-xl border-2 border-white/20 transition-transform active:scale-95 flex items-center gap-2"
        title="Panic Exit (Wipe & Close)"
      >
        <Shield className="w-5 h-5" />
        <span className="font-bold text-xs uppercase pr-1">Panic</span>
      </button>
    </div>
    </StealthShield>
    </IncognitoGuard>
  );
}
