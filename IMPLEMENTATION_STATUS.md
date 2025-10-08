# K9CREST Security Implementation Status

**Last Updated:** 2025-01-05
**Phase:** 1 & 2 (Security Foundation & Auth Hardening)

---

## ✅ COMPLETED FIXES (7/20)

### Phase 1: Security Foundation

#### ✅ 1.1: Removed Hardcoded Admin Bypass
- **File:** `src/components/auth-provider.tsx`
- **Change:** Removed dangerous client-side admin override for `joseph@crucibleanalytics.dev`
- **Impact:** Eliminated critical security vulnerability allowing authentication bypass

#### ✅ 1.2: Created Server-Side Auth Middleware
- **File:** `src/lib/auth-middleware.ts` (NEW)
- **Features:**
  - `verifyAuthToken()` - Cryptographic token verification
  - `withAuth()` - Middleware for authenticated routes
  - `withRole()` - Middleware for role-based access control
  - `addSecurityHeaders()` - Standard security headers
  - `compose()` - Middleware composition utility
- **Impact:** Centralized, secure authentication for all API routes

#### ✅ 1.3: Moved Firebase Config to Environment Variables
- **Files:**
  - `src/lib/firebaseConfig.ts` - Now uses `process.env`
  - `.env.example` - Updated with all required variables
- **Impact:** Better configuration management, prevents credential leakage

#### ✅ 1.4: Created Role Verification API Endpoint
- **File:** `src/app/api/auth/verify-role/route.ts` (NEW)
- **Features:** Server-side token verification and role extraction
- **Impact:** Replaces unsafe client-side JWT decoding

#### ✅ 1.5: Added Zod Validation to /api/schedule
- **File:** `src/app/api/schedule/route.ts`
- **Changes:**
  - Refactored to use `withRole` middleware
  - Added `ScheduleInputSchema` validation
  - Improved error handling with `sanitizeError`
  - Added security headers via `addSecurityHeaders`
- **Impact:** Prevents NoSQL injection, validates all inputs

#### ✅ 1.6: Added Zod Validation to /api/admin/set-role
- **File:** `src/app/api/admin/set-role/route.ts`
- **Changes:**
  - Added `SetRoleSchema` with enum validation
  - Prevents admins from removing their own privileges
  - Tracks who made role changes (`updatedBy`)
  - Uses `withRole` middleware
- **Impact:** Secure role management with audit trail

#### ✅ 1.7: Added Zod Validation to /api/events/[id]
- **File:** `src/app/api/events/[id]/route.ts`
- **Changes:**
  - Added `EventIdSchema` validation
  - Added existence check before deletion
  - Added batch size limit (500 competitors max)
  - Logs deletion events with admin UID
- **Impact:** Prevents injection attacks, adds safeguards

#### ✅ 1.8: Implemented Rate Limiting Utility
- **File:** `src/lib/rate-limiter.ts` (NEW)
- **Features:**
  - In-memory rate limiting (production: use Redis/Upstash)
  - IP-based tracking with proxy support
  - `withRateLimit()` middleware
  - Garbage collection for expired entries
  - Rate limit status checking
- **Impact:** Prevents brute force attacks and API abuse

---

## 🚧 IN PROGRESS / REMAINING FIXES (13/20)

### Phase 1: Security Foundation (Remaining)

#### 🔲 1.9: Add Rate Limiting to Authentication Endpoints
**Priority:** CRITICAL
**Estimated Time:** 15 minutes

**Implementation:**
```typescript
// src/app/page.tsx (login page)
import { checkRateLimit } from '@/lib/rate-limiter';

// Wrap login handler with rate limiting (client-side can't enforce, need server endpoint)
// BETTER: Create /api/auth/login endpoint

// src/app/api/auth/login/route.ts (NEW FILE NEEDED)
import { withRateLimit } from '@/lib/rate-limiter';
import { signInWithEmailAndPassword } from 'firebase/auth';

export const POST = withRateLimit({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  identifier: 'auth-login'
})(async (req) => {
  // Login logic here
});
```

**Files to Modify:**
- Create: `src/app/api/auth/login/route.ts`
- Update: `src/app/page.tsx` to call API instead of direct Firebase

---

#### 🔲 1.10: Implement CSRF Token Generation and Validation
**Priority:** HIGH
**Estimated Time:** 45 minutes

**Implementation:**
```typescript
// src/lib/csrf.ts (NEW FILE NEEDED)
import { cookies } from 'next/headers';
import crypto from 'crypto';

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setCSRFCookie(token: string): void {
  cookies().set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export function validateCSRFToken(request: Request): boolean {
  const cookieToken = cookies().get('csrf-token')?.value;
  const headerToken = request.headers.get('x-csrf-token');

  return cookieToken && headerToken && cookieToken === headerToken;
}

export function withCSRF(handler: Function) {
  return async (request: Request, ...args: any[]) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      if (!validateCSRFToken(request)) {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }

    return handler(request, ...args);
  };
}
```

**Files to Create:**
- `src/lib/csrf.ts`

**Files to Modify:**
- Update all POST/PUT/DELETE API routes to use `withCSRF`
- Update client-side fetch calls to include CSRF token

---

#### 🔲 1.11: Fix useToast Memory Leak
**Priority:** HIGH
**Estimated Time:** 5 minutes

**Implementation:**
```typescript
// src/hooks/use-toast.ts
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, []) // CHANGE: Remove 'state' from dependency array

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}
```

**Files to Modify:**
- `src/hooks/use-toast.ts:185` - Change `}, [state])` to `}, [])`

---

#### 🔲 1.12: Sanitize All Error Messages
**Priority:** MEDIUM
**Estimated Time:** 30 minutes

**Files to Audit:**
- `src/app/page.tsx` - Login/signup error handling
- `src/app/dashboard/**/*.tsx` - All dashboard pages
- All remaining API routes

**Pattern to Apply:**
```typescript
import { sanitizeError } from '@/lib/security';

try {
  // ... operation
} catch (error) {
  const sanitized = sanitizeError(error);
  toast({
    variant: "destructive",
    title: "Error",
    description: sanitized.message, // NOT error.message
  });
  console.error('Full error (server-side only):', error); // Log full error
}
```

---

### Phase 2: Auth Hardening

#### 🔲 2.1: Create HTTP-Only Cookie Session Management
**Priority:** HIGH
**Estimated Time:** 1-2 hours

**Why:** Current Bearer token approach stores tokens in localStorage (XSS vulnerable)

**Implementation:**
```typescript
// src/lib/session.ts (NEW FILE NEEDED)
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function createSession(uid: string, role: string) {
  const token = await new SignJWT({ uid, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  cookies().set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

export async function getSession() {
  const token = cookies().get('session')?.value;

  if (!token) return null;

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload;
  } catch {
    return null;
  }
}

export function destroySession() {
  cookies().delete('session');
}
```

**Files to Create:**
- `src/lib/session.ts`

**Files to Modify:**
- Update login flow to create session cookie
- Update auth middleware to read from cookie instead of Bearer header
- Update logout to destroy session

---

#### 🔲 2.2-2.4: Update Firestore Security Rules
**Priority:** CRITICAL
**Estimated Time:** 2-3 hours

**Current Risk:** Frontend can directly write to Firestore, bypassing API validation

**Implementation:**
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() && request.auth.token.role == 'admin';
    }

    function isJudge() {
      return isSignedIn() && request.auth.token.role == 'judge';
    }

    // Events collection
    match /events/{eventId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isAdmin();

      // Competitors subcollection
      match /competitors/{competitorId} {
        allow read: if isSignedIn();
        allow create, update, delete: if isAdmin();
      }

      // Arenas subcollection
      match /arenas/{arenaId} {
        allow read: if isSignedIn();
        allow create, update, delete: if isAdmin();
      }

      // Schedule subcollection
      match /schedule/{scheduleId} {
        allow read: if isSignedIn();
        allow create, update, delete: if isAdmin();
      }
    }

    // Rubrics collection
    match /rubrics/{rubricId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isAdmin();
    }

    // Scores collection
    match /scores/{scoreId} {
      allow read: if isSignedIn();
      allow create, update: if isJudge() || isAdmin();
      allow delete: if isAdmin();
    }

    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn();
      allow update: if isAdmin() || request.auth.uid == userId;
      allow create, delete: if isAdmin();
    }
  }
}
```

**Files to Modify:**
- `firestore.rules`

**Test with:**
```bash
npm install -g @firebase/rules-unit-testing
# Create tests/firestore-rules.test.ts
```

---

#### 🔲 2.5-2.7: Write Comprehensive Tests
**Priority:** HIGH
**Estimated Time:** 8-12 hours total

**2.5: Authentication Tests (20 tests)**

```typescript
// tests/integration/auth/signin.test.ts
import { describe, it, expect } from 'vitest';

describe('Authentication Integration Tests', () => {
  it('allows valid email/password login', async () => {
    // Test implementation
  });

  it('rejects invalid credentials', async () => {
    // Test implementation
  });

  // ... 18 more tests
});
```

**2.6: API Route Security Tests (15 tests)**

```typescript
// tests/integration/api/auth.test.ts
describe('API Route Security', () => {
  it('rejects requests without authorization header', async () => {
    // Test implementation
  });

  // ... 14 more tests
});
```

**2.7: Firestore Security Rules Tests (15 tests)**

```typescript
// tests/integration/firestore-rules.test.ts
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

describe('Firestore Security Rules', () => {
  it('allows admin to create events', async () => {
    // Test implementation
  });

  // ... 14 more tests
});
```

**Files to Create:**
- `tests/integration/auth/signin.test.ts`
- `tests/integration/auth/oauth.test.ts`
- `tests/integration/auth/roles.test.ts`
- `tests/integration/api/schedule.test.ts`
- `tests/integration/api/admin.test.ts`
- `tests/integration/firestore-rules.test.ts`

---

#### 🔲 2.8: Update CI/CD to Run Tests
**Priority:** CRITICAL
**Estimated Time:** 30 minutes

**Implementation:**
```yaml
# .github/workflows/deploy.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      # NEW: Run tests
      - name: Run unit tests
        run: npm run test:unit -- --run

      - name: Start Firebase Emulator
        run: |
          npm install -g firebase-tools
          firebase emulators:start --only auth,firestore &
          sleep 10

      - name: Run integration tests
        run: npm run test:integration -- --run
        env:
          FIRESTORE_EMULATOR_HOST: localhost:8080
          FIREBASE_AUTH_EMULATOR_HOST: localhost:9099

      - name: Build application
        run: npm run build

  deploy:
    needs: test # Only deploy if tests pass
    runs-on: ubuntu-latest
    # ... deployment steps
```

**Files to Modify:**
- `.github/workflows/deploy.yml`
- `.github/workflows/vercel-deploy.yml`

---

## 📊 Progress Summary

| Phase | Completed | Remaining | Progress |
|:------|:----------|:----------|:---------|
| Phase 1 | 8/12 | 4 | 67% |
| Phase 2 | 0/8 | 8 | 0% |
| **Total** | **8/20** | **12** | **40%** |

---

## 🎯 Next Steps (Recommended Order)

### Immediate (Today)
1. ✅ Fix useToast memory leak (5 min)
2. ✅ Add rate limiting to auth endpoints (15 min)
3. ✅ Sanitize error messages in login page (10 min)

### This Week
4. ✅ Implement CSRF protection (45 min)
5. ✅ Update Firestore security rules (2-3 hours)
6. ✅ Create HTTP-only session management (1-2 hours)

### Next Week
7. ✅ Write authentication integration tests (4 hours)
8. ✅ Write API route security tests (3 hours)
9. ✅ Write Firestore rules tests (2 hours)
10. ✅ Update CI/CD pipelines (30 min)

---

## 🚀 Quick Commands

```bash
# Test current implementation
npm run dev

# Run type checking
npm run typecheck

# Run linter
npm run lint

# Build for production
npm run build

# Deploy to Firebase (after tests pass)
firebase deploy --only hosting

# Deploy to Vercel
vercel --prod
```

---

## 📝 Notes

### Environment Variables Required
Ensure `.env.local` has all variables from `.env.example`:
- ✅ Firebase Client Config (7 vars)
- ✅ Firebase Admin SDK (3 vars)
- ✅ Google API Keys (4 vars)
- ✅ Resend Email (2 vars)
- ⚠️ JWT_SECRET (add for session management)

### Security Checklist
- [x] Admin bypass removed
- [x] Server-side auth middleware
- [x] Environment variables
- [x] Input validation (3 API routes)
- [x] Rate limiting utility
- [ ] Rate limiting on auth
- [ ] CSRF protection
- [ ] HTTP-only cookies
- [ ] Firestore security rules
- [ ] Comprehensive tests
- [ ] CI/CD integration

---

## 🆘 Getting Help

If you encounter issues:
1. Check the audit reports: `COMPREHENSIVE_SECURITY_AUDIT.md`
2. Review the architecture roadmap: `ARCHITECTURE_ROADMAP.md`
3. Consult the priority matrix: `PRIORITY_MATRIX.md`
4. Test with Firebase emulator: `firebase emulators:start`

---

**Document Version:** 1.0
**Last Review:** 2025-01-05
**Next Review:** After Phase 1 completion
