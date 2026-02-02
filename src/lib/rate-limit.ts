/**
 * Simple In-Memory Rate Limiter
 *
 * Provides rate limiting for API routes without external dependencies.
 * Uses a sliding window algorithm with automatic cleanup.
 *
 * IMPORTANT: This is per-instance. In a serverless environment (Vercel),
 * each function instance has its own cache. For distributed rate limiting,
 * use Redis or similar. However, this provides good protection for:
 * - Single-server deployments
 * - Per-instance abuse prevention
 * - Development/testing
 *
 * For production on Vercel, consider:
 * - Vercel Edge Config for global rate limiting
 * - Upstash Redis for distributed rate limiting
 * - Vercel's built-in rate limiting features
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (per serverless instance)
const store = new Map<string, RateLimitEntry>();

// Cleanup interval (every 5 minutes)
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    // Use forEach instead of for...of to avoid downlevelIteration requirement
    store.forEach((entry, key) => {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    });
  }, 5 * 60 * 1000);

  // Don't block process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request should be allowed */
  success: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Timestamp when the limit resets (ms since epoch) */
  resetAt: number;
  /** Number of requests made in the current window */
  current: number;
}

/**
 * Check rate limit for a given identifier
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  startCleanup();

  const now = Date.now();
  const key = identifier;

  let entry = store.get(key);

  // Create new entry if none exists or window has expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }

  // Increment count
  entry.count++;
  store.set(key, entry);

  const success = entry.count <= config.limit;
  const remaining = Math.max(0, config.limit - entry.count);

  return {
    success,
    remaining,
    resetAt: entry.resetAt,
    current: entry.count,
  };
}

/**
 * Get client IP from request headers
 * Handles various proxy configurations (Vercel, Cloudflare, nginx)
 */
export function getClientIp(request: Request): string {
  // Check various headers in order of preference
  const headers = request.headers;

  // Vercel/Next.js
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first (client)
    return xForwardedFor.split(',')[0].trim();
  }

  // Cloudflare
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Vercel
  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }

  // Fallback - shouldn't happen in production
  return 'unknown';
}

// Preset configurations for common use cases
export const RATE_LIMITS = {
  /** Burner upload: 10 per IP per hour */
  BURNER_UPLOAD: {
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  /** Burner link lookup: 100 per IP per hour */
  BURNER_LOOKUP: {
    limit: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  /** Burner link creation: 20 per user per hour */
  BURNER_CREATE: {
    limit: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  /** Feedback submission: 5 per IP per hour */
  FEEDBACK: {
    limit: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  /** Share link creation: 10 per user per hour */
  SHARE_CREATE: {
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

/**
 * Helper to create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.current + result.remaining),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}

/**
 * Create a rate-limited response (429 Too Many Requests)
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        ...rateLimitHeaders(result),
      },
    }
  );
}
