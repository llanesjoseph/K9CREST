/**
 * Server-side Authentication Middleware
 *
 * Provides secure authentication and authorization utilities for API routes.
 * All token verification is done server-side using Firebase Admin SDK.
 */

import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { sanitizeError } from './security';

export type UserRole = 'admin' | 'judge' | 'competitor' | 'spectator';

export interface AuthContext {
  uid: string;
  email: string | undefined;
  role: UserRole;
  decodedToken: DecodedIdToken;
}

/**
 * Extract and verify Firebase ID token from Authorization header
 */
export async function verifyAuthToken(request: Request): Promise<AuthContext | null> {
  try {
    const authHeader = request.headers.get('authorization') || '';

    if (!authHeader.startsWith('Bearer ')) {
      return null;
    }

    const idToken = authHeader.slice(7);

    if (!idToken) {
      return null;
    }

    // Cryptographically verify the token using Firebase Admin SDK
    const decodedToken = await getAuth().verifyIdToken(idToken);

    // Extract role from custom claims (default to 'spectator' if not set)
    const role = (decodedToken.role as UserRole) || 'spectator';

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
      decodedToken,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Middleware wrapper for API routes requiring authentication
 *
 * @example
 * export const GET = withAuth(async (req, authContext) => {
 *   return NextResponse.json({ uid: authContext.uid });
 * });
 */
export function withAuth(
  handler: (request: Request, authContext: AuthContext) => Promise<Response>
) {
  return async (request: Request) => {
    try {
      const authContext = await verifyAuthToken(request);

      if (!authContext) {
        return NextResponse.json(
          { error: 'Unauthorized - Valid authentication required' },
          { status: 401 }
        );
      }

      return handler(request, authContext);
    } catch (error) {
      console.error('Auth middleware error:', error);
      const sanitized = sanitizeError(error);
      return NextResponse.json(sanitized, { status: 500 });
    }
  };
}

/**
 * Middleware wrapper for API routes requiring specific role
 *
 * @example
 * export const DELETE = withRole('admin', async (req, authContext) => {
 *   // Only admins can access this
 *   return NextResponse.json({ ok: true });
 * });
 */
export function withRole(
  requiredRole: UserRole | UserRole[],
  handler: (request: Request, authContext: AuthContext, context?: any) => Promise<Response>
) {
  return async (request: Request, context?: any) => {
    try {
      const authContext = await verifyAuthToken(request);

      if (!authContext) {
        return NextResponse.json(
          { error: 'Unauthorized - Valid authentication required' },
          { status: 401 }
        );
      }

      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

      if (!allowedRoles.includes(authContext.role)) {
        return NextResponse.json(
          {
            error: 'Forbidden - Insufficient permissions',
            required: allowedRoles,
            current: authContext.role
          },
          { status: 403 }
        );
      }

      return handler(request, authContext, context);
    } catch (error) {
      console.error('Auth middleware error:', error);
      const sanitized = sanitizeError(error);
      return NextResponse.json(sanitized, { status: 500 });
    }
  };
}

/**
 * Add standard security headers to all API responses
 */
export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.googleapis.com https://*.google.com https://*.firebaseio.com wss://*.firebaseio.com;"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Combine multiple middleware wrappers
 *
 * @example
 * export const POST = compose(
 *   withRole('admin'),
 *   withRateLimit(10),
 *   withCSRF
 * )(async (req, context) => {
 *   return NextResponse.json({ ok: true });
 * });
 */
export function compose(...middlewares: any[]) {
  return (handler: any) => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
}
