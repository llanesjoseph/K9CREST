/**
 * CSRF Token Generation Endpoint
 *
 * Returns a CSRF token and sets it as an HTTP-only cookie
 */

import { NextResponse } from 'next/server';
import { generateCSRFToken, setCSRFCookie } from '@/lib/csrf';

export async function GET() {
  const token = generateCSRFToken();

  const response = NextResponse.json({
    token,
    message: 'CSRF token generated',
  });

  return setCSRFCookie(response, token);
}
