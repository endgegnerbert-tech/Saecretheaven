/**
 * API Route: Anonymous Stealth Upload (PUBLIC)
 *
 * POST /api/burner/upload
 *
 * This endpoint is intentionally PUBLIC (no authentication required).
 * It allows anonymous sources to upload encrypted photos to burner links.
 *
 * SECURITY:
 * - No logging of slug, IP, or any identifying information
 * - Rate limiting: 10 uploads per IP per hour (implement at edge/CDN)
 * - Validates link is active before accepting upload
 * - Encrypted blob goes to IPFS, only metadata to Supabase
 *
 * BODY (FormData):
 * - file: Encrypted blob (application/octet-stream)
 * - slug: Burner link slug
 * - ephemeralPublicKey: Base64URL ECDH ephemeral public key
 * - iv: Base64 AES-GCM IV
 * - salt: Base64 HKDF salt
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  rateLimitResponse,
  rateLimitHeaders,
} from '@/lib/rate-limit';

// Use anon key for public access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// IPFS configuration
const IPFS_API_URL = process.env.NEXT_PUBLIC_IPFS_API_URL || 'https://ipfs.saecretheaven.com/api/v0';
const IPFS_API_USERNAME = process.env.IPFS_API_USERNAME || 'admin';
const IPFS_API_PASSWORD = process.env.IPFS_API_PASSWORD || '';

// Max file size (50MB for encrypted photos)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface UploadResponse {
  success: boolean;
  cid?: string;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadResponse | ErrorResponse>> {
  // SECURITY: Do NOT log any request details (protects source anonymity)
  // But we DO rate limit by IP to prevent abuse

  // Rate limiting: 10 uploads per IP per hour
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`burner-upload:${clientIp}`, RATE_LIMITS.BURNER_UPLOAD);

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit) as NextResponse<ErrorResponse>;
  }

  try {
    const formData = await request.formData();

    // Extract form fields
    const file = formData.get('file') as Blob | null;
    const slug = formData.get('slug') as string | null;
    const ephemeralPublicKey = formData.get('ephemeralPublicKey') as string | null;
    const iv = formData.get('iv') as string | null;
    const salt = formData.get('salt') as string | null;

    // Validate required fields
    if (!file || !slug || !ephemeralPublicKey || !iv || !salt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid link format' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large', code: 'FILE_TOO_LARGE' },
        { status: 413 }
      );
    }

    // Create Supabase client with anon key
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verify burner link exists and is active
    const { data: burnerLink, error: linkError } = await supabase
      .from('burner_links')
      .select('id, is_active, expires_at, max_uploads, upload_count')
      .eq('slug', slug)
      .single();

    if (linkError || !burnerLink) {
      return NextResponse.json(
        { error: 'Link not found or expired' },
        { status: 404 }
      );
    }

    // Validate link is still active
    if (!burnerLink.is_active) {
      return NextResponse.json(
        { error: 'Link is no longer active' },
        { status: 410 }
      );
    }

    if (burnerLink.expires_at && new Date(burnerLink.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Link has expired' },
        { status: 410 }
      );
    }

    if (burnerLink.max_uploads !== null && burnerLink.upload_count >= burnerLink.max_uploads) {
      return NextResponse.json(
        { error: 'Link has reached upload limit', code: 'UPLOAD_LIMIT_REACHED' },
        { status: 410 }
      );
    }

    // Upload encrypted blob to IPFS
    let cid: string;

    if (IPFS_API_PASSWORD) {
      // Use self-hosted IPFS
      const ipfsFormData = new FormData();
      ipfsFormData.append('file', file, 'encrypted-upload.bin');

      const credentials = btoa(`${IPFS_API_USERNAME}:${IPFS_API_PASSWORD}`);

      const ipfsResponse = await fetch(`${IPFS_API_URL}/add?cid-version=1`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
        body: ipfsFormData,
      });

      if (!ipfsResponse.ok) {
        console.error('[Burner Upload] IPFS upload failed:', ipfsResponse.status);
        return NextResponse.json(
          { error: 'Upload failed', code: 'IPFS_ERROR' },
          { status: 502 }
        );
      }

      const ipfsText = await ipfsResponse.text();
      const lines = ipfsText.trim().split('\n');
      const lastLine = lines[lines.length - 1];

      try {
        const result = JSON.parse(lastLine);
        cid = result.Hash;
      } catch {
        console.error('[Burner Upload] Invalid IPFS response');
        return NextResponse.json(
          { error: 'Upload failed', code: 'IPFS_PARSE_ERROR' },
          { status: 502 }
        );
      }
    } else {
      // Primary: Try Pinata (more reliable than self-hosted)
      const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;

      if (pinataJwt) {
        const pinataFormData = new FormData();
        pinataFormData.append('file', file, 'encrypted-upload.bin');

        try {
          const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${pinataJwt}`,
            },
            body: pinataFormData,
          });

          if (!pinataResponse.ok) {
            const errorText = await pinataResponse.text().catch(() => 'Unknown error');
            console.error('[Burner Upload] Pinata upload failed:', pinataResponse.status, errorText);
            return NextResponse.json(
              { error: 'Upload failed', code: 'PINATA_ERROR' },
              { status: 502 }
            );
          }

          const pinataResult = await pinataResponse.json();
          cid = pinataResult.IpfsHash;
        } catch (pinataError) {
          console.error('[Burner Upload] Pinata network error:', pinataError);
          return NextResponse.json(
            { error: 'Upload service unavailable', code: 'PINATA_NETWORK_ERROR' },
            { status: 503 }
          );
        }
      } else {
        // No IPFS configured - this is a configuration error
        console.error('[Burner Upload] No IPFS provider configured');
        return NextResponse.json(
          { error: 'Server configuration error', code: 'NO_IPFS_PROVIDER' },
          { status: 500 }
        );
      }
    }

    // Store upload metadata in Supabase
    // Note: RLS policy allows anonymous inserts to active burner links
    const { error: insertError } = await supabase
      .from('stealth_uploads')
      .insert({
        burner_link_id: burnerLink.id,
        cid,
        ephemeral_public_key: ephemeralPublicKey,
        iv,
        salt,
        file_size_bytes: file.size,
        mime_type: 'application/octet-stream',
      });

    if (insertError) {
      // Log error code only (not sensitive data)
      console.error('[Burner Upload] Metadata insert failed:', insertError.code);
      return NextResponse.json(
        { error: 'Upload failed', code: 'DB_INSERT_ERROR' },
        { status: 500 }
      );
    }

    // Note: The trigger automatically increments upload_count

    return NextResponse.json(
      { success: true, cid },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        },
      }
    );
  } catch (err) {
    // SECURITY: Do NOT log error details
    console.error('[Burner Upload] Internal error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
