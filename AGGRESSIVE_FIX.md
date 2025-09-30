# 🔥 AGGRESSIVE FIX - Bootstrap Admin & Google Maps

## STEP 1: Get Firebase Admin Credentials

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select Project**: "k9-trials-tracker"
3. **Click the Gear Icon** → **Project Settings**
4. **Navigate to**: **Service Accounts** tab
5. **Click**: "Generate New Private Key"
6. **Download the JSON file**

## STEP 2: Extract Credentials from JSON

Open the downloaded JSON file and copy:
- `private_key` → This is your FIREBASE_PRIVATE_KEY
- `client_email` → This is your FIREBASE_CLIENT_EMAIL

## STEP 3: Add to .env.local

Add these two lines to your `.env.local` file:

```bash
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@k9-trials-tracker.iam.gserviceaccount.com
```

**IMPORTANT**: The private key should be wrapped in quotes and newlines should be literal `\n` characters.

## STEP 4: Run the Aggressive Fix Script

After adding the credentials, run:

```bash
npm run aggressive-fix
```

This will:
- ✅ Verify all environment variables
- ✅ Clear Next.js cache (.next folder)
- ✅ Clear npm cache
- ✅ Kill any running dev servers
- ✅ Restart dev server with fresh environment

## ALTERNATIVE: If You Can't Access Firebase Console

If you don't have access to Firebase Console, you can:
1. Contact your Firebase project admin
2. OR check if you have the service account JSON file already downloaded
3. OR use Firebase CLI: `firebase login` then `firebase apps:sdkconfig`
