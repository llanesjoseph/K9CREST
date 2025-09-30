# 🚀 Vercel Environment Variables Setup

## 🔴 Build Error Fix

The build failed because environment variables weren't set in Vercel. Here's how to fix it:

---

## 📋 Quick Fix Steps

### 1. Go to Vercel Project Settings

Visit your Vercel dashboard:
```
https://vercel.com/llanesjoseph/k9crest/settings/environment-variables
```

Or:
1. Go to https://vercel.com
2. Select your project: **k9crest**
3. Click **Settings**
4. Click **Environment Variables** (left sidebar)

---

### 2. Add Required Environment Variables

Add each of these variables:

#### Firebase Configuration (Public - All Environments)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDQfOtv4r6MF-BhT-YAYnJvDcn-oyIXt_M
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=k9-trials-tracker.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=k9-trials-tracker
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=k9-trials-tracker.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=174322418803
NEXT_PUBLIC_FIREBASE_APP_ID=1:174322418803:web:8b556b1f6f3d3dc45dd606
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-SS5GVZNWBQ
```

#### Firebase Admin SDK (Server-Side Only)
```bash
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCwTATMZxFQv6lq
uxts8Z9gYdFY16WVuOf0wLlIF0+8sh7DHnKLnB2o7YrxRau4/Q2lnx8wjY4VWzn1
Sk4H3gOtlsZWhn0M9YxZEvG0MaNGePYQEvcWB39pJk2FazpKXqIuL0yb2neMufid
jOwwuSwhQF+yP6hn/x9XpjyFI/QTcbbBdiESUywMD5D/COuBpXPdVYMki30rCFUG
YV16nCPY9seoEZ9/J55G4SN2t2IRhmVzKu2zKFSlvr9QqkETauvA/LA9BWHaDwKG
ycXvREADiKm7RxnA0d9lvK6eSbaOcR5lkV5eEy+mZC/qXvvPGN3Zdcc847dnYwph
LDSSrTW5AgMBAAECggEAKrGOK+393H89yPIc9yogfZfSueAnYnXP/o65kALNNZYx
KvFxreuVpzY3gqxrpLXrmyNIy1pMgVGBXKys7uzOGTi9OXECUaQZY+zZidjHgKaE
eGoPWk9ghJdZCKlqCV6XifW8aLXkY7kZwxXAkSAW1sqfIiyWXPEEpxZD675EOnzU
J/6p/YBR+NYXZq47LME74G5pQD/xQbM36mtFaZZg4gOIOq2CBiu38EoukbIlcIgP
nji6kbFJQ2xMbbmsgvYur9Ck0xQLHrq0EUcjNRekpmi7xSahoVjq31LbQBGc/w0C5
tRMOxa4i5gaEcqqePlQWULcL0AwzzVJG5FtS3gonsQKBgQD4qUNUPyxGtrMYexBu
ksRFaGba+DR7lOfIn256vuitzQ5oUUxQOeCRe1Ipdt4ERzCnvPDPlXCP/0yZHU3g
HmB+0YQIqVnNi2J8kbWIdqxejoPfCha5dYHzs7mCVt+xEeKkdmPpZtNznmFzjSU5
V/yA6pz53lbhNvcrijsgZHNZ3QKBgQC1gAOrGB5343dGa1RyoFHW9OdGRO9g67i9
3Ns94uqiafixLe8G2hTV2yeBK9L+KRdEmn8MNlpGigZ9NrkXeVUuJNOxlxCXNBBu
0F14OKmyNOSazvhO5U4MctIT0oPwkuvKDjMOdq2FvCT0xJofOuRZXxcOQk5iMIRR
9zbm9lGjjQKBgHPWVhku/K9MeQ4UdkksceZrhk7HhZt0eK2LJ+pieP5OIkISbVyK
OcVMD7BlQXP4vf/GEuCBG1jZc5N4hUi8nfM2Iy3txnnsTsr9DfYuYooCFgiXKJLo
3MrslKTVV4uja1N2G4Eld6fKxlcQD6ExDd34bXwxSYPNGUPdN0IVyW65AoGAPrxi
CDjNB0mzx75/sSNjRnbenjZju8+eytnVWn3d9ofEs5GaBndJLmaTMB3yz3Fqnob8
lT8QU0OQXKWWstt4qvuFxOPfkzQm3fbd6BlF5thLkIsr3zF5menyXXGts3FFWVEx
KrWw4wIWkBiI4XScy5uHv6EBsQTuJ9rYulq3+10CgYAYr5dvi8hb4ntK6KvsedS5
Pl3LkN6rQKRw7kDB+Q5skSrlPn1OdLB+N1EQi/1jRgljY5lzqmtVYfJx6+enSTqH
bkcceh9Y3ymLG0YkJAz1YSkXltAvFWQzytE34nfd6UaiopaOCq/EjAXBFA9ghVpP
mEF5BEKnAIVJJO8jAk26tg==
-----END PRIVATE KEY-----

FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@k9-trials-tracker.iam.gserviceaccount.com
```

**IMPORTANT:** For `FIREBASE_PRIVATE_KEY`, make sure to preserve the line breaks. Vercel will handle this correctly.

#### Google API Keys (Server-Side)
```bash
GOOGLE_API_KEY=AIzaSyC7_oCz3qt2uyU2pTuOMp3UCYd46pVsOVM
GOOGLE_MAPS_API_KEY=AIzaSyC7_oCz3qt2uyU2pTuOMp3UCYd46pVsOVM
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyC7_oCz3qt2uyU2pTuOMp3UCYd46pVsOVM
GOOGLE_AI_API_KEY=AIzaSyBOIJrHMfty7A4lDbM_c8618jN7Fdd_Ew0
```

#### Resend Email Service
```bash
RESEND_API_KEY=re_DgE9ELUt_P1aREtxBckbHTAHzhySmvUNS
RESEND_FROM_EMAIL=K9CREST Bug Hunter <noreply@bugs.crucibleanalytics.dev>
BUG_REPORT_EMAIL=joseph@crucibleanalytics.dev
```

---

### 3. Choose Environments

For each variable, select which environments to add it to:
- ✅ **Production** (required)
- ✅ **Preview** (recommended)
- ✅ **Development** (optional)

**Recommendation:** Add to all three environments.

---

### 4. Save Variables

1. Click **"Save"** after adding each variable
2. Verify all variables are listed

---

### 5. Redeploy

After adding all variables:

**Option A: Automatic (Recommended)**
- The build will automatically retry when you push the fix

**Option B: Manual**
1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **"Redeploy"**

---

## 📋 Quick Copy-Paste List

Here's the complete list for easy copy-paste into Vercel:

| Variable Name | Value |
|---------------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | AIzaSyDQfOtv4r6MF-BhT-YAYnJvDcn-oyIXt_M |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | k9-trials-tracker.firebaseapp.com |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | k9-trials-tracker |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | k9-trials-tracker.firebasestorage.app |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | 174322418803 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | 1:174322418803:web:8b556b1f6f3d3dc45dd606 |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | G-SS5GVZNWBQ |
| `FIREBASE_PRIVATE_KEY` | [See full key above] |
| `FIREBASE_CLIENT_EMAIL` | firebase-adminsdk-fbsvc@k9-trials-tracker.iam.gserviceaccount.com |
| `GOOGLE_API_KEY` | AIzaSyC7_oCz3qt2uyU2pTuOMp3UCYd46pVsOVM |
| `GOOGLE_MAPS_API_KEY` | AIzaSyC7_oCz3qt2uyU2pTuOMp3UCYd46pVsOVM |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | AIzaSyC7_oCz3qt2uyU2pTuOMp3UCYd46pVsOVM |
| `GOOGLE_AI_API_KEY` | AIzaSyBOIJrHMfty7A4lDbM_c8618jN7Fdd_Ew0 |
| `RESEND_API_KEY` | re_DgE9ELUt_P1aREtxBckbHTAHzhySmvUNS |
| `RESEND_FROM_EMAIL` | K9CREST Bug Hunter <noreply@bugs.crucibleanalytics.dev> |
| `BUG_REPORT_EMAIL` | joseph@crucibleanalytics.dev |

---

## ✅ Verification

After adding all variables and redeploying, verify:

1. **Build succeeds** (no errors about missing API keys)
2. **App works** (all features functional)
3. **Bug Hunter works** (can send bug reports)
4. **Admin features work** (can create events)
5. **Google Maps works** (address autocomplete)

---

## 🔧 What Was Fixed

### Code Change:
Updated `src/app/api/bug-report/route.ts` to use lazy initialization:

**Before:**
```typescript
const resend = new Resend(process.env.RESEND_API_KEY); // Fails at build time
```

**After:**
```typescript
let resend: Resend | null = null;

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}
```

This prevents the error during build time when environment variables aren't available yet.

---

## 🚨 Important Notes

### Security:
- ✅ These variables are encrypted by Vercel
- ✅ Never commit `.env.local` to git
- ✅ Only add through Vercel dashboard

### Firebase Private Key:
The `FIREBASE_PRIVATE_KEY` must include the full key with line breaks. When adding to Vercel:
1. Copy the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
2. Paste it as-is
3. Vercel will preserve the formatting

### Troubleshooting:
If build still fails:
1. Check all variables are saved
2. Verify no typos in variable names
3. Check Firebase private key includes line breaks
4. Redeploy manually

---

## 📞 Need Help?

1. **Vercel Docs:** https://vercel.com/docs/environment-variables
2. **Check build logs** for specific errors
3. **Verify variables** are listed in Settings → Environment Variables

---

**Next Step:** Add these environment variables to Vercel, then push the code fix to trigger a new deployment!
