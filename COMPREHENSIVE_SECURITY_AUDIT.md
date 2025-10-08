# K9CREST Security Audit Report
**Date:** 2025-10-05
**Auditor:** Principal Application Security Engineer (Claude Code)
**Application:** K9CREST - Next.js/Firebase Trial Management System
**Severity Classification:** Critical | High | Medium | Low

---

## Executive Summary

This comprehensive security audit of the K9CREST application identified **13 security vulnerabilities** across multiple severity levels. The application demonstrates **good practices** in several areas (CSP headers, input validation schemas, Firestore security rules), but contains **critical vulnerabilities** that must be addressed immediately before production deployment.

### Findings Summary
- **Critical**: 4 vulnerabilities
- **High**: 3 vulnerabilities
- **Medium**: 4 vulnerabilities
- **Low/Informational**: 2 findings

**Overall Security Posture:** MODERATE-RISK - Requires immediate remediation of critical and high-severity issues before production use.

---

## Vulnerability Findings

### 🟥 Critical

#### **[CWE-540] Exposure of Sensitive Information in Source Code**

**Description:** Firebase private key, Google API keys, and Resend API key are exposed in tracked `.env.local` and `.env.production` files. Git history shows multiple commits with exposed credentials (commits c2cc2d2, 0a2c2d5, 6c24948).

**Location:**
- `C:\Users\bigpe\OneDrive\Desktop\Crucible\K9CREST\.env.local` (lines 12, 16-19, 23)
- `C:\Users\bigpe\OneDrive\Desktop\Crucible\K9CREST\.env.production` (lines 14, 45-48, 51)

**Impact:** An attacker with access to the repository or git history can:
- Gain full administrative access to Firebase project
- Access/modify all Firestore data
- Send unlimited emails via Resend API (billing fraud)
- Abuse Google Maps/AI APIs (quota exhaustion, billing fraud)
- Impersonate the application's service account

**Remediation:**

```bash
# 1. IMMEDIATELY rotate all exposed credentials
# - Generate new Firebase service account key
# - Regenerate Google API keys
# - Regenerate Resend API key

# 2. Remove files from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local .env.production" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push to remote (DANGEROUS - coordinate with team)
git push origin --force --all

# 4. Update .gitignore (already correct)
# Verify .env.local and .env.production are in .gitignore

# 5. Use environment variables in production
# On Vercel/deployment platform, set these as encrypted environment variables
# NEVER commit them to source control again
```

**Reference:**
- [OWASP Top 10 2021 - A02:2021 Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)
- [CWE-540: Inclusion of Sensitive Information in Source Code](https://cwe.mitre.org/data/definitions/540.html)

---

#### **[CWE-798] Hardcoded Firebase Configuration in Source Code**

**Description:** Firebase client configuration including API keys is hardcoded in `src/lib/firebaseConfig.ts` and committed to version control.

**Location:** `C:\Users\bigpe\OneDrive\Desktop\Crucible\K9CREST\src\lib\firebaseConfig.ts` (lines 1-9)

**Impact:** While Firebase client API keys are designed to be public, hardcoding the full configuration makes it trivial for attackers to:
- Identify your Firebase project
- Launch targeted attacks against Firestore security rules
- Abuse authentication endpoints for account enumeration
- Attempt brute-force attacks on security rules

**Remediation:**

```diff
// src/lib/firebaseConfig.ts
+ export const firebaseConfig = {
+   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
+   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
+   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
+   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
+   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
+   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
+   measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
+ };

- export const firebaseConfig = {
-   apiKey: "AIzaSyDQfOtv4r6MF-BhT-YAYnJvDcn-oyIXt_M",
-   authDomain: "k9-trials-tracker.firebaseapp.com",
-   projectId: "k9-trials-tracker",
-   storageBucket: "k9-trials-tracker.firebasestorage.app",
-   messagingSenderId: "174322418803",
-   appId: "1:174322418803:web:8b556b1f6f3d3dc45dd606",
-   measurementId: "G-SS5GVZNWBQ",
- };

export const isFirebaseConfigured = () =>
  Object.values(firebaseConfig).every((v) => typeof v === "string" && v.length > 0);
```

Then set environment variables in `.env.local`:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDQfOtv4r6MF-BhT-YAYnJvDcn-oyIXt_M
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=k9-trials-tracker.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=k9-trials-tracker
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=k9-trials-tracker.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=174322418803
NEXT_PUBLIC_FIREBASE_APP_ID=1:174322418803:web:8b556b1f6f3d3dc45dd606
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-SS5GVZNWBQ
```

**Reference:** [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)

---

#### **[CWE-284] Client-Side Admin Bypass - Hardcoded Email Check**

**Description:** The AuthProvider contains a critical client-side security bypass that forces admin role for a specific email address, completely bypassing server-side authentication.

**Location:** `C:\Users\bigpe\OneDrive\Desktop\Crucible\K9CREST\src\components\auth-provider.tsx` (lines 44-64)

**Vulnerable Code:**
```typescript
// 🚀 AGGRESSIVE ADMIN OVERRIDE: Force joseph@crucibleanalytics.dev to be admin
if (firebaseUser.email === 'joseph@crucibleanalytics.dev') {
  console.log('🔥 ADMIN OVERRIDE ACTIVATED: Force setting joseph@crucibleanalytics.dev as admin');
  setTrueRole('admin');
  setUser(firebaseUser);
  setViewAsRole(null);
  setLoading(false);
  // ... fire and forget bootstrap-admin call
  return;
}
```

**Impact:**
- **Complete authorization bypass**: Client-side role checks can be manipulated via browser DevTools
- Any attacker who gains access to `joseph@crucibleanalytics.dev` account (phishing, password reuse, credential stuffing) instantly becomes admin
- Client-side admin checks provide NO security - all API routes MUST verify role server-side
- This pattern creates a false sense of security and may lead to authorization vulnerabilities elsewhere

**Remediation:**

```diff
// src/components/auth-provider.tsx
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
-     // 🚀 AGGRESSIVE ADMIN OVERRIDE: Force joseph@crucibleanalytics.dev to be admin
-     if (firebaseUser.email === 'joseph@crucibleanalytics.dev') {
-       console.log('🔥 ADMIN OVERRIDE ACTIVATED...');
-       setTrueRole('admin');
-       setUser(firebaseUser);
-       setViewAsRole(null);
-       setLoading(false);
-
-       // Try to set server-side admin claims in background (fire and forget)
-       firebaseUser.getIdToken().then(token => {
-         fetch('/api/bootstrap-admin', { ... }).catch(() => {});
-       }).catch(() => {});
-
-       return;
-     }

      try {
        // Regular user flow - ALWAYS rely on server-set custom claims
        const token = await firebaseUser.getIdToken(true);
        const decoded = JSON.parse(atob(token.split('.')[1] || 'e30='));
        const claimRole = (decoded?.role as UserRole) || 'spectator';
        setTrueRole(claimRole);
        setUser(firebaseUser);
      } catch {
        setTrueRole('spectator');
        setUser(firebaseUser);
      }
    } else {
      setUser(null);
      setTrueRole('spectator');
    }
    setViewAsRole(null);
    setLoading(false);
  });

  return () => unsubscribe();
}, []);
```

**Administrative Bootstrap:** Use the existing `/api/bootstrap-admin` endpoint with proper authentication:
1. User must be authenticated
2. Server verifies email matches `joseph@crucibleanalytics.dev`
3. Server sets custom claims on the Firebase Auth token
4. Client reads the server-set role from JWT token

**Reference:**
- [OWASP Top 10 2021 - A01:2021 Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [CWE-284: Improper Access Control](https://cwe.mitre.org/data/definitions/284.html)

---

#### **[CWE-352] Missing CSRF Protection on State-Changing API Routes**

**Description:** All POST, PATCH, and DELETE API routes lack CSRF token validation. While using Bearer token authentication provides some protection, additional CSRF defense is required for state-changing operations.

**Location:** All API routes in `src/app/api/`
- `/api/admin/set-role/route.ts`
- `/api/bootstrap-admin/route.ts`
- `/api/set-admin/route.ts`
- `/api/schedule/route.ts`
- `/api/bug-report/route.ts`
- `/api/rubrics/[id]/route.ts`
- `/api/events/[id]/route.ts`

**Impact:** An attacker can craft malicious websites that trick authenticated users into making unintended API requests:
- Promoting arbitrary users to admin role
- Deleting events, rubrics, or competitors
- Modifying schedules or judging data
- Sending spam bug reports

**Remediation:**

**Option 1: SameSite Cookie Attribute (Recommended for Next.js)**
Next.js automatically handles session cookies. Ensure cookies use `SameSite=Strict` or `SameSite=Lax`:

```typescript
// src/middleware.ts (create this file)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Set secure cookie attributes
  const secureCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
  };

  // Apply to all Set-Cookie headers
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const updatedCookie = setCookie
      .replace(/SameSite=\w+/gi, 'SameSite=Strict')
      .replace(/;\s*$/, '; Secure; HttpOnly');
    response.headers.set('set-cookie', updatedCookie);
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

**Option 2: Custom CSRF Token (More robust)**
Use the existing `CSRFProtection` class from `src/lib/security.ts`:

```typescript
// Update each API route handler
import { CSRFProtection } from '@/lib/security';

const csrfProtection = new CSRFProtection();

export async function POST(req: Request) {
  // 1. Verify CSRF token
  const csrfToken = req.headers.get('x-csrf-token');
  const sessionId = req.headers.get('authorization')?.slice(7); // Use ID token as session ID

  if (!csrfToken || !sessionId || !csrfProtection.validateToken(sessionId, csrfToken)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  // 2. Continue with authentication and authorization...
}
```

Client-side token generation:
```typescript
// Generate CSRF token on page load
const idToken = await user.getIdToken();
const csrfToken = csrfProtection.generateToken(idToken);

// Include in fetch requests
fetch('/api/admin/set-role', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify(data),
});
```

**Reference:**
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [CWE-352: Cross-Site Request Forgery](https://cwe.mitre.org/data/definitions/352.html)

---

### 🟧 High

#### **[CWE-20] Insufficient Input Validation in API Routes**

**Description:** API routes `/api/rubrics/[id]/route.ts` and `/api/events/[id]/route.ts` accept arbitrary payloads without validation, allowing attackers to inject malicious data into Firestore.

**Location:**
- `C:\Users\bigpe\OneDrive\Desktop\Crucible\K9CREST\src\app\api\rubrics\[id]\route.ts` (line 13)
- `C:\Users\bigpe\OneDrive\Desktop\Crucible\K9CREST\src\app\api\events\[id]\route.ts` (similar pattern)

**Vulnerable Code:**
```typescript
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  // ... auth checks ...
  const payload = await req.json();
  await adminDb.collection('rubrics').doc(params.id).update({
    ...payload,  // ❌ NO VALIDATION - accepts ANY fields
    updatedAt: new Date()
  });
}
```

**Impact:**
- **NoSQL Injection**: Attackers can inject arbitrary fields into Firestore documents
- **Data corruption**: Malicious payloads can overwrite critical fields
- **Schema pollution**: Adding unexpected fields breaks application logic
- **Prototype pollution**: Malicious `__proto__` properties can affect object behavior

**Remediation:**

```typescript
// src/app/api/rubrics/[id]/route.ts
import { z } from 'zod';

const RubricUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  judgingInterface: z.enum(['phases', 'simple']).optional(),
  description: z.string().max(500).optional(),
  phases: z.array(z.object({
    name: z.string().min(1).max(100),
    deductions: z.array(z.object({
      name: z.string().min(1).max(100),
      points: z.number().min(0).max(100),
    })),
  })).optional(),
}).strict(); // .strict() prevents extra fields

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(idToken);
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate ID parameter
    if (!params.id || !/^[a-zA-Z0-9_-]+$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid rubric ID' }, { status: 400 });
    }

    // Validate request body
    const rawPayload = await req.json();
    const payload = RubricUpdateSchema.parse(rawPayload);

    // Update with validated data only
    await adminDb.collection('rubrics').doc(params.id).update({
      ...payload,
      updatedAt: new Date()
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    console.error('Error updating rubric:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
```

Apply the same pattern to `/api/events/[id]/route.ts` and all other API routes.

**Reference:**
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)

---

#### **[CWE-209] Information Disclosure via Error Messages**

**Description:** Multiple API routes expose detailed error messages including stack traces, internal paths, and database structure to clients.

**Location:** All API routes in `src/app/api/`

**Vulnerable Code:**
```typescript
} catch (error: any) {
  return NextResponse.json({
    error: String(error?.message || error)  // ❌ Exposes internal error details
  }, { status: 500 });
}

// Bug report route
return NextResponse.json(
  { error: 'Failed to process bug report', details: error.message },  // ❌ Exposes error details
  { status: 500 }
);
```

**Impact:**
- **Information leakage**: Error messages reveal internal application structure
- **Attack surface mapping**: Attackers learn about database schema, file paths, dependencies
- **Exploitation assistance**: Stack traces help attackers craft targeted exploits

**Remediation:**

```typescript
// src/app/api/rubrics/[id]/route.ts
import { sanitizeError } from '@/lib/security';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    // ... operation ...
  } catch (error: any) {
    // Log full error server-side for debugging
    console.error('Rubric update error:', {
      rubricId: params.id,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Return sanitized error to client
    const sanitized = sanitizeError(error);
    return NextResponse.json({
      error: sanitized.message,
      code: sanitized.code
    }, { status: 500 });
  }
}
```

Update `sanitizeError` in `src/lib/security.ts`:
```typescript
export function sanitizeError(error: any): { message: string; code?: string } {
  // Don't expose internal error details
  if (error instanceof z.ZodError) {
    return { message: 'Invalid input data', code: 'VALIDATION_ERROR' };
  }

  // Firebase Auth errors
  if (error.code?.startsWith('auth/')) {
    const knownErrors: Record<string, string> = {
      'auth/user-not-found': 'User not found',
      'auth/invalid-credential': 'Invalid credentials',
      'auth/email-already-in-use': 'Email already in use',
      'auth/weak-password': 'Password is too weak',
    };
    return {
      message: knownErrors[error.code] || 'Authentication error',
      code: error.code
    };
  }

  // Firestore errors
  if (error.code === 'permission-denied') {
    return { message: 'Access denied', code: 'PERMISSION_DENIED' };
  }

  if (error.code === 'not-found') {
    return { message: 'Resource not found', code: 'NOT_FOUND' };
  }

  // Generic error for unknown issues - NEVER expose error.message
  return { message: 'An error occurred. Please try again later.', code: 'INTERNAL_ERROR' };
}
```

**Reference:**
- [OWASP Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
- [CWE-209: Generation of Error Message Containing Sensitive Information](https://cwe.mitre.org/data/definitions/209.html)

---

#### **[CWE-307] Missing Rate Limiting on Authentication Endpoints**

**Description:** Authentication endpoints lack rate limiting, allowing unlimited login attempts and potential credential stuffing attacks.

**Location:**
- `C:\Users\bigpe\OneDrive\Desktop\Crucible\K9CREST\src\app\page.tsx` (client-side auth)
- `/api/bootstrap-admin/route.ts`
- `/api/set-admin/route.ts`
- `/api/admin/set-role/route.ts`

**Impact:**
- **Brute force attacks**: Unlimited password guessing attempts
- **Credential stuffing**: Attackers can test leaked credentials at scale
- **Account enumeration**: Determine which email addresses have accounts
- **DoS via resource exhaustion**: Excessive authentication attempts consume Firebase quota

**Remediation:**

**Option 1: Firebase App Check (Recommended)**
Enable Firebase App Check to prevent abuse from non-mobile clients:

```typescript
// src/lib/firebase.ts
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Initialize App Check
if (typeof window !== "undefined") {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
    isTokenAutoRefreshEnabled: true
  });
}
```

**Option 2: Server-side Rate Limiting**
Implement rate limiting on API routes:

```typescript
// src/lib/rate-limiter.ts
import { RateLimiter } from '@/lib/security';

const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 requests per 15 minutes

// src/app/api/bootstrap-admin/route.ts
import { getClientIP } from '@/lib/security';

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  // Rate limit by IP
  if (!authRateLimiter.isAllowed(clientIP)) {
    return NextResponse.json({
      error: 'Too many requests. Please try again later.'
    }, { status: 429 });
  }

  // Continue with authentication...
}
```

**Option 3: Firebase Auth Rate Limiting**
Configure Firebase Auth rate limiting in Firebase Console:
1. Go to Firebase Console → Authentication → Settings
2. Enable "Email enumeration protection"
3. Configure rate limiting rules

**Reference:**
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#account-lockout)
- [CWE-307: Improper Restriction of Excessive Authentication Attempts](https://cwe.mitre.org/data/definitions/307.html)

---

### 🟨 Medium

#### **[CWE-79] Potential XSS via dangerouslySetInnerHTML in Chart Component**

**Description:** The Chart component uses `dangerouslySetInnerHTML` to inject CSS styles without sanitization.

**Location:** `C:\Users\bigpe\OneDrive\Desktop\Crucible\K9CREST\src\components\ui\chart.tsx` (lines 80-99)

**Vulnerable Code:**
```typescript
<style
  dangerouslySetInnerHTML={{
    __html: Object.entries(THEMES)
      .map(([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig.map(([key, itemConfig]) => {
  const color = itemConfig.theme?.[theme] || itemConfig.color;
  return color ? `  --color-${key}: ${color};` : null;
}).join("\n")}
}`)
      .join("\n"),
  }}
/>
```

**Impact:** While `color` values come from the `ChartConfig` prop (developer-controlled), if an attacker can influence these values (e.g., through stored XSS in database), they could inject malicious CSS:
- CSS injection attacks (exfiltrating data via CSS selectors)
- UI redressing attacks
- Low likelihood but still a vulnerability

**Remediation:**

```typescript
// src/components/ui/chart.tsx
const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme || config.color
  );

  if (!colorConfig.length) {
    return null;
  }

  // Sanitize color values to only allow valid CSS colors
  const sanitizeColor = (color: string | undefined): string | null => {
    if (!color) return null;

    // Allow hex colors, rgb(), rgba(), hsl(), hsla(), and CSS color names
    const validColorPattern = /^(#[0-9A-Fa-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-z]+)$/i;
    if (!validColorPattern.test(color)) {
      console.warn(`Invalid color value detected: ${color}`);
      return null;
    }

    // Remove any potential JavaScript
    const sanitized = color.replace(/[<>'"]/g, '');
    return sanitized.substring(0, 100); // Limit length
  };

  const cssText = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const styles = colorConfig
        .map(([key, itemConfig]) => {
          const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
          const sanitized = sanitizeColor(color);
          return sanitized ? `  --color-${key}: ${sanitized};` : null;
        })
        .filter(Boolean)
        .join("\n");

      return `${prefix} [data-chart=${id}] {\n${styles}\n}`;
    })
    .join("\n");

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: cssText,
      }}
    />
  );
};
```

**Better Alternative:** Use CSS-in-JS or CSS Modules to avoid `dangerouslySetInnerHTML`:

```typescript
import { useEffect } from 'react';

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = generateCSS(id, config);
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [id, config]);

  return null;
};
```

**Reference:**
- [React Security Best Practices - dangerouslySetInnerHTML](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)
- [CWE-79: Improper Neutralization of Input During Web Page Generation](https://cwe.mitre.org/data/definitions/79.html)

---

#### **[CWE-1286] Weak Password Requirements**

**Description:** Password validation in the sign-up form only requires 6 characters with no complexity requirements.

**Location:** `C:\Users\bigpe\OneDrive\Desktop\Crucible\K9CREST\src\app\page.tsx` (line 21)

**Vulnerable Code:**
```typescript
const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters."),  // ❌ Weak
});
```

**Impact:**
- **Weak passwords**: Users can create passwords like "123456" or "password"
- **Credential stuffing success**: Weak passwords are easily compromised
- **Brute force vulnerability**: 6-character passwords can be cracked quickly

**Remediation:**

```typescript
// src/app/page.tsx
import { CommonValidationSchemas } from '@/lib/security';

const formSchema = z.object({
  email: CommonValidationSchemas.email,
  password: CommonValidationSchemas.password, // Requires 8+ chars, uppercase, lowercase, number, special char
});

// Update error message display
{errors.password && (
  <div className="text-destructive text-sm">
    <p>{errors.password.message}</p>
    <ul className="text-xs mt-1 ml-4 list-disc">
      <li>At least 8 characters</li>
      <li>Contains uppercase and lowercase letters</li>
      <li>Contains at least one number</li>
      <li>Contains at least one special character (!@#$%^&*)</li>
    </ul>
  </div>
)}
```

Additionally, implement password strength indicator:

```typescript
import { isStrongPassword } from '@/lib/security';
import { useState } from 'react';

const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

const checkPasswordStrength = (password: string) => {
  if (password.length < 8) return 'weak';
  if (!isStrongPassword(password)) return 'medium';
  return 'strong';
};

<Input
  id="password"
  type="password"
  {...register("password")}
  onChange={(e) => setPasswordStrength(checkPasswordStrength(e.target.value))}
/>
<div className={`h-1 w-full mt-1 rounded ${
  passwordStrength === 'weak' ? 'bg-red-500' :
  passwordStrength === 'medium' ? 'bg-yellow-500' :
  'bg-green-500'
}`} />
```

**Reference:**
- [OWASP Authentication Cheat Sheet - Password Strength](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#implement-proper-password-strength-controls)
- [CWE-1286: Improper Validation of Syntactic Correctness of Input](https://cwe.mitre.org/data/definitions/1286.html)

---

#### **[CWE-639] Firestore Security Rule - Missing Document Existence Check**

**Description:** Firestore security rules allow reads/writes based on role without verifying document existence, potentially allowing IDOR (Insecure Direct Object Reference) attacks.

**Location:** `C:\Users\bigpe\OneDrive\Desktop\Crucible\K9CREST\firestore.rules` (lines 66-79, 96-104)

**Vulnerable Code:**
```javascript
// Competitors subcollection
match /competitors/{competitorId} {
  allow read: if isAuthenticated();
  allow create: if isAdmin() && /* validation */;
  allow update: if isAdmin() ||
    (isAuthenticated() &&
     request.resource.data.userId == request.auth.uid &&  // ❌ No check if competitor.userId exists
     /* validation */);
  allow delete: if isAdmin();
}
```

**Impact:**
- **IDOR vulnerability**: A competitor could update another competitor's data if they know the document ID
- **Data manipulation**: Users can claim ownership of documents by adding a `userId` field
- **Authorization bypass**: Insufficient validation allows unintended access

**Remediation:**

```javascript
// firestore.rules
match /competitors/{competitorId} {
  allow read: if isAuthenticated();
  allow create: if isAdmin() &&
    isValidString(request.resource.data.name, 1, 100) &&
    isValidString(request.resource.data.dogName, 1, 100) &&
    isValidString(request.resource.data.agency, 1, 100);

  allow update: if isAdmin() ||
    (isAuthenticated() &&
     // Must verify EXISTING userId matches before allowing update
     resource.data.userId == request.auth.uid &&
     request.resource.data.userId == request.auth.uid &&  // Cannot change userId
     isValidString(request.resource.data.name, 1, 100) &&
     isValidString(request.resource.data.dogName, 1, 100) &&
     isValidString(request.resource.data.agency, 1, 100));

  allow delete: if isAdmin();
}

// Similar fix for judging updates
match /judging/{runId} {
  allow read: if isAuthenticated();
  allow create: if isAdmin();
  allow update: if isAdmin() ||
    (isJudge() &&
     // Verify judge is assigned to this run
     resource.data.judgeId == request.auth.uid &&
     isValidString(request.resource.data.status, 1, 20) &&
     (request.resource.data.totalTime == null ||
      request.resource.data.totalTime is number));
  allow delete: if isAdmin();
}
```

Add judge assignment tracking:
```typescript
// When creating a judging run, assign judgeId
await db.collection('events').doc(eventId)
  .collection('judging').doc(runId)
  .set({
    judgeId: assignedJudgeUid,
    competitorId: competitorId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
```

**Reference:**
- [OWASP IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- [CWE-639: Authorization Bypass Through User-Controlled Key](https://cwe.mitre.org/data/definitions/639.html)

---

#### **[CWE-829] Weak Content Security Policy**

**Description:** Content Security Policy allows `'unsafe-inline'` and `'unsafe-eval'` which significantly weakens XSS protection.

**Location:** `C:\Users\bigpe\OneDrive\Desktop\Crucible\K9CREST\next.config.js` (lines 3-16)

**Vulnerable Code:**
```javascript
const CONTENT_SECURITY_POLICY = (
  [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com ...",  // ❌
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",  // ❌
    // ...
  ].join('; ')
);
```

**Impact:**
- **XSS vulnerability**: `'unsafe-inline'` allows inline scripts, negating CSP's main benefit
- **Eval-based attacks**: `'unsafe-eval'` allows `eval()` and `Function()` constructor
- **Reduced defense in depth**: CSP should be a strong last line of defense

**Remediation:**

Next.js 14 supports nonces for CSP. Implement strict CSP with nonces:

```javascript
// next.config.js
const CONTENT_SECURITY_POLICY = (
  [
    "default-src 'self'",
    "script-src 'self' 'nonce-{NONCE}' 'strict-dynamic' https://www.googletagmanager.com https://www.google-analytics.com https://apis.google.com https://maps.googleapis.com",
    "style-src 'self' 'nonce-{NONCE}' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://placehold.co https://res.cloudinary.com https://lh3.googleusercontent.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://firestore.googleapis.com https://firebasestorage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google-analytics.com https://firebase.googleapis.com https://firebaseinstallations.googleapis.com",
    "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",  // Add this for clickjacking protection
    "upgrade-insecure-requests",  // Add this to upgrade HTTP to HTTPS
  ].join('; ')
);
```

Create middleware to inject nonces:

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

export function middleware(request: NextRequest) {
  const nonce = crypto.randomBytes(16).toString('base64');
  const response = NextResponse.next();

  // Replace {NONCE} placeholder with actual nonce
  const csp = CONTENT_SECURITY_POLICY.replace(/{NONCE}/g, nonce);
  response.headers.set('Content-Security-Policy', csp);

  // Pass nonce to page
  response.headers.set('x-nonce', nonce);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

Use nonces in components:
```typescript
// src/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get('x-nonce') || '';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} src="/some-script.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Reference:**
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [CWE-829: Inclusion of Functionality from Untrusted Control Sphere](https://cwe.mitre.org/data/definitions/829.html)

---

### 🟦 Low / Informational

#### **[INFO] Dependency Vulnerabilities - Moderate Risk**

**Description:** NPM audit reveals moderate-severity vulnerabilities in `@babel/runtime` (ReDoS) and `undici` (affecting Firebase packages).

**Location:** Dependencies in `package.json`

**Impact:**
- `@babel/runtime` (CWE-1333): ReDoS vulnerability (CVSS 6.2) - Low impact for server-side usage
- `undici` vulnerabilities affecting `@firebase/auth`, `@firebase/firestore` - Moderate impact

**Remediation:**

```bash
# Update all dependencies to latest versions
npm audit fix --force

# If that doesn't resolve all issues, manually update:
npm update @babel/runtime firebase firebase-admin

# For remaining vulnerabilities, check if patches are available:
npm audit
```

**Verification:**
```bash
npm audit --production
```

Expected output should show 0 critical/high vulnerabilities.

**Reference:** [NPM Audit Documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit)

---

#### **[INFO] Missing HTTP Security Headers in API Responses**

**Description:** API routes apply security headers inconsistently. Only `/api/schedule/route.ts` implements comprehensive security headers.

**Location:** Most API routes in `src/app/api/`

**Impact:** Low - Next.js applies global security headers via `next.config.js`, but API routes should reinforce these for defense in depth.

**Remediation:**

Create a helper function for consistent API responses:

```typescript
// src/lib/api-response.ts
import { NextResponse } from 'next/server';
import { SECURITY_HEADERS } from '@/lib/security';

export function createSecureResponse(
  data: any,
  status: number = 200
): NextResponse {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      ...SECURITY_HEADERS,
    },
  });
}

export function createErrorResponse(
  error: string,
  status: number = 500
): NextResponse {
  return createSecureResponse({ error }, status);
}
```

Update all API routes:

```typescript
// src/app/api/admin/set-role/route.ts
import { createSecureResponse, createErrorResponse } from '@/lib/api-response';

export async function POST(req: Request) {
  try {
    // ... operation ...
    return createSecureResponse({ ok: true });
  } catch (error: any) {
    return createErrorResponse('Internal server error', 500);
  }
}
```

**Reference:** [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)

---

## Preventative Checklist for Author

Use this checklist before deploying ANY changes to production:

### Authentication & Authorization
- [ ] All API routes verify JWT tokens server-side (never trust client-side role checks)
- [ ] Custom claims are set via Firebase Admin SDK only (never client-side)
- [ ] Role-based access control is enforced at the API level, not just UI level
- [ ] Admin bootstrap endpoints are protected with email verification server-side

### Input Validation & Injection Prevention
- [ ] All API routes use Zod schemas with `.strict()` to validate request payloads
- [ ] Document IDs are validated with regex patterns (only alphanumeric, hyphens, underscores)
- [ ] All user input is sanitized before storage (use functions from `src/lib/security.ts`)
- [ ] Firestore queries never use user input directly without validation

### Secrets & Configuration Management
- [ ] NO secrets in source code (`.env.local`, `.env.production` should NEVER be committed)
- [ ] Firebase config uses environment variables (not hardcoded values)
- [ ] All API keys are stored in Vercel environment variables (encrypted at rest)
- [ ] `.gitignore` properly excludes all `.env*` files except `.env.example`
- [ ] Git history has been cleaned of any previously committed secrets

### Session & Token Management
- [ ] CSRF protection is implemented for all state-changing operations
- [ ] JWT tokens are validated on every API request
- [ ] Tokens are never stored in localStorage (Firebase SDK handles this securely)
- [ ] Session expiration is enforced (Firebase Auth token refresh logic)

### Error Handling & Information Disclosure
- [ ] All API errors use `sanitizeError()` before returning to client
- [ ] Detailed error logs are server-side only (never sent to client)
- [ ] Stack traces are never exposed in production responses
- [ ] HTTP status codes are appropriate (401, 403, 500, etc.)

### Security Headers & Browser Protection
- [ ] Content-Security-Policy is strict (no `unsafe-inline` or `unsafe-eval`)
- [ ] All responses include security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- [ ] HTTPS is enforced in production (Strict-Transport-Security header)
- [ ] Cookies use `Secure`, `HttpOnly`, and `SameSite=Strict` attributes

### Firestore Security Rules
- [ ] All rules verify authentication (`isAuthenticated()`)
- [ ] Role checks use custom claims from JWT tokens
- [ ] IDOR protection: verify `resource.data` before allowing updates
- [ ] Document validation includes field type checks and length limits
- [ ] Subcollections enforce proper parent-child authorization

### Rate Limiting & DoS Prevention
- [ ] Authentication endpoints have rate limiting (5 attempts per 15 minutes)
- [ ] Firebase App Check is enabled for production
- [ ] Large file uploads are limited in size (validate client-side AND server-side)
- [ ] Expensive operations (schedule solving) require admin role

### Dependency Security
- [ ] Run `npm audit` before every deployment
- [ ] All critical/high vulnerabilities are resolved
- [ ] Dependencies are updated regularly (monthly security review)
- [ ] No deprecated or unmaintained packages in production

### Deployment Checklist
- [ ] Rotate ALL exposed secrets before production deployment
- [ ] Enable Firebase Auth email enumeration protection
- [ ] Configure Firestore backup schedule
- [ ] Set up monitoring/alerting for suspicious activity
- [ ] Test authentication flows in production environment
- [ ] Verify security headers are applied (test with securityheaders.com)

---

## Summary of Immediate Actions Required

### URGENT (Before ANY Production Deployment)

1. **Rotate ALL exposed credentials** (Firebase private key, API keys, Resend key)
2. **Remove credentials from git history** using git filter-branch
3. **Remove client-side admin bypass** in AuthProvider (lines 44-64)
4. **Move Firebase config to environment variables** (firebaseConfig.ts)
5. **Add input validation** to `/api/rubrics/[id]` and `/api/events/[id]` routes

### HIGH PRIORITY (Within 1 Week)

6. **Implement CSRF protection** on all POST/PATCH/DELETE routes
7. **Add rate limiting** to authentication endpoints
8. **Sanitize all error messages** using `sanitizeError()` function
9. **Fix Firestore security rules** to prevent IDOR attacks
10. **Upgrade password requirements** to enforce complexity

### MEDIUM PRIORITY (Within 2 Weeks)

11. **Strengthen CSP** by removing `unsafe-inline` and `unsafe-eval`
12. **Sanitize Chart component** to prevent CSS injection
13. **Update dependencies** to resolve moderate vulnerabilities
14. **Add consistent security headers** to all API responses

---

## Testing & Verification

After implementing fixes, verify security with these tools:

### Automated Scanning
```bash
# Dependency vulnerabilities
npm audit --production

# Git secret scanning
git secrets --scan
```

### Manual Testing
1. **Authentication bypass testing**: Attempt to access admin endpoints without proper role
2. **IDOR testing**: Try to modify other users' competitors/judging data
3. **CSRF testing**: Craft cross-origin requests to state-changing endpoints
4. **Input validation**: Send malicious payloads to API routes
5. **Rate limiting**: Attempt rapid-fire authentication requests

### Online Tools
- **Security Headers**: https://securityheaders.com/
- **CSP Evaluator**: https://csp-evaluator.withgoogle.com/
- **Firebase Security Rules**: Use Firebase Emulator with security rules test cases

---

## Conclusion

The K9CREST application has a solid security foundation with Firestore security rules, input validation schemas, and security headers. However, **critical vulnerabilities in credential management, client-side authorization, and API input validation must be resolved before production deployment.**

**Estimated Remediation Time:**
- Critical issues: 4-6 hours
- High priority issues: 8-12 hours
- Medium priority issues: 6-8 hours
- Total: 18-26 hours

**Next Steps:**
1. Address all Critical vulnerabilities immediately
2. Implement High priority fixes within 1 week
3. Schedule Medium priority improvements for next sprint
4. Establish monthly security review process
5. Set up automated security scanning in CI/CD pipeline

---

**Report Generated:** 2025-10-05
**Tools Used:** Manual code review, npm audit, git log analysis
**Frameworks Referenced:** OWASP Top 10 2021, CWE Top 25, SANS Top 25

For questions or clarification on any finding, please refer to the linked OWASP Cheat Sheets and CWE documentation.
