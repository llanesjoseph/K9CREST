import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { firebaseAdmin } from '@/lib/firebase-admin';

// Ensure Firebase Admin is initialized
firebaseAdmin;

export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATION CHECK
    const authHeader = request.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized - Missing authentication token' }, { status: 401 });
    }

    // 2. VERIFY TOKEN AND CHECK ADMIN ROLE
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch (authError) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // 3. AUTHORIZATION CHECK - Only existing admins can promote users
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // 4. INPUT VALIDATION
    const { email, role } = await request.json();
    
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!role || !['admin', 'judge', 'competitor', 'spectator'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    // 5. EMAIL DOMAIN VALIDATION (Configurable)
    const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || '').split(',').filter(Boolean);
    const emailDomain = email.split('@')[1];
    
    if (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain)) {
      return NextResponse.json({ error: 'Email domain not authorized' }, { status: 403 });
    }

    // 6. GET USER AND SET ROLE
    const userRecord = await getAuth().getUserByEmail(email);
    await getAuth().setCustomUserClaims(userRecord.uid, { role });

    // 7. LOG THE ACTION (Security audit trail)
    console.log('Admin role change:', {
      adminId: decoded.uid,
      targetEmail: email,
      targetUid: userRecord.uid,
      newRole: role,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Role '${role}' successfully assigned to ${email}`
    });

  } catch (error: any) {
    // SECURE ERROR HANDLING
    console.error('Error setting user role:', {
      error: error.message,
      timestamp: new Date().toISOString(),
      // Don't log full error object to prevent information disclosure
    });

    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      error: 'Internal server error - Please try again later' 
    }, { status: 500 });
  }
}