import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseAdmin } from '@/lib/firebase-admin';

// Ensure Firebase Admin is initialized
firebaseAdmin;

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized - Missing authentication token' }, { status: 401 });
    }

    // Verify the token to get the user
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch (authError) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Check if the user is joseph@crucibleanalytics.dev
    const targetAdminEmail = 'joseph@crucibleanalytics.dev';
    const userRecord = await getAuth().getUser(decoded.uid);

    if (userRecord.email !== targetAdminEmail) {
      return NextResponse.json({
        error: 'Forbidden - Only the designated admin can use this endpoint'
      }, { status: 403 });
    }

    // Set admin role
    await getAuth().setCustomUserClaims(decoded.uid, { role: 'admin' });

    // Also set in Firestore
    const db = getFirestore();
    await db.collection('users').doc(decoded.uid).set({
      email: targetAdminEmail,
      role: 'admin',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log('Bootstrap admin set:', {
      email: targetAdminEmail,
      uid: decoded.uid,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Admin role successfully set for ${targetAdminEmail}`,
      uid: decoded.uid
    });

  } catch (error: any) {
    console.error('Error in bootstrap admin:', error);

    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      error: 'Internal server error - Please try again later'
    }, { status: 500 });
  }
}