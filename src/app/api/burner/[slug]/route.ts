/**
 * API Route: Burner Link Lookup (PUBLIC)
 *
 * GET /api/burner/[slug]
 *
 * This endpoint is intentionally PUBLIC (no authentication required).
 * It allows anonymous sources to fetch the public key for a burner link.
 *
 * SECURITY:
 * - No logging of slug or any identifying information
 * - Only returns public_key, theme, and content_slug
 * - Validates link is active, not expired, and has upload capacity
 * - Rate limiting should be applied at CDN/edge level
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from '@/lib/rate-limit';

// Use anon key for public access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface BurnerLinkPublicData {
  publicKey: string;
  theme: string;
  contentSlug: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<BurnerLinkPublicData | ErrorResponse>> {
  // SECURITY: Do NOT log the slug or any request details
  // This is intentional to protect source anonymity

  // Rate limiting: 100 lookups per IP per hour
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`burner-lookup:${clientIp}`, RATE_LIMITS.BURNER_LOOKUP);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit) as NextResponse<ErrorResponse>;
  }

  try {
    const { slug } = await params;

    // Validate slug format
    if (!slug || !/^[a-zA-Z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid link format' },
        { status: 400 }
      );
    }

    // Create Supabase client with anon key (RLS will filter)
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Query burner link - RLS policy ensures only active, non-expired links are returned
    const { data, error } = await supabase
      .from('burner_links')
      .select('public_key, theme, content_slug, is_active, expires_at, max_uploads, upload_count')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      // Return generic 404 - don't reveal if link existed but expired
      return NextResponse.json(
        { error: 'Link not found or expired' },
        { status: 404 }
      );
    }

    // Double-check link validity (RLS should handle this, but defense in depth)
    if (!data.is_active) {
      return NextResponse.json(
        { error: 'Link not found or expired' },
        { status: 404 }
      );
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Link not found or expired' },
        { status: 404 }
      );
    }

    if (data.max_uploads !== null && data.upload_count >= data.max_uploads) {
      return NextResponse.json(
        { error: 'Link has reached upload limit', code: 'UPLOAD_LIMIT_REACHED' },
        { status: 410 } // Gone
      );
    }

    // Return only the necessary public data
    return NextResponse.json(
      {
        publicKey: data.public_key,
        theme: data.theme,
        contentSlug: data.content_slug,
      },
      {
        headers: {
          // Strict no-cache for privacy
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          // Prevent referrer leakage
          'Referrer-Policy': 'no-referrer',
        },
      }
    );
  } catch (err) {
    // SECURITY: Do NOT log error details that might contain slug
    console.error('[Burner Lookup] Internal error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
