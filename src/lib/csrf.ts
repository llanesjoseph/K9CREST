/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * Implements Double Submit Cookie pattern for CSRF protection
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set CSRF token as HTTP-only cookie
 */
export function setCSRFCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return response;
}

/**
 * Validate CSRF token from request
 * Uses Double Submit Cookie pattern
 */
export function validateCSRFToken(request: Request): boolean {
  // GET and HEAD requests don't need CSRF validation
  if (request.method === 'GET' || request.method === 'HEAD') {
    return true;
  }

  const cookieToken = request.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith('csrf-token='))
    ?.split('=')[1];

  const headerToken = request.headers.get('x-csrf-token');

  // Both tokens must exist and match
  if (!cookieToken || !headerToken) {
    console.warn('CSRF validation failed: Missing token', {
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
    });
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );
}

/**
 * Middleware wrapper that enforces CSRF protection
 *
 * @example
 * export const POST = compose(
 *   withCSRF,
 *   withRole('admin')
 * )(async (req, context) => {
 *   return NextResponse.json({ ok: true });
 * });
 */
export function withCSRF(handler: Function) {
  return async (request: Request, ...args: any[]) => {
    if (!validateCSRFToken(request)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token - Request rejected' },
        { status: 403 }
      );
    }

    return handler(request, ...args);
  };
}

/**
 * Get CSRF token from request (for use in forms)
 */
export function getCSRFToken(request: Request): string | null {
  return request.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith('csrf-token='))
    ?.split('=')[1] || null;
}
