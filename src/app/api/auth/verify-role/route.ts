/**
 * Role Verification Endpoint
 *
 * Securely verifies Firebase ID tokens and returns user role.
 * Used by client-side AuthProvider to get authenticated role.
 */

import { NextResponse } from 'next/server';
import { withAuth, addSecurityHeaders } from '@/lib/auth-middleware';

export const GET = withAuth(async (request, authContext) => {
  // Return verified user info from server-side token validation
  const response = NextResponse.json({
    uid: authContext.uid,
    email: authContext.email,
    role: authContext.role,
  });

  return addSecurityHeaders(response);
});
