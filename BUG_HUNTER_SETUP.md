# 🐛 Bug Hunter Setup Guide

## Overview

The Bug Hunter feature provides a persistent floating button in the bottom-right corner that:
- ✅ Automatically captures console errors and warnings
- ✅ Allows users to report bugs with descriptions
- ✅ Sends detailed bug reports via email using Resend
- ✅ Includes system information (URL, browser, user email)
- ✅ Shows error count with badge notification

---

## 🚀 Quick Setup

### Step 1: Get Resend API Key

1. **Sign up at Resend:** https://resend.com
2. **Get API Key:**
   - Go to: https://resend.com/api-keys
   - Click "Create API Key"
   - Copy your API key (starts with `re_`)

### Step 2: Update Environment Variables

Add these to your `.env.local`:

```bash
# Resend Email Service (for bug reports and notifications)
RESEND_API_KEY=re_YOUR_API_KEY_HERE
RESEND_FROM_EMAIL=K9CREST Bug Hunter <bugs@k9crest.com>
BUG_REPORT_EMAIL=joseph@crucibleanalytics.dev
```

**Important:**
- Replace `re_YOUR_API_KEY_HERE` with your actual Resend API key
- The `RESEND_FROM_EMAIL` can be customized (must be verified domain in Resend)
- `BUG_REPORT_EMAIL` is where bug reports will be sent

### Step 3: Verify Domain (Optional but Recommended)

If you want to use a custom "from" email:

1. **Go to Resend Dashboard:** https://resend.com/domains
2. **Add your domain** (e.g., `k9crest.com`)
3. **Add DNS records** as shown in Resend
4. **Verify the domain**
5. **Update `.env.local`:**
   ```bash
   RESEND_FROM_EMAIL=Bug Hunter <bugs@k9crest.com>
   ```

If you skip this step, Resend will use their default sending domain.

### Step 4: Restart Dev Server

```bash
# Kill any running processes
npm run dev
```

---

## 🧪 Testing the Bug Hunter

### Test 1: Manual Bug Report

1. Open your app: http://localhost:3000
2. Click the orange bug icon in the bottom-right corner
3. Fill out the bug report form
4. Click "Send Bug Report"
5. Check your email at `BUG_REPORT_EMAIL`

### Test 2: Console Error Capture

1. Open browser console (F12)
2. Run: `console.error("Test error message")`
3. Click the bug icon (should show badge with "1")
4. See the captured error in the bug report dialog
5. Submit the report

### Test 3: Automatic Error Capture

1. Navigate to a page that has errors
2. The bug icon will turn red and pulse
3. Badge shows error count
4. Click to see all captured errors

---

## 📋 Features

### Automatic Error Tracking
- Captures `console.error()` calls
- Captures `console.warn()` calls
- Captures unhandled errors
- Captures unhandled promise rejections
- Keeps last 10 errors in memory

### Bug Report Contents
- **User Input:**
  - Bug title (required)
  - Description (optional)

- **Automatic Data:**
  - Console errors with stack traces
  - User email (if logged in)
  - Current URL
  - Browser/device info (User Agent)
  - Timestamp

### Visual Indicators
- **Orange icon:** Normal state, ready to report bugs
- **Red pulsing icon:** Errors detected
- **Badge:** Shows error count
- **Copy button:** Copy all errors to clipboard

---

## 🎨 Customization

### Change Icon Position

Edit `src/components/bug-report-button.tsx`:

```tsx
// Line ~192
<button
  className="fixed bottom-6 right-6 z-50 ..." // Change bottom-6 or right-6
```

### Change Email Template

Edit `src/app/api/bug-report/route.ts` to customize the email HTML.

### Add More Error Types

Edit `src/components/bug-report-button.tsx` in the `useEffect` hook to capture more console methods or custom events.

---

## 🔧 Troubleshooting

### Bug reports not sending

1. **Check Resend API key:**
   ```bash
   echo $RESEND_API_KEY  # Should start with re_
   ```

2. **Check server logs:**
   - Look for errors in your terminal where `npm run dev` is running
   - Common errors:
     - "Email service not configured" → Missing RESEND_API_KEY
     - "Failed to send" → Invalid API key
     - Domain verification needed → Use default Resend domain

3. **Verify environment variables loaded:**
   - Add to `src/app/api/bug-report/route.ts`:
   ```ts
   console.log('Resend API Key exists:', !!process.env.RESEND_API_KEY);
   ```

### Icon not showing

1. **Check browser console** for errors
2. **Verify component imported** in `src/app/layout.tsx`
3. **Clear cache** and restart dev server

### Errors not being captured

1. Check browser console - errors should still appear there
2. The component may not be mounted - check layout
3. Try manually calling: `console.error("test")`

---

## 📊 Email Example

Bug reports will be sent with this format:

```
Subject: 🐛 Bug Report: [User's Title]

Body:
🐛 Bug Report
────────────────────────
[User's Title]

Description:
[User's description]

Console Errors (X):
[ERROR] 2024-01-15 10:30:45
Error message here
Stack trace...

System Information:
User Email: user@example.com
URL: /dashboard/events/create
Timestamp: 2024-01-15 10:30:45
Browser: Mozilla/5.0...
```

---

## 🔐 Security Notes

- Bug reports may contain sensitive information
- Only authenticated users' emails are included
- Console errors may expose internal logic
- Consider who has access to `BUG_REPORT_EMAIL`
- Resend API key should be kept secret (never commit to git)

---

## 🚀 Production Deployment

### Environment Variables for Production

Add these to your production environment (Vercel, etc.):

```bash
RESEND_API_KEY=re_your_production_key
RESEND_FROM_EMAIL=bugs@yourdomain.com
BUG_REPORT_EMAIL=your-team@yourdomain.com
```

### Recommended: Use Verified Domain

For production, verify your domain in Resend to:
- ✅ Improve email deliverability
- ✅ Use custom sender email
- ✅ Avoid spam filters
- ✅ Professional appearance

---

## 📚 API Reference

### POST /api/bug-report

**Request Body:**
```ts
{
  title: string;           // Required
  description: string;     // Optional
  errors: Array<{
    message: string;
    stack?: string;
    timestamp: string;
    type: "error" | "warn" | "info";
  }>;
  userAgent: string;
  url: string;
  userEmail: string;
  timestamp: string;
}
```

**Response:**
```ts
{
  success: true;
  message: "Bug report sent successfully";
  emailId: string;
}
```

---

## 🎯 Next Steps

1. ✅ Get Resend API key
2. ✅ Update `.env.local`
3. ✅ Restart dev server
4. ✅ Test bug reporting
5. ✅ (Optional) Verify custom domain
6. ✅ Deploy to production with prod env vars

---

## 💡 Tips

- **Encourage users to report bugs** by making the icon prominent
- **Review bug reports regularly** to improve the app
- **Set up email filters** for bug reports
- **Consider integration with issue tracking** (GitHub Issues, Jira, etc.)
- **Monitor Resend usage** to stay within free tier limits

---

## 🆘 Support

If you encounter issues:
1. Check this guide first
2. Verify environment variables
3. Check Resend dashboard for delivery logs
4. Review server logs for errors
5. Test with simple error: `console.error("test")`

---

**Status:** ✅ Bug Hunter is installed and ready to use!

Get your Resend API key at: https://resend.com/api-keys
