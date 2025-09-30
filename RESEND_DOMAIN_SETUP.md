# 📧 Resend Custom Domain Setup

## Setting Up Your Custom Domain

Based on your Resend dashboard, you can now set up a custom sending domain.

---

## 🎯 Step 1: Choose Your Domain

You have two options:

### Option A: crucibleanalytics.dev
**Sender email:** `bugs@crucibleanalytics.dev`

### Option B: k9crest.com (if you own it)
**Sender email:** `bugs@k9crest.com`

**Recommended:** Use `crucibleanalytics.dev` since that's your creator email domain.

---

## 🚀 Step 2: Add Domain to Resend

1. **Go to Domains page:**
   - Click "Domains" in the left sidebar
   - OR visit: https://resend.com/domains

2. **Click "Add Domain"**

3. **Enter your domain:**
   ```
   crucibleanalytics.dev
   ```

4. **Click "Add"**

---

## 📋 Step 3: Configure DNS Records

Resend will show you DNS records to add. Here's what you'll need:

### Required Records:

#### 1. SPF Record (TXT)
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

#### 2. DKIM Records (CNAME)
Resend will provide 3 CNAME records like:
```
Type: CNAME
Name: resend._domainkey
Value: [Resend will provide this]

Type: CNAME
Name: resend2._domainkey
Value: [Resend will provide this]

Type: CNAME
Name: resend3._domainkey
Value: [Resend will provide this]
```

### Where to Add DNS Records:

**If using Cloudflare:**
1. Go to: https://dash.cloudflare.com
2. Select your domain: `crucibleanalytics.dev`
3. Click "DNS" → "Records"
4. Add each record Resend showed you

**If using another DNS provider:**
- GoDaddy: DNS Management
- Namecheap: Advanced DNS
- Google Domains: DNS settings
- etc.

---

## ⏱️ Step 4: Wait for DNS Propagation

- **Typical wait time:** 5-30 minutes
- **Maximum wait time:** 48 hours (rare)

**Check propagation:**
```bash
# Check SPF record
nslookup -type=TXT crucibleanalytics.dev

# Check DKIM records
nslookup -type=CNAME resend._domainkey.crucibleanalytics.dev
```

---

## ✅ Step 5: Verify Domain in Resend

1. Go back to Resend dashboard
2. Click on your domain
3. Click "Verify DNS Records"
4. Wait for green checkmarks ✅

**Status indicators:**
- 🟡 Pending - DNS not propagated yet
- ✅ Verified - Domain ready to use!
- ❌ Failed - Check DNS records

---

## 🔧 Step 6: Update Your Environment Variable

Once verified, update `.env.local`:

```bash
# Change FROM this:
RESEND_FROM_EMAIL=onboarding@resend.dev

# TO this:
RESEND_FROM_EMAIL=K9CREST Bug Hunter <bugs@crucibleanalytics.dev>
```

**Email format options:**
```bash
# With name
RESEND_FROM_EMAIL=Bug Hunter <bugs@crucibleanalytics.dev>

# With app name
RESEND_FROM_EMAIL=K9CREST <bugs@crucibleanalytics.dev>

# Simple (no name)
RESEND_FROM_EMAIL=bugs@crucibleanalytics.dev

# Fun option
RESEND_FROM_EMAIL=🐛 Bug Hunter <bugs@crucibleanalytics.dev>
```

---

## 🧪 Step 7: Test It

1. **Restart dev server:**
   ```bash
   npm run dev
   ```

2. **Send a test bug report:**
   - Click the bug icon
   - Submit a test report
   - Check your email

3. **Verify sender:**
   - Email should come from `bugs@crucibleanalytics.dev`
   - Not from `onboarding@resend.dev`

---

## 🎯 Quick Setup (Copy-Paste Ready)

### If you use Cloudflare:

**Step 1:** Add to Resend
- Domain: `crucibleanalytics.dev`

**Step 2:** Copy DNS records from Resend

**Step 3:** Paste into Cloudflare DNS

**Step 4:** Wait 5-10 minutes

**Step 5:** Verify in Resend

**Step 6:** Update `.env.local`:
```bash
RESEND_FROM_EMAIL=Bug Hunter <bugs@crucibleanalytics.dev>
```

**Step 7:** Restart server and test!

---

## ⚠️ Troubleshooting

### Domain verification failed

**Check:**
1. DNS records are exactly as Resend specified
2. No typos in record values
3. Wait longer (DNS can take time)
4. Check DNS propagation tools

### Emails still coming from onboarding@resend.dev

**Fix:**
1. Verify domain is showing ✅ in Resend
2. Check `.env.local` was updated
3. Restart dev server
4. Clear browser cache

### DNS propagation taking too long

**Options:**
1. Use onboarding@resend.dev temporarily (it works!)
2. Wait up to 48 hours for DNS
3. Contact your DNS provider

---

## 📊 Benefits of Custom Domain

✅ **Professional appearance**
- Emails from your domain
- Better brand recognition

✅ **Better deliverability**
- Higher trust from email providers
- Less likely to go to spam

✅ **Control**
- Manage your own sender reputation
- Full analytics and tracking

---

## 🚀 For Now: Use Default Domain

**Good news:** The bug hunter works perfectly with the default domain!

Current config (works immediately):
```bash
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Set up custom domain later** when you have time for DNS configuration.

---

## 📞 Need Help?

- **Resend Docs:** https://resend.com/docs/dashboard/domains/introduction
- **Resend Support:** https://resend.com/support
- **DNS Help:** Check your DNS provider's documentation

---

**Status:** Ready to add custom domain when you're ready!

**Current:** Using `onboarding@resend.dev` (works great!)

**Future:** Use `bugs@crucibleanalytics.dev` (more professional)
