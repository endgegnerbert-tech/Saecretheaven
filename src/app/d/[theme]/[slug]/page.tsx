'use client';

/**
 * Chameleon Page - Dynamic Theme Renderer
 *
 * Renders the appropriate theme based on URL parameters.
 *
 * URL Format: /d/[theme]/[slug]?s=[burnerSlug]#k=[publicKey]
 *
 * - theme: 'recipes', 'weather', 'garden', etc.
 * - slug: Content identifier (e.g., 'apple-pie')
 * - s: Burner link slug (query param)
 * - k: Public key (URL fragment - not sent to server)
 *
 * SECURITY:
 * - Public key is in URL fragment (#k=...) so it's never sent to server
 * - Burner slug is used to validate link is active
 * - All encryption happens client-side
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RecipeTheme } from '@/components/chameleon/themes/RecipeTheme';
import { WeatherTheme } from '@/components/chameleon/themes/WeatherTheme';
import { GardenTheme } from '@/components/chameleon/themes/GardenTheme';
import { DirectCameraTheme } from '@/components/chameleon/themes/DirectCameraTheme';

interface ChameleonPageProps {
  params: Promise<{
    theme: string;
    slug: string;
  }>;
}

type ThemeType = 'recipes' | 'weather' | 'garden' | 'fitness' | 'notes';

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

  // Resolve params
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Extract public key from URL fragment and validate burner link
  useEffect(() => {
    if (!resolvedParams) return;

    // Get burner slug from query params
    const slug = searchParams.get('s');
    setBurnerSlug(slug);

    // Get public key from URL fragment (client-side only, not sent to server)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.slice(1));
        const key = hashParams.get('k');
        if (key) {
          setPublicKey(key);
        }
      }
    }

    // Validate burner link if slug is provided
    if (slug) {
      validateBurnerLink(slug);
    } else {
      setIsValidating(false);
    }
  }, [resolvedParams, searchParams]);

  // Validate burner link is active
  const validateBurnerLink = async (slug: string) => {
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

      const data: BurnerLinkData = await response.json();

      // If we got a public key from the API and don't have one from fragment
      if (data.publicKey && !publicKey) {
        setPublicKey(data.publicKey);
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

  return renderTheme();
}
