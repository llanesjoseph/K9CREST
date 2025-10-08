# Quick Start Guide: Phase 1, Milestone 1

**Goal:** Remove hardcoded admin bypass and implement server-side authentication (Week 1)

**Time Estimate:** 3-5 days

---

## Step 1: Create Server-Side Middleware (Day 1)

### 1.1 Create Middleware File

```bash
# Create the file
touch src/middleware.ts
```

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // For now, just pass through - we'll implement auth in next steps
  const response = NextResponse.next();

  // Add CSRF protection header
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
};
```

### 1.2 Test Middleware

```bash
npm run dev
# Navigate to http://localhost:3000/dashboard
# Check browser DevTools → Network → Headers for security headers
```

---

## Step 2: Create Auth API Routes (Day 1-2)

### 2.1 Create Login Route

```bash
# Create directory
mkdir -p src/app/api/auth/login

# Create file
touch src/app/api/auth/login/route.ts
```

```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token required' },
        { status: 400 }
      );
    }

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Create session cookie (5 days)
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in ms
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || 'spectator',
      }
    });

    // Set HTTP-only cookie
    response.cookies.set('session', sessionCookie, {
      maxAge: expiresIn / 1000, // maxAge is in seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}
```

### 2.2 Create Logout Route

```bash
mkdir -p src/app/api/auth/logout
touch src/app/api/auth/logout/route.ts
```

```typescript
// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;

  if (sessionCookie) {
    try {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
      await adminAuth.revokeRefreshTokens(decodedClaims.sub);
    } catch (error) {
      // Session already invalid, continue with logout
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('session');
  return response;
}
```

### 2.3 Create Profile Route

```bash
mkdir -p src/app/api/auth/profile
touch src/app/api/auth/profile/route.ts
```

```typescript
// src/app/api/auth/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;

  if (!sessionCookie) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);

    return NextResponse.json({
      uid: decodedClaims.uid,
      email: decodedClaims.email,
      role: decodedClaims.role || 'spectator',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }
}
```

### 2.4 Update Firebase Admin SDK

Check if you have firebase-admin initialized correctly:

```typescript
// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
```

---

## Step 3: Update Auth Provider (Day 2-3)

### 3.1 Add Feature Flag

```bash
# Add to .env.local
echo "ENABLE_NEW_AUTH=true" >> .env.local
```

### 3.2 Update auth-provider.tsx

```typescript
// src/components/auth-provider.tsx (UPDATED)
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export type UserRole = 'admin' | 'judge' | 'competitor' | 'spectator';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: 'spectator',
  isAdmin: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('spectator');

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get ID token
          const idToken = await firebaseUser.getIdToken();

          // Send to server to create session
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });

          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            setRole(loginData.user.role || 'spectator');
            setUser(firebaseUser);
          } else {
            throw new Error('Login failed');
          }
        } catch (error) {
          console.error('Auth error:', error);
          setRole('spectator');
          setUser(null);
        }
      } else {
        setUser(null);
        setRole('spectator');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user && !pathname.startsWith('/auth') && pathname !== '/') {
      router.push('/');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const value = {
    user,
    loading,
    role,
    isAdmin: role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

**Key Changes:**
1. Removed hardcoded admin bypass (lines 44-64)
2. Call `/api/auth/login` after Firebase sign-in
3. Get role from server response (not client-side JWT decode)

---

## Step 4: Update Middleware with Auth Verification (Day 3-4)

```typescript
// src/middleware.ts (UPDATED)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value;

  // Public routes that don't require auth
  const publicRoutes = ['/api/health', '/api/auth/login', '/api/auth/logout'];
  if (publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!sessionCookie) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // Verify session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = decodedClaims.role || 'spectator';

    // Check admin routes
    if (request.nextUrl.pathname.startsWith('/dashboard/admin') ||
        request.nextUrl.pathname.startsWith('/dashboard/users') ||
        request.nextUrl.pathname.startsWith('/api/admin')) {
      if (role !== 'admin') {
        if (request.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Add user info to request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decodedClaims.uid);
    requestHeaders.set('x-user-role', role);
    requestHeaders.set('x-user-email', decodedClaims.email || '');

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;
  } catch (error) {
    console.error('Auth middleware error:', error);

    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
};
```

---

## Step 5: Testing (Day 4-5)

### 5.1 Manual Testing Checklist

```bash
# Start dev server
npm run dev
```

1. **Test Login Flow:**
   - Go to `http://localhost:3000`
   - Sign in with `joseph@crucibleanalytics.dev`
   - Check browser DevTools → Application → Cookies → `session` cookie exists
   - Verify redirected to `/dashboard`

2. **Test Admin Access:**
   - Navigate to `/dashboard/users` (admin route)
   - Should see user management page
   - Check DevTools → Network → request headers include `x-user-role: admin`

3. **Test Non-Admin Access:**
   - Sign out
   - Sign in with a non-admin account
   - Try to access `/dashboard/users`
   - Should be redirected to `/dashboard` (or see 403)

4. **Test Session Persistence:**
   - Refresh the page
   - Should stay logged in (session cookie persists)

5. **Test Logout:**
   - Click logout
   - Session cookie should be deleted
   - Should be redirected to home page

### 5.2 Automated Testing

```typescript
// tests/api/auth.test.ts (NEW FILE)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { POST as logoutPost } from '@/app/api/auth/logout/route';
import { GET as profileGet } from '@/app/api/auth/profile/route';

// Mock Firebase Admin
vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
    createSessionCookie: vi.fn(),
    verifySessionCookie: vi.fn(),
    revokeRefreshTokens: vi.fn(),
  },
}));

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create session cookie on valid token', async () => {
    const mockIdToken = 'valid-id-token';
    const mockSessionCookie = 'session-cookie-value';

    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({
      uid: 'user-123',
      email: 'test@example.com',
      role: 'admin',
    } as any);

    vi.mocked(adminAuth.createSessionCookie).mockResolvedValue(mockSessionCookie);

    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ idToken: mockIdToken }),
    });

    const response = await loginPost(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.role).toBe('admin');
    expect(response.cookies.get('session')).toBeDefined();
  });

  it('should return 400 on missing token', async () => {
    const req = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await loginPost(req as any);
    expect(response.status).toBe(400);
  });
});
```

```bash
# Run tests
npm run test
```

---

## Step 6: Verification Checklist

Before proceeding to Milestone 2:

- [ ] Session cookie is created on login
- [ ] Session cookie is HTTP-only, Secure (in production)
- [ ] Session cookie is verified in middleware
- [ ] Admin routes are protected (403 for non-admins)
- [ ] API routes are protected (401 without session)
- [ ] Logout clears session cookie
- [ ] All manual tests pass
- [ ] Automated tests pass
- [ ] No console errors in browser
- [ ] No errors in server logs

---

## Common Issues & Solutions

### Issue 1: Firebase Admin Not Initialized

**Error:** `app/no-app` or `Firebase Admin not initialized`

**Solution:**
```typescript
// Check .env.local has these variables:
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Issue 2: Session Cookie Not Set

**Error:** Cookie doesn't appear in browser

**Solution:**
```typescript
// Check response headers in DevTools
// Ensure maxAge is in seconds, not milliseconds
response.cookies.set('session', sessionCookie, {
  maxAge: expiresIn / 1000, // MUST be in seconds
  httpOnly: true,
  // ...
});
```

### Issue 3: Middleware Not Running

**Error:** Middleware doesn't intercept requests

**Solution:**
```typescript
// Verify matcher pattern in middleware.ts
export const config = {
  matcher: [
    '/dashboard/:path*',  // Matches /dashboard/events, /dashboard/users, etc.
    '/api/:path*',        // Matches /api/events, /api/auth/profile, etc.
  ],
};
```

### Issue 4: CORS Errors

**Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution:**
```typescript
// Add CORS headers to API responses
const response = NextResponse.json({ ... });
response.headers.set('Access-Control-Allow-Origin', '*');
return response;
```

---

## Next Steps

Once Milestone 1 is complete:

1. **Milestone 2:** Remove hardcoded bypass from auth-provider.tsx
2. **Milestone 3:** Deploy to staging and monitor
3. **Phase 2:** Add input validation and rate limiting

---

## Getting Help

If you get stuck:

1. Check browser DevTools → Console for errors
2. Check server logs (`npm run dev` terminal output)
3. Verify environment variables are set correctly
4. Review Firebase Admin SDK documentation
5. Check Next.js middleware documentation

---

**Estimated Time:** 3-5 days for experienced developers

**Priority:** CRITICAL - Begin immediately

**Success Criteria:** No hardcoded admin bypass, all auth verified server-side
