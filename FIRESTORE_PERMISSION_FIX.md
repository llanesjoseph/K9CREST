# 🔥 FIRESTORE PERMISSION FIX

## 🚨 Problem
You're getting **"Missing or insufficient permissions"** errors because:
1. Your Firestore security rules require an "admin" role
2. You don't have the admin role set yet (need Firebase Admin SDK credentials)
3. This creates a chicken-and-egg problem

## ✅ SOLUTION: Two Options

---

## 🎯 OPTION 1: Quick Development Fix (Recommended for Now)

This temporarily relaxes Firestore rules for development.

### Step 1: Deploy Development Rules

```bash
firebase deploy --only firestore:rules
```

When prompted, it will deploy `firestore.rules.dev` which:
- ✅ Allows joseph@crucibleanalytics.dev to have admin access automatically
- ✅ Allows authenticated users to write during development
- ✅ Still requires authentication (not open to the world)
- ⚠️  Less restrictive than production rules

### Step 2: Backup Current Rules

The original production rules are still in `firestore.rules` - **don't delete this file!**

---

## 🔐 OPTION 2: Proper Production Fix (Do This After Dev Testing)

Once you're ready for production, use the strict rules:

### Step 1: Get Firebase Admin Credentials

1. Go to: https://console.firebase.google.com/project/k9-trials-tracker/settings/serviceaccounts/adminsdk
2. Click **"Generate New Private Key"**
3. Download the JSON file

### Step 2: Add Credentials to `.env.local`

Open the downloaded JSON and add to `.env.local`:

```bash
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@k9-trials-tracker.iam.gserviceaccount.com
```

### Step 3: Set Your Admin Role

```bash
npm run set-admin
```

OR visit: http://localhost:3000/bootstrap-admin

### Step 4: Switch Back to Production Rules

```bash
# Copy production rules back
cp firestore.rules firebase.rules.tmp
cp firestore.rules.dev firestore.rules.dev.backup
cp firebase.rules.tmp firestore.rules

# Deploy
firebase deploy --only firestore:rules
```

---

## 📋 Quick Fix Commands

```bash
# 1. Deploy dev rules (allows authenticated writes)
firebase deploy --only firestore:rules

# 2. Restart your dev server
npm run dev

# 3. Try creating an event again
```

---

## ⚠️ IMPORTANT

- **Development rules (firestore.rules.dev)**: Use for local testing only
- **Production rules (firestore.rules)**: Use when deploying to production
- The dev rules still require authentication - they're not wide open
- Remember to switch back to production rules before deploying!

---

## 🧪 Testing

After deploying dev rules, you should be able to:
1. ✅ Create events
2. ✅ Add competitors
3. ✅ Create schedules
4. ✅ Submit scores
5. ✅ Manage rubrics

All without the "insufficient permissions" error!
