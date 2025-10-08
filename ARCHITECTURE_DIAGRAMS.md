# K9CREST Architecture Diagrams

## Current Architecture (INSECURE)

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Client-Side)                                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  auth-provider.tsx                                  │    │
│  │                                                      │    │
│  │  if (email === 'joseph@crucibleanalytics.dev') {   │    │
│  │    setRole('admin'); // ❌ CLIENT-SIDE DECISION    │    │
│  │  }                                                   │    │
│  │                                                      │    │
│  │  const decoded = JSON.parse(atob(token));           │    │
│  │  const role = decoded.role; // ❌ NO VERIFICATION  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Dashboard Components                               │    │
│  │                                                      │    │
│  │  import { db } from '@/lib/firebase';               │    │
│  │  const events = await getDocs(collection(db));      │    │
│  │  ❌ DIRECT DATABASE ACCESS FROM CLIENT             │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ Direct access (insecure)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Firebase (Backend)                                          │
│                                                              │
│  ┌────────────────────┐    ┌────────────────────────┐      │
│  │  Firestore DB      │    │  Firebase Auth         │      │
│  │  (Weak rules)      │    │  (Client-side bypass)  │      │
│  └────────────────────┘    └────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘

VULNERABILITIES:
1. Client makes security decisions (can be bypassed)
2. Hardcoded admin email in source code
3. No server-side token verification
4. Direct database access from client
5. Weak or missing Firestore security rules
```

---

## Target Architecture (SECURE)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (Client-Side) - UNTRUSTED                                  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  auth-provider.tsx (Client Component)                       │    │
│  │                                                              │    │
│  │  - Manages UI state only                                    │    │
│  │  - Calls server for authentication                          │    │
│  │  - NO security decisions                                    │    │
│  │  - NO role assignment                                       │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Dashboard Pages (Server Components)                        │    │
│  │                                                              │    │
│  │  - Rendered on server                                       │    │
│  │  - NO direct database access                                │    │
│  │  - Data fetched server-side via services                    │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             │ HTTPS requests with session cookie
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Next.js Server (TRUSTED)                                           │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Middleware (Auth Gateway)                                  │    │
│  │                                                              │    │
│  │  1. Extract session cookie                                  │    │
│  │  2. Verify with Firebase Admin SDK                          │    │
│  │  3. Check user role from verified token                     │    │
│  │  4. Allow/deny request based on route permissions           │    │
│  │  ✅ ALL requests go through here                            │    │
│  └────────────────────────────────────────────────────────────┘    │
│                             │                                        │
│                             ▼                                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  API Routes (/api/*)                                        │    │
│  │                                                              │    │
│  │  - Validate input (Zod schemas)                             │    │
│  │  - Rate limiting                                            │    │
│  │  - CSRF protection                                          │    │
│  │  - Business logic routing                                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                             │                                        │
│                             ▼                                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Service Layer                                              │    │
│  │                                                              │    │
│  │  - EventService, CompetitorService, etc.                    │    │
│  │  - Business logic encapsulation                             │    │
│  │  - Transaction management                                   │    │
│  │  - Data validation                                          │    │
│  └────────────────────────────────────────────────────────────┘    │
│                             │                                        │
│                             ▼                                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Data Access Layer                                          │    │
│  │                                                              │    │
│  │  - Firebase Admin SDK                                       │    │
│  │  - Query optimization                                       │    │
│  │  - Caching (optional)                                       │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             │ Admin SDK (server-to-server)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Firebase (Backend)                                                  │
│                                                                      │
│  ┌───────────────────────┐    ┌──────────────────────────┐         │
│  │  Firestore DB         │    │  Firebase Auth           │         │
│  │  (Security Rules)     │    │  (Custom Claims)         │         │
│  │  - Role-based access  │    │  - Server-managed roles  │         │
│  │  - Defense in depth   │    │  - Token verification    │         │
│  └───────────────────────┘    └──────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘

SECURITY LAYERS:
1. Middleware verifies ALL requests
2. API routes validate ALL inputs
3. Service layer enforces business rules
4. Firestore rules provide defense in depth
5. No security decisions made on client
```

---

## Authentication Flow Comparison

### BEFORE (Insecure)

```
User Sign In
     │
     ▼
┌─────────────────────────┐
│ Firebase Auth (Client)  │
│ Returns ID token        │
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ auth-provider.tsx       │
│                         │
│ IF email matches:       │
│   role = 'admin' ❌     │ ← SECURITY VULNERABILITY
│ ELSE:                   │
│   role = decode(token)  │ ← NO VERIFICATION
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│ User has access         │
│ (entirely client-side)  │
└─────────────────────────┘
```

### AFTER (Secure)

```
User Sign In
     │
     ▼
┌─────────────────────────────────┐
│ Firebase Auth (Client)          │
│ Returns ID token                │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ POST /api/auth/login            │
│ - Receive ID token              │
│ - Verify with Admin SDK ✅      │
│ - Check custom claims           │
│ - Create session cookie         │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Session Cookie (HTTP-only)      │
│ - 5 day expiry                  │
│ - Secure flag (production)      │
│ - SameSite: Lax                 │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Every subsequent request        │
│ - Cookie sent automatically     │
│ - Middleware verifies ✅        │
│ - Role checked server-side ✅   │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Access granted/denied           │
│ (entirely server-side) ✅       │
└─────────────────────────────────┘
```

---

## Request Flow: Admin Route Access

### BEFORE (Vulnerable)

```
User → /dashboard/users
     │
     ▼
┌──────────────────────────┐
│ Client Component Renders │
│ Checks useAuth().isAdmin │ ← Can be manipulated in DevTools
└──────────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ IF isAdmin:              │
│   Show admin panel ❌    │ ← VULNERABILITY: Client decides
│ ELSE:                    │
│   Show "unauthorized"    │
└──────────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ Firestore query (client) │
│ db.collection('users')   │ ← Direct access, weak rules
└──────────────────────────┘
```

**Attack Vector:**
```javascript
// User opens browser DevTools and runs:
localStorage.setItem('role', 'admin');
// OR modifies React state:
window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.get(1).findFiberByHostInstance(...)._debugOwner.stateNode.setState({ role: 'admin' });
// Now has admin access! 🚨
```

### AFTER (Secure)

```
User → /dashboard/users
     │
     ▼
┌──────────────────────────────────┐
│ Middleware Intercepts Request    │
│ 1. Extract session cookie        │
│ 2. Verify with Firebase Admin ✅ │
│ 3. Check role === 'admin'        │
└──────────────────────────────────┘
     │
     ├─ IF NOT admin ────────────────────┐
     │                                    ▼
     │                          ┌──────────────────┐
     │                          │ Return 403       │
     │                          │ Redirect to /    │
     │                          └──────────────────┘
     │
     ├─ IF admin ────────────────────────┐
     │                                    ▼
     │                          ┌──────────────────┐
     │                          │ Allow request    │
     │                          └──────────────────┘
     │                                    │
     ▼                                    ▼
┌────────────────────────────────────────────────┐
│ Server Component Renders                       │
│ - Fetches data server-side                     │
│ - No client-side security checks needed        │
└────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────┐
│ API Route: GET /api/users                      │
│ 1. requireRole(req, ['admin']) ✅              │
│ 2. Validate input ✅                           │
│ 3. userService.listUsers()                     │
└────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────┐
│ Firebase Admin SDK                             │
│ - Server-to-server connection ✅               │
│ - Bypasses client security rules ✅            │
└────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────┐
│ Firestore Security Rules                       │
│ (Defense in depth - backup security layer)     │
└────────────────────────────────────────────────┘
```

**Attack Prevention:**
```javascript
// User tries to manipulate client state:
localStorage.setItem('role', 'admin');
// ❌ DOESN'T WORK - Session cookie is HTTP-only (can't be accessed/modified)

// User tries to modify React state:
// ❌ DOESN'T WORK - Middleware checks session on every request

// User tries to directly call API:
fetch('/api/users', { method: 'GET' })
// ❌ DOESN'T WORK - Middleware returns 403 (no valid admin session)

// ✅ SECURE: All authorization happens server-side
```

---

## Data Flow: Creating an Event

### BEFORE (N+1 Queries, Client-Side)

```
User clicks "Create Event"
     │
     ▼
┌────────────────────────────────┐
│ Client Component               │
│ - Form submission              │
│ - Client-side validation only  │
└────────────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Client-side Firestore          │
│ addDoc(collection(db, 'events'))│ ← No server validation
└────────────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Firestore (maybe weak rules)   │
│ Event created                  │
└────────────────────────────────┘
     │
     ▼
┌────────────────────────────────┐
│ Page refreshes to show events  │
│ FOR EACH event:                │
│   - Fetch event data           │ ← N+1 query problem
│   - Fetch competitor count     │
│   - Fetch rubric count         │
│ (3 queries per event)          │
└────────────────────────────────┘

PROBLEMS:
- No server-side validation
- No rate limiting
- N+1 query performance issue
- Weak security (client controls data)
```

### AFTER (Optimized, Server-Side)

```
User clicks "Create Event"
     │
     ▼
┌────────────────────────────────────────┐
│ Client Component (Dialog)              │
│ - Form submission                      │
│ - Client-side validation (UX only)     │
└────────────────────────────────────────┘
     │
     │ POST /api/events
     ▼
┌────────────────────────────────────────┐
│ Middleware                             │
│ - Verify session ✅                    │
│ - Check role = 'admin' ✅              │
│ - Rate limit (20 req/min) ✅           │
└────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ API Route: POST /api/events            │
│ - Validate input (Zod schema) ✅       │
│ - Sanitize data ✅                     │
└────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ EventService.createEvent()             │
│ - Business logic                       │
│ - Add timestamps                       │
│ - Add createdBy field                  │
└────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ Firebase Admin SDK                     │
│ - Write to Firestore ✅                │
└────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│ Server re-renders page (ISR)           │
│ - Single optimized query               │
│ - Includes competitor counts           │
│ - Cached for 60 seconds                │
│ (1 query instead of N*3)               │
└────────────────────────────────────────┘

BENEFITS:
✅ Server-side validation (security)
✅ Rate limiting (DoS protection)
✅ Optimized queries (performance)
✅ Proper error handling
✅ Audit logging
```

---

## Security Layers Comparison

### BEFORE (Single Layer - Easily Bypassed)

```
┌──────────────────────────────┐
│  Client-Side Security        │
│  - Can be bypassed           │
│  - Visible in source code    │
│  - No verification           │
└──────────────────────────────┘
          │
          │ Direct access
          ▼
┌──────────────────────────────┐
│  Firebase                    │
│  - Weak/missing rules        │
└──────────────────────────────┘

SECURITY LEVEL: 🔴 VULNERABLE
```

### AFTER (Defense in Depth - 5 Layers)

```
┌──────────────────────────────────────────┐
│  Layer 1: Middleware (Auth Gateway)      │
│  - Verifies every request                │
│  - Checks session cookie                 │
│  - Validates role                        │
└──────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│  Layer 2: API Route Handler              │
│  - Input validation (Zod)                │
│  - Rate limiting                         │
│  - CSRF protection                       │
└──────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│  Layer 3: Service Layer                  │
│  - Business rule enforcement             │
│  - Data sanitization                     │
│  - Transaction integrity                 │
└──────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│  Layer 4: Firebase Admin SDK             │
│  - Server-to-server auth                 │
│  - Privilege elevation                   │
└──────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│  Layer 5: Firestore Security Rules       │
│  - Final defense                         │
│  - Prevents rogue server code            │
└──────────────────────────────────────────┘

SECURITY LEVEL: 🟢 SECURE (Defense in Depth)
```

---

## Component Architecture Comparison

### BEFORE (Everything Client-Side)

```
src/app/dashboard/events/page.tsx
├── "use client"  ❌ Entire page is client component
├── 500+ lines of code
├── Direct Firebase imports
├── Business logic mixed with UI
├── Fetches data on mount (client-side)
└── Large bundle size (~200KB)

PROBLEMS:
- Large JavaScript bundle sent to client
- Slow initial page load
- Data fetched after page renders (slow)
- No SEO (CSR only)
- Security logic in client code
```

### AFTER (Hybrid Server/Client)

```
src/app/dashboard/events/page.tsx (Server Component)
├── NO "use client" ✅
├── 50 lines (orchestration only)
├── Fetches data server-side
├── Pre-rendered HTML
└── Small bundle size (~20KB)
    │
    ├── components/event-list.tsx (Client Component)
    │   ├── "use client" (for interactivity)
    │   ├── 80 lines
    │   ├── Sorting/filtering UI
    │   └── No data fetching
    │
    ├── components/event-card.tsx (Server Component)
    │   ├── NO "use client"
    │   ├── 40 lines
    │   └── Static rendering
    │
    └── components/create-event-dialog.tsx (Client Component)
        ├── "use client" (for form)
        ├── 100 lines
        └── Calls API on submit

BENEFITS:
✅ Smaller bundle (-80%)
✅ Faster initial load
✅ Better SEO (SSR)
✅ Separation of concerns
✅ Easier to test
```

---

## Migration Strategy Visualization

```
Week 0 (Current State - Insecure)
┌──────────────────────────────────────────────────────────┐
│ 🔴 Hardcoded admin bypass                                │
│ 🔴 Client-side auth decisions                            │
│ 🔴 Direct Firestore access                               │
│ 🔴 No input validation                                   │
│ 🔴 No rate limiting                                      │
└──────────────────────────────────────────────────────────┘
                          │
                          │ Phase 1 (Weeks 1-2)
                          ▼
┌──────────────────────────────────────────────────────────┐
│ 🟡 Server-side middleware added                          │
│ 🟡 Session cookies implemented                           │
│ 🟡 Input validation (50% routes)                         │
│ 🟢 Hardcoded bypass removed                              │
│ 🔴 Still some client-side Firestore                      │
└──────────────────────────────────────────────────────────┘
                          │
                          │ Phase 2 (Weeks 3-4)
                          ▼
┌──────────────────────────────────────────────────────────┐
│ 🟢 All auth server-side                                  │
│ 🟢 Firestore security rules deployed                     │
│ 🟢 Auth test coverage 90%+                               │
│ 🟡 API consolidation started                             │
│ 🔴 Some N+1 queries remain                               │
└──────────────────────────────────────────────────────────┘
                          │
                          │ Phase 3 (Weeks 5-6)
                          ▼
┌──────────────────────────────────────────────────────────┐
│ 🟢 Service layer complete                                │
│ 🟢 No client-side Firestore access                       │
│ 🟢 N+1 queries eliminated                                │
│ 🟡 Component refactoring started                         │
│ 🟡 Test coverage 40%                                     │
└──────────────────────────────────────────────────────────┘
                          │
                          │ Phases 4-6 (Weeks 7-12)
                          ▼
┌──────────────────────────────────────────────────────────┐
│ 🟢 All components refactored                             │
│ 🟢 Test coverage 80%+                                    │
│ 🟢 Production monitoring                                 │
│ 🟢 Documentation complete                                │
│ 🟢 Security audit passed                                 │
└──────────────────────────────────────────────────────────┘
                    PRODUCTION READY ✅

Legend:
🔴 Critical issue
🟡 In progress / Partial
🟢 Complete / Secure
```

---

## Performance Impact

### Bundle Size Comparison

```
BEFORE (All Client Components):
┌─────────────────────────────────┐
│ JavaScript Bundle               │
│                                 │
│ React Runtime       │████│ 50KB│
│ Next.js Client      │██│   30KB│
│ Firebase Client SDK │██████│ 80KB│
│ App Components      │████████│ 120KB│
│ UI Library          │████│ 50KB│
│                                 │
│ TOTAL: ~330KB (gzipped)         │
│ Load time: 2.5s (3G)            │
└─────────────────────────────────┘

AFTER (Server Components):
┌─────────────────────────────────┐
│ JavaScript Bundle               │
│                                 │
│ React Runtime       │████│ 50KB│
│ Next.js Client      │██│   30KB│
│ Client Components   │██│   40KB│ ← 80% reduction
│ UI Library          │████│ 50KB│
│                                 │
│ TOTAL: ~170KB (gzipped)         │
│ Load time: 1.2s (3G)            │
│                                 │
│ 🚀 48% smaller bundle           │
│ 🚀 2x faster load time          │
└─────────────────────────────────┘
```

### Query Performance

```
BEFORE (N+1 Queries):
GET /events
  └─> Fetch events list (1 query)
      └─> FOR EACH event (N queries):
          ├─> Fetch competitor count
          ├─> Fetch rubric count
          └─> Fetch judge assignments

Total: 1 + (N × 3) queries
Example: 10 events = 31 queries
Response time: ~3 seconds ❌

AFTER (Optimized):
GET /events
  └─> Single query with aggregations
      └─> Batch fetch related data

Total: 1-2 queries (regardless of N)
Example: 10 events = 2 queries
Response time: ~200ms ✅

🚀 15x faster
🚀 94% fewer database queries
```

---

## Summary

The architectural transformation provides:

1. **Security:** Client cannot bypass auth, all verification server-side
2. **Performance:** Smaller bundles, optimized queries, SSR
3. **Maintainability:** Clear layers, separation of concerns
4. **Scalability:** Service layer can be extracted to microservices later
5. **Testability:** Each layer can be tested independently

**Next Steps:** Begin Phase 1, Milestone 1 (see QUICK_START_GUIDE.md)
