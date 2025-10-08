/**
 * Rate Limiting Utility
 *
 * Implements in-memory rate limiting for API endpoints.
 * For production, consider using Redis or Upstash for distributed rate limiting.
 */

import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory storage for rate limiting
// In production, use Redis or a distributed cache
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Identifier for the rate limit (e.g., 'auth', 'api', etc.)
   */
  identifier?: string;
}

/**
 * Generate a unique key for rate limiting based on IP and identifier
 */
function getRateLimitKey(request: Request, identifier?: string): string {
  // Try to get real IP from headers (handles proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';

  return identifier ? `${identifier}:${ip}` : ip;
}

/**
 * Check if request should be rate limited
 *
 * @returns null if allowed, NextResponse with 429 if rate limited
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): NextResponse | null {
  const key = getRateLimitKey(request, config.identifier);
  const now = Date.now();

  // Clean up expired entries (garbage collection)
  if (Math.random() < 0.1) { // 10% chance to cleanup
    for (const [k, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    return null; // Request allowed
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests - Please try again later',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetAt.toString(),
        },
      }
    );
  }

  // Request allowed, but update remaining count
  return null;
}

/**
 * Middleware wrapper that applies rate limiting
 *
 * @example
 * export const POST = compose(
 *   withRateLimit({ maxRequests: 10, windowMs: 60000 }),
 *   withRole('admin')
 * )(async (req, context) => {
 *   return NextResponse.json({ ok: true });
 * });
 */
export function withRateLimit(config: RateLimitConfig) {
  return (handler: Function) => {
    return async (request: Request, ...args: any[]) => {
      const rateLimitResponse = checkRateLimit(request, config);

      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      return handler(request, ...args);
    };
  };
}

/**
 * Reset rate limit for a specific key (useful for testing)
 */
export function resetRateLimit(request: Request, identifier?: string): void {
  const key = getRateLimitKey(request, identifier);
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limit data (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get current rate limit status for a key
 */
export function getRateLimitStatus(
  request: Request,
  config: RateLimitConfig
): {
  remaining: number;
  resetAt: number;
  isLimited: boolean;
} {
  const key = getRateLimitKey(request, config.identifier);
  const entry = rateLimitStore.get(key);
  const now = Date.now();

  if (!entry || entry.resetAt < now) {
    return {
      remaining: config.maxRequests,
      resetAt: now + config.windowMs,
      isLimited: false,
    };
  }

  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    remaining,
    resetAt: entry.resetAt,
    isLimited: remaining === 0,
  };
}
