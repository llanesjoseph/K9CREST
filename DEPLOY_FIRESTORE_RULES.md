# 🔥 DEPLOY FIRESTORE RULES - Two Methods

## 🎯 METHOD 1: Firebase Console (Easiest)

### Step 1: Open Firebase Console
1. Go to: https://console.firebase.google.com/project/k9-trials-tracker/firestore/rules
2. Log in with your Google account

### Step 2: Copy Development Rules
1. Open the file: `firestore.rules` in your project (already switched to dev rules)
2. Copy the entire contents

### Step 3: Paste and Publish
1. In the Firebase Console, delete all existing rules
2. Paste the new development rules
3. Click **"Publish"** button
4. Confirm the deployment

**✅ Done! The permission errors should be gone.**

---

## 🎯 METHOD 2: Firebase CLI (For Advanced Users)

### Step 1: Login to Firebase
```bash
firebase login --reauth
```

### Step 2: Set Project
```bash
firebase use k9-trials-tracker
```

### Step 3: Deploy Rules
```bash
firebase deploy --only firestore:rules
```

---

## 📋 What Changed?

The new development rules:
- ✅ Automatically grant admin access to `joseph@crucibleanalytics.dev`
- ✅ Allow all authenticated users to read/write during development
- ✅ Still require authentication (not public)
- ⚠️  Less restrictive than production rules

---

## 🧪 Testing

After deploying:
1. Refresh your browser at http://localhost:3000
2. Try creating an event again
3. The "Missing or insufficient permissions" error should be gone

---

## 🔄 Switch Back to Production Rules Later

When ready for production:

```bash
# Restore production rules
cp firestore.rules.prod firestore.rules

# Deploy via CLI
firebase deploy --only firestore:rules

# OR deploy via Firebase Console
```
