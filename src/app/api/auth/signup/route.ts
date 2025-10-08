/**
 * Signup Endpoint with Rate Limiting
 *
 * Protects against automated account creation attacks
 */

import { NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { adminDb } from '@/lib/firebase-admin';
import { withRateLimit } from '@/lib/rate-limiter';
import { sanitizeError } from '@/lib/security';
import { z } from 'zod';

// Input validation schema
const SignupSchema = z.object({
  email: z.string().email('Invalid email format').max(100),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Rate limit: 3 signups per hour per IP (stricter than login)
export const POST = withRateLimit({
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  identifier: 'auth-signup',
})(async (req: Request) => {
  try {
    // Validate input
    const body = await req.json();
    const input = SignupSchema.parse(body);

    // Create user with Firebase
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      input.email,
      input.password
    );

    // Create user profile in Firestore with default spectator role
    await adminDb.collection('users').doc(userCredential.user.uid).set({
      email: input.email,
      role: 'spectator',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('New user created:', {
      uid: userCredential.user.uid,
      email: input.email,
      timestamp: new Date().toISOString(),
    });

    // Get ID token for the client
    const idToken = await userCredential.user.getIdToken();

    // Return success
    return NextResponse.json({
      success: true,
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      token: idToken,
      message: 'Account created successfully. Please log in.',
    });
  } catch (error: any) {
    console.error('Signup error:', {
      timestamp: new Date().toISOString(),
      error: error.code || error.message,
    });

    // Handle Firebase auth errors
    if (error.code === 'auth/email-already-in-use') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    if (error.code === 'auth/weak-password') {
      return NextResponse.json(
        { error: 'Password is too weak. Please use a stronger password.' },
        { status: 400 }
      );
    }

    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    // Generic error for anything else
    const sanitized = sanitizeError(error);
    return NextResponse.json(sanitized, { status: 500 });
  }
});
