/**
 * Login Endpoint with Rate Limiting
 *
 * Protects against brute force attacks by limiting login attempts
 */

import { NextResponse } from 'next/server';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { withRateLimit } from '@/lib/rate-limiter';
import { sanitizeError } from '@/lib/security';
import { z } from 'zod';

// Input validation schema
const LoginSchema = z.object({
  email: z.string().email('Invalid email format').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

// Rate limit: 5 attempts per 15 minutes per IP
export const POST = withRateLimit({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  identifier: 'auth-login',
})(async (req: Request) => {
  try {
    // Validate input
    const body = await req.json();
    const input = LoginSchema.parse(body);

    // Attempt login with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      input.email,
      input.password
    );

    // Get ID token for the client
    const idToken = await userCredential.user.getIdToken();

    // Return success with token
    return NextResponse.json({
      success: true,
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      token: idToken,
    });
  } catch (error: any) {
    console.error('Login error:', {
      timestamp: new Date().toISOString(),
      error: error.code || error.message,
      // Don't log email to prevent info leakage
    });

    // Handle Firebase auth errors
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (error.code === 'auth/too-many-requests') {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email or password format' },
        { status: 400 }
      );
    }

    // Generic error for anything else
    const sanitized = sanitizeError(error);
    return NextResponse.json(sanitized, { status: 500 });
  }
});
