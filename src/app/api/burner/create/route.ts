/**
 * API Route: Create Burner Link (AUTHENTICATED)
 *
 * POST /api/burner/create
 *
 * This endpoint requires authentication.
 * It allows vault owners to create new burner links for receiving anonymous uploads.
 *
 * BODY (JSON):
 * - publicKey: Base64URL-encoded P-256 public key (generated client-side)
 * - theme: 'recipes' | 'weather' | 'garden' | 'fitness' | 'notes'
 * - contentSlug: The fake content identifier (e.g., 'apple-pie')
 * - expiresIn?: Number of milliseconds until expiration (optional)
 * - maxUploads?: Maximum number of uploads allowed (optional)
 *
 * RESPONSE:
 * - slug: Unique identifier for the burner link
 * - url: Full URL to share with sources
 *
 * SECURITY:
 * - Requires authenticated session
 * - Public key is generated client-side, private key never leaves device
 * - Links are tied to creator's vault_key_hash for decryption
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitResponse,
} from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Valid themes for chameleon routing
const VALID_THEMES = ['direct', 'recipes', 'weather', 'garden', 'fitness', 'notes'] as const;
type Theme = typeof VALID_THEMES[number];

interface CreateBurnerRequest {
  publicKey: string;
  theme: Theme;
  contentSlug: string;
  expiresIn?: number;
  maxUploads?: number;
}

interface CreateBurnerResponse {
  slug: string;
  url: string;
  expiresAt?: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

/**
 * Generate a secure random slug
 */
function generateSecureSlug(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  // Convert to base36 (a-z, 0-9) for URL-friendly slug
  return Array.from(bytes)
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateBurnerResponse | ErrorResponse>> {
  try {
    // Verify authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Rate limiting: 20 creations per user per hour
    const rateLimit = checkRateLimit(`burner-create:${session.user.id}`, RATE_LIMITS.BURNER_CREATE);

    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit) as NextResponse<ErrorResponse>;
    }

    // Get user's vault_key_hash - try session first, fallback to DB query
    let vaultKeyHash = (session.user as { vault_key_hash?: string }).vault_key_hash;

    // If not in session, fetch from database (Better Auth might not include additionalFields in session)
    if (!vaultKeyHash) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const { data: userData, error: userError } = await supabaseAdmin
        .from('user')
        .select('vault_key_hash')
        .eq('id', session.user.id)
        .single();

      if (!userError && userData?.vault_key_hash) {
        vaultKeyHash = userData.vault_key_hash;
        console.log('[Burner Create] vault_key_hash fetched from DB');
      }
    }

    console.log('[Burner Create] User:', session.user.id, 'vault_key_hash:', vaultKeyHash ? 'present' : 'MISSING');

    if (!vaultKeyHash) {
      return NextResponse.json(
        { error: 'Vault not set up. Please complete vault setup first.', code: 'VAULT_NOT_SETUP' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json() as CreateBurnerRequest;
    const { publicKey, theme, contentSlug, expiresIn, maxUploads } = body;

    // Validate required fields
    if (!publicKey || !theme || !contentSlug) {
      return NextResponse.json(
        { error: 'Missing required fields: publicKey, theme, contentSlug' },
        { status: 400 }
      );
    }

    // Validate theme
    if (!VALID_THEMES.includes(theme)) {
      return NextResponse.json(
        { error: `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate contentSlug format
    if (!/^[a-zA-Z0-9-]+$/.test(contentSlug)) {
      return NextResponse.json(
        { error: 'Invalid contentSlug format. Use only letters, numbers, and hyphens.' },
        { status: 400 }
      );
    }

    // Validate maxUploads
    if (maxUploads !== undefined && (maxUploads < 1 || maxUploads > 1000)) {
      return NextResponse.json(
        { error: 'maxUploads must be between 1 and 1000' },
        { status: 400 }
      );
    }

    // Calculate expiration
    let expiresAt: Date | null = null;
    if (expiresIn && expiresIn > 0) {
      // Cap at 30 days
      const maxExpiry = 30 * 24 * 60 * 60 * 1000;
      const actualExpiry = Math.min(expiresIn, maxExpiry);
      expiresAt = new Date(Date.now() + actualExpiry);
    }

    // Generate unique slug
    const slug = generateSecureSlug();

    // Use service role key for insert (RLS requires authenticated role)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert burner link
    const { error: insertError } = await supabase
      .from('burner_links')
      .insert({
        slug,
        public_key: publicKey,
        theme,
        content_slug: contentSlug,
        creator_user_id: session.user.id,
        creator_vault_key_hash: vaultKeyHash,
        expires_at: expiresAt?.toISOString() || null,
        max_uploads: maxUploads || null,
      });

    if (insertError) {
      // Check for duplicate slug (extremely unlikely but possible)
      if (insertError.code === '23505') {
        // Try again with new slug
        const newSlug = generateSecureSlug();
        const { error: retryError } = await supabase
          .from('burner_links')
          .insert({
            slug: newSlug,
            public_key: publicKey,
            theme,
            content_slug: contentSlug,
            creator_user_id: session.user.id,
            creator_vault_key_hash: vaultKeyHash,
            expires_at: expiresAt?.toISOString() || null,
            max_uploads: maxUploads || null,
          });

        if (retryError) {
          console.error('[Burner Create] Insert failed on retry:', retryError.message);
          return NextResponse.json(
            { error: 'Failed to create burner link' },
            { status: 500 }
          );
        }

        // Build URL with new slug
        // Note: URL doesn't include slug or key - client appends them in fragment
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saecretheaven.com';
        const url = `${baseUrl}/d/${theme}/${contentSlug}`;

        return NextResponse.json({
          slug: newSlug,
          url,
          expiresAt: expiresAt?.toISOString(),
        });
      }

      console.error('[Burner Create] Insert failed:', insertError.message);
      return NextResponse.json(
        { error: 'Failed to create burner link' },
        { status: 500 }
      );
    }

    // Build URL
    // SECURITY: URL doesn't include slug or public key
    // Client appends them in fragment: #s={slug}&k={publicKey}
    // This prevents server/messenger logging of sensitive data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saecretheaven.com';
    const url = `${baseUrl}/d/${theme}/${contentSlug}`;

    return NextResponse.json({
      slug,
      url,
      expiresAt: expiresAt?.toISOString(),
    });
  } catch (err) {
    console.error('[Burner Create] Internal error:', err);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET: List user's burner links
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    // Verify authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's burner links
    const { data, error } = await supabase
      .from('burner_links')
      .select(`
        id,
        slug,
        theme,
        content_slug,
        created_at,
        expires_at,
        max_uploads,
        upload_count,
        is_active
      `)
      .eq('creator_user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Burner List] Query failed:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch burner links' },
        { status: 500 }
      );
    }

    return NextResponse.json({ links: data || [] });
  } catch (err) {
    console.error('[Burner List] Internal error:', err);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Deactivate a burner link
 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse> {
  try {
    // Verify authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing slug parameter' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Deactivate the link (don't delete to preserve audit trail)
    const { error } = await supabase
      .from('burner_links')
      .update({ is_active: false })
      .eq('slug', slug)
      .eq('creator_user_id', session.user.id);

    if (error) {
      console.error('[Burner Delete] Update failed:', error.message);
      return NextResponse.json(
        { error: 'Failed to deactivate burner link' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Burner Delete] Internal error:', err);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
