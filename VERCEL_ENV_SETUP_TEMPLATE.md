# 🚀 Vercel Environment Variables Setup Guide

## ⚡ Quick Setup (Easiest Method)

### Option 1: Upload .env.production File (RECOMMENDED)

1. **Go to Vercel Project Settings:**
   ```
   https://vercel.com/llanesjoseph/k9crest/settings/environment-variables
   ```

2. **Click "Import" button** (top right)

3. **Select `.env.production` file** from your local project

4. **Choose environments:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. **Click "Import"** - Done! ✅

---

### Option 2: Add Variables Manually

If the import doesn't work, add each variable one by one:

1. Click **"Add New"**
2. Enter **Key** (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`)
3. Enter **Value**
4. Select **Environments** (Production, Preview, Development)
5. Click **"Save"**
6. Repeat for all variables

---

## 📋 Required Environment Variables

### Firebase Public (16 total variables needed)
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

### Firebase Admin (Server-Side)
```
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
```

### Google APIs
```
GOOGLE_API_KEY
GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
GOOGLE_AI_API_KEY
```

### Resend Email
```
RESEND_API_KEY
RESEND_FROM_EMAIL
BUG_REPORT_EMAIL
```

**All values are in `.env.production` file (NOT in git for security)**

---

## 🔒 Security Notes

### ✅ Safe Files (can commit):
- `.env.example` - Template with placeholders
- This guide (VERCEL_ENV_SETUP_TEMPLATE.md)

### ❌ Never Commit (in .gitignore):
- `.env.local` - Local development
- `.env.production` - Production values
- `VERCEL_ENV_SETUP.md` - Contains real secrets

---

## 📤 How to Upload to Vercel

### Method 1: Import File (Easiest)
1. Vercel Settings → Environment Variables
2. Click **"Import"**
3. Select `.env.production`
4. Done!

### Method 2: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Upload environment variables
vercel env pull .env.local
# Then manually add from .env.production
```

### Method 3: Copy-Paste
1. Open `.env.production` locally
2. Copy each value
3. Add manually in Vercel dashboard

---

## ✅ After Setup

1. **Verify variables added:**
   - Check Vercel Settings → Environment Variables
   - Should see all 16 variables

2. **Deploy will trigger automatically:**
   - Vercel detects the new push
   - Rebuilds with environment variables
   - Should succeed!

3. **Check build logs:**
   - Vercel Dashboard → Deployments
   - Click latest deployment
   - Check for success ✅

---

## 🔧 Troubleshooting

### Build Still Fails?
1. Verify all 16 variables are added
2. Check for typos in variable names
3. Ensure `FIREBASE_PRIVATE_KEY` includes line breaks
4. Manually trigger redeploy

### Can't Import File?
Use manual method - add one by one

### Variables Not Taking Effect?
1. Check they're added to "Production" environment
2. Manually trigger new deployment
3. Clear Vercel cache: Settings → Advanced → Clear Cache

---

## 📞 Need Help?

- **Vercel Docs:** https://vercel.com/docs/environment-variables
- **Check build logs:** Vercel Dashboard → Deployments
- **Test locally first:** `npm run build` should work

---

**Security Reminder:** Never commit `.env.production` or `VERCEL_ENV_SETUP.md` to git! ✅
