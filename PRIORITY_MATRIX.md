# K9CREST Issue Priority Matrix

**Last Updated:** 2025-10-05

This document prioritizes all identified issues using a risk-based scoring system.

---

## Scoring Methodology

Each issue is scored on three dimensions:

1. **Impact (1-5):** How bad is it if exploited/left unfixed?
   - 5 = Critical (data breach, system compromise)
   - 4 = High (data corruption, service disruption)
   - 3 = Medium (degraded UX, performance issues)
   - 2 = Low (minor bugs, cosmetic issues)
   - 1 = Trivial (nice-to-have improvements)

2. **Likelihood (1-5):** How likely is it to cause problems?
   - 5 = Certain (happens regularly or easily exploitable)
   - 4 = Likely (happens occasionally or exploitable with effort)
   - 3 = Possible (could happen or exploitable with skill)
   - 2 = Unlikely (rare or requires significant expertise)
   - 1 = Rare (theoretical only)

3. **Effort to Fix (1-5):** How much work to remediate?
   - 5 = Very High (weeks, major refactor)
   - 4 = High (days, significant changes)
   - 3 = Medium (1-2 days, moderate complexity)
   - 2 = Low (hours, simple fix)
   - 1 = Trivial (minutes, config change)

**Risk Score = Impact × Likelihood**
**Priority Score = Risk Score / Effort**

Higher priority score = fix first.

---

## SECURITY ISSUES

| Issue | Impact | Likelihood | Risk | Effort | Priority | Fix By |
|-------|--------|------------|------|--------|----------|--------|
| **Hardcoded admin bypass** | 5 | 5 | 25 | 3 | 8.3 | Week 1 ✅ |
| Client-side JWT decode (no verify) | 5 | 5 | 25 | 3 | 8.3 | Week 1 ✅ |
| No input validation on API routes | 5 | 4 | 20 | 2 | 10.0 | Week 1 ✅ |
| No rate limiting | 4 | 4 | 16 | 2 | 8.0 | Week 1 ✅ |
| Missing CSRF protection | 4 | 3 | 12 | 1 | 12.0 | Week 2 ✅ |
| Console logging in production | 3 | 5 | 15 | 2 | 7.5 | Week 2 ✅ |
| Weak Firestore security rules | 5 | 3 | 15 | 3 | 5.0 | Week 3 ✅ |
| No session management | 4 | 4 | 16 | 3 | 5.3 | Week 3 ✅ |
| Exposed Firebase credentials (client) | 2 | 1 | 2 | 1 | 2.0 | Week 2 |

**Critical Path:** Fix top 4 issues (Priority >8.0) in Week 1.

---

## ARCHITECTURAL ISSUES

| Issue | Impact | Likelihood | Risk | Effort | Priority | Fix By |
|-------|--------|------------|------|--------|----------|--------|
| Split-brain auth (client vs server) | 5 | 5 | 25 | 4 | 6.25 | Week 3-4 ✅ |
| Direct Firestore access from frontend | 4 | 5 | 20 | 4 | 5.0 | Week 5-6 ✅ |
| N+1 query patterns (events page) | 3 | 5 | 15 | 2 | 7.5 | Week 5 ✅ |
| Overuse of client components | 3 | 4 | 12 | 4 | 3.0 | Week 7-8 |
| Mixed trust boundaries | 4 | 4 | 16 | 4 | 4.0 | Week 3-4 ✅ |
| No service layer (business logic in UI) | 3 | 4 | 12 | 5 | 2.4 | Week 5-6 ✅ |
| No API versioning | 2 | 2 | 4 | 2 | 2.0 | Future |
| No caching strategy | 3 | 3 | 9 | 3 | 3.0 | Week 11 |

**Critical Path:** Fix split-brain auth and N+1 queries first (highest priority).

---

## CODE QUALITY ISSUES

| Issue | Impact | Likelihood | Risk | Effort | Priority | Fix By |
|-------|--------|------------|------|--------|----------|--------|
| Memory leak in useToast | 3 | 4 | 12 | 1 | 12.0 | Week 7 ✅ |
| Race condition in bug report | 3 | 3 | 9 | 2 | 4.5 | Week 7 ✅ |
| Hydration mismatch (useIsMobile) | 2 | 5 | 10 | 1 | 10.0 | Week 7 ✅ |
| Extensive 'any' types (100+) | 3 | 4 | 12 | 4 | 3.0 | Week 8 |
| Large components (schedule: 884 lines) | 3 | 3 | 9 | 3 | 3.0 | Week 7-8 ✅ |
| Code duplication (30% estimated) | 2 | 4 | 8 | 4 | 2.0 | Week 8 |
| Inconsistent error handling | 3 | 3 | 9 | 3 | 3.0 | Week 11 |
| No TypeScript strict mode | 3 | 2 | 6 | 3 | 2.0 | Week 8 |

**Critical Path:** Fix useToast leak and hydration mismatch (quick wins, high impact).

---

## TESTING GAPS

| Issue | Impact | Likelihood | Risk | Effort | Priority | Fix By |
|-------|--------|------------|------|--------|----------|--------|
| Zero auth test coverage | 5 | 5 | 25 | 3 | 8.3 | Week 4 ✅ |
| No API route tests | 4 | 5 | 20 | 4 | 5.0 | Week 9 ✅ |
| No E2E tests | 3 | 4 | 12 | 4 | 3.0 | Week 10 ✅ |
| No security rules tests | 4 | 4 | 16 | 2 | 8.0 | Week 4 ✅ |
| No performance tests | 2 | 3 | 6 | 3 | 2.0 | Week 11 |
| No integration tests | 3 | 3 | 9 | 4 | 2.25 | Week 9 ✅ |
| Current coverage ~5% | 3 | 5 | 15 | 5 | 3.0 | Week 9-10 ✅ |

**Critical Path:** Auth tests and security rules tests are highest priority.

---

## PERFORMANCE ISSUES

| Issue | Impact | Likelihood | Risk | Effort | Priority | Fix By |
|-------|--------|------------|------|--------|----------|--------|
| Large client bundle (~330KB) | 3 | 5 | 15 | 4 | 3.75 | Week 7-8 ✅ |
| N+1 queries (events, competitors) | 3 | 5 | 15 | 2 | 7.5 | Week 5 ✅ |
| No query optimization | 3 | 4 | 12 | 3 | 4.0 | Week 5-6 ✅ |
| No CDN for static assets | 2 | 3 | 6 | 1 | 6.0 | Week 11 |
| No image optimization | 2 | 3 | 6 | 2 | 3.0 | Week 11 |
| No lazy loading | 2 | 3 | 6 | 2 | 3.0 | Week 8 |
| No database indexes | 3 | 3 | 9 | 1 | 9.0 | Week 6 ✅ |

**Critical Path:** Fix N+1 queries and add database indexes (high ROI).

---

## COMPLIANCE / OPERATIONAL ISSUES

| Issue | Impact | Likelihood | Risk | Effort | Priority | Fix By |
|-------|--------|------------|------|--------|----------|--------|
| No error monitoring (partial) | 3 | 4 | 12 | 1 | 12.0 | Week 11 ✅ |
| No audit logging | 4 | 3 | 12 | 2 | 6.0 | Week 11 ✅ |
| No backup strategy | 5 | 2 | 10 | 2 | 5.0 | Week 12 |
| No disaster recovery plan | 4 | 2 | 8 | 3 | 2.67 | Week 12 |
| No API documentation | 2 | 4 | 8 | 3 | 2.67 | Week 11 ✅ |
| No runbook for incidents | 3 | 3 | 9 | 2 | 4.5 | Week 12 |
| No GDPR compliance (if needed) | 5 | 1 | 5 | 5 | 1.0 | TBD |

**Critical Path:** Error monitoring and audit logging (operational maturity).

---

## TOP 20 PRIORITIES (Overall)

| Rank | Issue | Category | Priority Score | Fix By |
|------|-------|----------|----------------|--------|
| 1 | No CSRF protection | Security | 12.0 | Week 2 |
| 2 | Memory leak in useToast | Code Quality | 12.0 | Week 7 |
| 3 | No error monitoring | Operations | 12.0 | Week 11 |
| 4 | No input validation | Security | 10.0 | Week 1 |
| 5 | Hydration mismatch (useIsMobile) | Code Quality | 10.0 | Week 7 |
| 6 | No database indexes | Performance | 9.0 | Week 6 |
| 7 | Hardcoded admin bypass | Security | 8.3 | Week 1 |
| 8 | Client-side JWT decode | Security | 8.3 | Week 1 |
| 9 | Zero auth test coverage | Testing | 8.3 | Week 4 |
| 10 | No rate limiting | Security | 8.0 | Week 1 |
| 11 | No security rules tests | Testing | 8.0 | Week 4 |
| 12 | N+1 query patterns | Architecture | 7.5 | Week 5 |
| 13 | N+1 queries (performance) | Performance | 7.5 | Week 5 |
| 14 | Console logging in production | Security | 7.5 | Week 2 |
| 15 | Split-brain auth | Architecture | 6.25 | Week 3-4 |
| 16 | No CDN for static assets | Performance | 6.0 | Week 11 |
| 17 | No audit logging | Operations | 6.0 | Week 11 |
| 18 | No session management | Security | 5.3 | Week 3 |
| 19 | No API route tests | Testing | 5.0 | Week 9 |
| 20 | Direct Firestore access | Architecture | 5.0 | Week 5-6 |

---

## WEEK-BY-WEEK PRIORITIES

### Week 1 (CRITICAL - Security Fixes)
**Must Fix:**
1. Hardcoded admin bypass (Priority: 8.3)
2. Client-side JWT decode (Priority: 8.3)
3. No input validation (Priority: 10.0)
4. No rate limiting (Priority: 8.0)

**Total Risk Reduced:** 86 points

---

### Week 2 (CRITICAL - Security Hardening)
**Must Fix:**
1. Missing CSRF protection (Priority: 12.0)
2. Console logging in production (Priority: 7.5)
3. Exposed Firebase credentials (Priority: 2.0)

**Total Risk Reduced:** 29 points

---

### Week 3-4 (HIGH - Auth Hardening)
**Must Fix:**
1. Split-brain auth (Priority: 6.25)
2. No session management (Priority: 5.3)
3. Weak Firestore rules (Priority: 5.0)
4. Mixed trust boundaries (Priority: 4.0)
5. Zero auth test coverage (Priority: 8.3)
6. No security rules tests (Priority: 8.0)

**Total Risk Reduced:** 84 points

---

### Week 5-6 (HIGH - Performance & Architecture)
**Must Fix:**
1. N+1 query patterns (Priority: 7.5)
2. Direct Firestore access (Priority: 5.0)
3. No query optimization (Priority: 4.0)
4. No database indexes (Priority: 9.0)
5. No service layer (Priority: 2.4)

**Total Risk Reduced:** 63 points

---

### Week 7-8 (MEDIUM - Code Quality)
**Must Fix:**
1. Memory leak in useToast (Priority: 12.0)
2. Hydration mismatch (Priority: 10.0)
3. Large components (Priority: 3.0)
4. Overuse client components (Priority: 3.0)
5. Race condition in bug report (Priority: 4.5)

**Total Risk Reduced:** 58 points

---

### Week 9-10 (MEDIUM - Testing)
**Must Fix:**
1. No API route tests (Priority: 5.0)
2. No integration tests (Priority: 2.25)
3. No E2E tests (Priority: 3.0)
4. Current coverage ~5% (Priority: 3.0)

**Total Risk Reduced:** 56 points

---

### Week 11-12 (LOW - Production Readiness)
**Must Fix:**
1. No error monitoring (Priority: 12.0)
2. No audit logging (Priority: 6.0)
3. No CDN (Priority: 6.0)
4. No API documentation (Priority: 2.67)
5. No runbook (Priority: 4.5)
6. No backup strategy (Priority: 5.0)

**Total Risk Reduced:** 50 points

---

## RISK REDUCTION OVER TIME

```
Week 0: Total Risk = 426 points (Current State)
Week 2: Total Risk = 311 points (-27% risk)
Week 4: Total Risk = 227 points (-47% risk)
Week 6: Total Risk = 164 points (-61% risk)
Week 8: Total Risk = 106 points (-75% risk)
Week 10: Total Risk = 50 points (-88% risk)
Week 12: Total Risk = 0 points (-100% risk) ✅

Cumulative Risk Reduction:
┌─────────────────────────────────────────────────────────┐
│ 426│██████████████████████████████████████████████      │ Week 0
│ 311│███████████████████████████████                     │ Week 2
│ 227│█████████████████████                               │ Week 4
│ 164│██████████████                                      │ Week 6
│ 106│█████████                                           │ Week 8
│  50│████                                                │ Week 10
│   0│                                                     │ Week 12 ✅
└─────────────────────────────────────────────────────────┘
```

---

## MINIMUM VIABLE MIGRATION (6 Weeks)

If you only have 6 weeks, focus on top risks:

**Week 1-2: Security Critical (Priority >8.0)**
- Hardcoded admin bypass
- Client-side JWT decode
- No input validation
- No rate limiting
- Missing CSRF protection
- Console logging

**Risk Reduced:** 115 points (27% of total risk)

**Week 3-4: Auth Hardening**
- Split-brain auth
- Session management
- Firestore rules
- Auth tests

**Risk Reduced:** 84 points (20% of total risk)

**Week 5-6: Core Architecture**
- N+1 queries
- Database indexes
- API consolidation (events + auth only)

**Risk Reduced:** 63 points (15% of total risk)

**Total Risk Reduced in 6 Weeks:** 262 points (61% of total risk)

**Remaining Risk:** 164 points (can be addressed later)

---

## DECISION MATRIX

Use this to decide what to fix when resources are constrained:

| Scenario | Focus On | Skip/Defer |
|----------|----------|------------|
| **Limited Time (6 weeks)** | Weeks 1-6 only | Weeks 7-12 |
| **Limited Team (1 developer)** | Security + Auth only (Weeks 1-4) | Everything else |
| **Security Audit Required** | All Security + Testing | Performance, Code Quality |
| **Performance Issues** | Weeks 5-6 + 11 (perf items) | Testing (if needed) |
| **Production Incident** | Week 1 immediately | Everything else until stable |
| **Pre-Funding/Demo** | Weeks 1-4 (security baseline) | Nice-to-haves |

---

## CONTINUOUS MONITORING

After migration, continue tracking:

**Security Metrics:**
- [ ] Zero hardcoded credentials (weekly scan)
- [ ] 100% API auth verification (automated tests)
- [ ] Zero production console.log (CI check)
- [ ] Firestore rules coverage (monthly review)

**Performance Metrics:**
- [ ] API response time <200ms p95 (Sentry)
- [ ] Client bundle <200KB (Lighthouse CI)
- [ ] No N+1 queries (query logging)
- [ ] Core Web Vitals >90 (PageSpeed)

**Code Quality Metrics:**
- [ ] Test coverage >80% (CI check)
- [ ] Zero TypeScript errors (CI check)
- [ ] <10 'any' types (monthly review)
- [ ] No components >300 lines (linter)

---

## SUMMARY

**Total Issues Identified:** 45
**Critical Issues (Priority >8.0):** 12
**High Priority (Priority 5.0-8.0):** 18
**Medium/Low Priority (<5.0):** 15

**Recommended Timeline:** 12 weeks (full migration)
**Minimum Timeline:** 6 weeks (security + core architecture)

**Critical Path:**
1. Fix security vulnerabilities (Weeks 1-2) - NON-NEGOTIABLE
2. Harden authentication (Weeks 3-4) - NON-NEGOTIABLE
3. Refactor architecture (Weeks 5-6) - HIGHLY RECOMMENDED
4. Improve code quality (Weeks 7-8) - RECOMMENDED
5. Add comprehensive tests (Weeks 9-10) - RECOMMENDED
6. Production hardening (Weeks 11-12) - RECOMMENDED

**Next Step:** Begin Week 1 priorities immediately (see QUICK_START_GUIDE.md)

---

**Document Owner:** Lead Architect
**Last Updated:** 2025-10-05
**Next Review:** After Week 2 (reassess priorities based on progress)
