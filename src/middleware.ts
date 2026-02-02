/**
 * Next.js Middleware - Security Headers for Chameleon Routes
 *
 * This middleware applies strict security headers to stealth/burner routes
 * to prevent information leakage and ensure maximum privacy.
 *
 * SECURITY FEATURES:
 * - No caching (prevents forensic recovery from disk cache)
 * - No referrer (prevents URL leakage to third parties)
 * - No indexing (prevents search engine discovery)
 * - Frame protection (prevents clickjacking)
 * - Removes server identification headers
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  // ============================================================
  // CHAMELEON ROUTES: Maximum privacy headers
  // Routes: /d/* (disguised pages) and /api/burner/* (anonymous API)
  // ============================================================
  if (pathname.startsWith('/d/') || pathname.startsWith('/api/burner/')) {
    // Prevent caching - critical for forensic deniability
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    // Prevent referrer leakage - URL should never be sent to third parties
    response.headers.set('Referrer-Policy', 'no-referrer');

    // Prevent search engine indexing
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');

    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Restrict permissions - only camera needed for stealth capture
    response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

    // Remove server identification headers
    response.headers.delete('X-Powered-By');
    response.headers.delete('Server');

    // Content Security Policy for chameleon pages
    if (pathname.startsWith('/d/')) {
      response.headers.set(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'", // Required for Next.js
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "media-src 'self' blob:", // For camera capture
          "connect-src 'self' https://*.supabase.co https://ipfs.saecretheaven.com https://*.pinata.cloud",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "base-uri 'self'",
        ].join('; ')
      );
    }
  }

  // ============================================================
  // API ROUTES: General security headers
  // ============================================================
  if (pathname.startsWith('/api/')) {
    // Prevent caching of API responses
    response.headers.set('Cache-Control', 'no-store');

    // CORS headers are handled by Next.js, but ensure no credentials leak
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // CSRF Protection via Origin header check for mutating operations
    // Public burner endpoints (upload, lookup) are exempt - they're intentionally anonymous
    const isMutatingMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
    const isPublicBurnerEndpoint =
      pathname === '/api/burner/upload' ||
      pathname.match(/^\/api\/burner\/[^/]+$/) // /api/burner/[slug]

    if (isMutatingMethod && !isPublicBurnerEndpoint) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');

      // Allow same-origin requests and requests without origin (same-site navigation)
      if (origin) {
        const originUrl = new URL(origin);
        const expectedHost = host?.split(':')[0]; // Remove port if present

        if (originUrl.host.split(':')[0] !== expectedHost) {
          // CSRF attempt - reject
          return new NextResponse(
            JSON.stringify({ error: 'CSRF validation failed', code: 'CSRF_ERROR' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }
  }

  // ============================================================
  // ALL ROUTES: Basic security headers
  // ============================================================

  // Strict Transport Security (HTTPS only)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // XSS Protection (legacy, but doesn't hurt)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

export const config = {
  matcher: [
    // Match chameleon routes
    '/d/:path*',
    // Match burner API routes
    '/api/burner/:path*',
    // Match other API routes for basic security
    '/api/:path*',
  ],
};
