# K9CREST Data Schema Analysis

## Overview
This document provides a comprehensive analysis of all data models, Firestore collections, and schema consistency across the K9CREST application.

## Firestore Collections Structure

### 1. **Root Collections**

#### `events` Collection
```typescript
interface Event {
  id: string;
  name: string;
  description?: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  location: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  bannerImage?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `rubrics` Collection
```typescript
interface Rubric {
  id: string;
  name: string;
  judgingInterface: 'phases' | 'detection';
  phases: Phase[];
  totalPoints?: number;
  createdAt: Timestamp;
  updatedAt: Date;
}

interface Phase {
  id?: string;
  name: string;
  exercises: Exercise[];
}

interface Exercise {
  id?: string;
  name: string;
  type: 'points' | 'time' | 'pass/fail';
  maxPoints?: number;
}
```

#### `users` Collection
```typescript
interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'judge' | 'competitor' | 'spectator';
  status: 'active' | 'pending';
  displayName?: string;
  photoURL?: string;
  createdAt?: Date;
}
```

### 2. **Event Subcollections**

#### `events/{eventId}/competitors` Collection
```typescript
interface Competitor {
  id: string;
  name: string; // Handler name
  dogName: string;
  agency: string;
  specialties: Specialty[];
  dogBio?: string;
  dogImage?: string;
  createdAt: Timestamp;
}

interface Specialty {
  type: 'Bite Work' | 'Detection';
  detectionType?: 'Narcotics' | 'Explosives';
}
```

#### `events/{eventId}/arenas` Collection
```typescript
interface Arena {
  id: string;
  name: string;
  specialty: string; // e.g., "Bite Work", "Detection (Narcotics)"
  rubricId?: string;
  createdAt: Timestamp;
}
```

#### `events/{eventId}/schedule` Collection
```typescript
interface ScheduledRun {
  id: string;
  competitorId: string;
  arenaId: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  date: string; // YYYY-MM-DD format
  status: 'scheduled' | 'in_progress' | 'paused' | 'scored' | 'locked';
  actualStartTime?: Timestamp;
  actualEndTime?: Timestamp;
  startAt?: Timestamp;
  endAt?: Timestamp;
  scores?: ScorePhase[];
  notes?: string;
  totalTime?: number;
  judgeName?: string;
  judgingInterface?: 'phases' | 'detection';
  detectionMax?: number;
  teamworkMax?: number;
  aidsPlanted?: number;
  falseAlertPenalty?: number;
  falseAlerts?: number;
}

interface ScorePhase {
  phaseName: string;
  exercises: ScoreExercise[];
}

interface ScoreExercise {
  exerciseName: string;
  score: number | boolean;
  type: string;
  maxPoints?: number;
}
```

#### `events/{eventId}/schedule/{runId}/finds` Subcollection
```typescript
interface Find {
  id: string;
  createdAt: Timestamp;
}
```

#### `events/{eventId}/schedule/{runId}/deductions` Subcollection
```typescript
interface Deduction {
  id: string;
  points: number;
  note: string;
  createdAt: Timestamp;
}
```

## Schema Consistency Issues Found

### 1. **Timestamp Type Inconsistencies**
- **Issue**: Mix of `Timestamp` and `Date` types for similar fields
- **Examples**: 
  - `createdAt` uses both `Timestamp` and `Date`
  - `updatedAt` uses `Date` instead of `Timestamp`
- **Impact**: Potential serialization issues and type mismatches

### 2. **Optional vs Required Field Inconsistencies**
- **Issue**: Some fields marked as optional in interfaces but required in schemas
- **Examples**:
  - `totalPoints` can be `null` in some places, `undefined` in others
  - `judgingInterface` is optional in some contexts but required in others

### 3. **Field Naming Inconsistencies**
- **Issue**: Similar fields have different names across collections
- **Examples**:
  - `actualStartTime` vs `startAt`
  - `actualEndTime` vs `endAt`

### 4. **Missing Validation**
- **Issue**: Some critical fields lack proper validation
- **Examples**:
  - Email format validation
  - Time format validation (HH:MM)
  - Date format validation (YYYY-MM-DD)

## Recommendations for Schema Standardization

### 1. **Standardize Timestamp Usage**
```typescript
// Use Timestamp for all Firestore timestamps
interface StandardizedEvent {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startDate: Timestamp;
  endDate?: Timestamp;
}
```

### 2. **Unify Field Names**
```typescript
// Use consistent naming across all collections
interface StandardizedScheduledRun {
  startTime: Timestamp; // Instead of actualStartTime/startAt
  endTime: Timestamp;   // Instead of actualEndTime/endAt
  scheduledStartTime: string; // HH:MM format
  scheduledEndTime: string;   // HH:MM format
}
```

### 3. **Add Comprehensive Validation**
```typescript
// Add Zod schemas for all data models
const EventSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  startDate: z.custom<Timestamp>(),
  endDate: z.custom<Timestamp>().optional(),
  location: z.string().min(1).max(200),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']),
  bannerImage: z.string().url().optional(),
});
```

### 4. **Create Centralized Type Definitions**
```typescript
// Create a single source of truth for all types
export type {
  Event,
  Rubric,
  Competitor,
  Arena,
  ScheduledRun,
  UserProfile,
  // ... all other types
} from './types';
```

## Data Flow Analysis

### 1. **Event Creation Flow**
1. User creates event → `events` collection
2. Event admin adds competitors → `events/{eventId}/competitors`
3. Event admin creates arenas → `events/{eventId}/arenas`
4. Event admin assigns rubrics to arenas
5. AI or manual scheduling → `events/{eventId}/schedule`

### 2. **Judging Flow**
1. Judge selects run from schedule
2. Timer starts → updates `startAt` field
3. Judge scores exercises → updates `scores` array
4. Timer stops → updates `endAt` and `totalTime`
5. Run marked as `scored`

### 3. **Detection Scoring Flow**
1. Judge starts run → updates `status` to `in_progress`
2. Judge records finds → `finds` subcollection
3. Judge records deductions → `deductions` subcollection
4. Judge completes run → updates `status` to `completed`

## Security Considerations

### 1. **Firestore Rules**
- Current rules allow all authenticated users full access
- **Recommendation**: Implement role-based access control
- **Example**:
```javascript
// Only admins can create events
match /events/{eventId} {
  allow create: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

### 2. **Data Validation**
- Client-side validation exists but server-side validation missing
- **Recommendation**: Add Cloud Functions for server-side validation

## Performance Considerations

### 1. **Indexing**
- **Missing indexes** for common queries:
  - `events` by `status` and `startDate`
  - `schedule` by `status` and `date`
  - `competitors` by `agency`

### 2. **Data Structure**
- **Issue**: Large arrays in single documents (scores, phases)
- **Recommendation**: Consider subcollections for better scalability

## Next Steps

1. **Fix TypeScript Errors** ✅ (Completed)
2. **Standardize Timestamp Usage** (In Progress)
3. **Implement Role-Based Security Rules**
4. **Add Server-Side Validation**
5. **Create Comprehensive Test Suite**
6. **Set Up Firebase Hosting Deployment**
7. **Implement Automated CI/CD Pipeline**

## Files Requiring Updates

### High Priority
- `src/lib/schedule-types.ts` - Centralize all type definitions
- `firestore.rules` - Implement proper security rules
- All collection references - Standardize field names

### Medium Priority
- Add validation schemas for all forms
- Implement error boundaries for data operations
- Add loading states for all async operations

### Low Priority
- Add data migration scripts for existing data
- Implement data export/import functionality
- Add audit logging for data changes
