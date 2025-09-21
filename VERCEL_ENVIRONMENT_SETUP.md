# 🔧 Vercel Environment Variables Setup Guide

## 📋 **REQUIRED ENVIRONMENT VARIABLES FOR VERCEL**

### **Step 1: Go to Vercel Dashboard**
1. Navigate to your project in Vercel Dashboard
2. Go to **Settings** → **Environment Variables**
3. Add each variable below with the exact name and value

### **Step 2: Add Environment Variables**

#### **🔑 FIREBASE CLIENT CONFIGURATION (Required)**
```bash
NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSyDQfOtv4r6MF-BhT-YAYnJvDcn-oyIXt_M
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = k9-trials-tracker.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID = k9-trials-tracker
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = k9-trials-tracker.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 174322418803
NEXT_PUBLIC_FIREBASE_APP_ID = 1:174322418803:web:8b556b1f6f3d3dc45dd606
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = G-SS5GVZNWBQ
```

#### **🔐 FIREBASE ADMIN SDK (Required for API endpoints)**
```bash
FIREBASE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-xxxxx@k9-trials-tracker.iam.gserviceaccount.com
```

#### **🤖 GOOGLE API (Required for AI features)**
```bash
GOOGLE_API_KEY = your_google_api_key_here
```

#### **🛡️ SECURITY CONFIGURATION (Optional but recommended)**
```bash
ALLOWED_EMAIL_DOMAINS = yourdomain.com,crucibleanalytics.dev
MAX_FILE_SIZE = 10485760
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW = 900000
```

#### **📧 EMAIL CONFIGURATION (Optional for MVP)**
```bash
EMAIL_HOST = smtp.yourprovider.com
EMAIL_PORT = 587
EMAIL_USER = noreply@yourdomain.com
EMAIL_PASS = your_email_password
EMAIL_FROM = noreply@yourdomain.com
```

#### **📊 MONITORING (Optional)**
```bash
SENTRY_DSN = your_sentry_dsn_here
SENTRY_ENVIRONMENT = production
```

## 🔧 **HOW TO GET FIREBASE ADMIN CREDENTIALS**

### **Step 1: Download Service Account Key**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `k9-trials-tracker`
3. Go to **Project Settings** → **Service Accounts** tab
4. Click **"Generate New Private Key"**
5. Download the JSON file

### **Step 2: Extract Values**
From the downloaded JSON file, copy these values:

```json
{
  "type": "service_account",
  "project_id": "k9-trials-tracker",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@k9-trials-tracker.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### **Step 3: Add to Vercel**
- **FIREBASE_PRIVATE_KEY**: Copy the entire `private_key` value (including the `\n` characters)
- **FIREBASE_CLIENT_EMAIL**: Copy the `client_email` value

## 🚀 **DEPLOYMENT PROCESS**

### **Step 1: Configure Environment Variables**
1. Add all required environment variables in Vercel Dashboard
2. Make sure to select **"Production"** environment for each variable
3. Optionally add to **"Preview"** and **"Development"** environments

### **Step 2: Deploy**
1. Push your code to the `main` branch
2. Vercel will automatically trigger a deployment
3. Monitor the build logs for any issues

### **Step 3: Verify Deployment**
1. Check that the application loads without errors
2. Test authentication functionality
3. Verify API endpoints are working
4. Test role-based access control

## 🔍 **TROUBLESHOOTING**

### **Build Failures**
- **Missing Environment Variables**: Ensure all required variables are set
- **Invalid Firebase Credentials**: Verify private key format includes `\n` characters
- **TypeScript Errors**: Check that all code compiles without errors

### **Runtime Errors**
- **Authentication Issues**: Verify Firebase configuration is correct
- **API Errors**: Check Firebase Admin SDK credentials
- **Database Access**: Ensure Firestore security rules are deployed

### **Common Issues**
```bash
# Issue: "Service account object must contain a string 'private_key' property"
# Solution: Ensure FIREBASE_PRIVATE_KEY includes the full key with \n characters

# Issue: "Firebase App named '[DEFAULT]' already exists"
# Solution: This is normal in production, can be ignored

# Issue: API endpoints returning 401/403
# Solution: Check Firebase Admin SDK configuration and custom claims
```

## ✅ **VERIFICATION CHECKLIST**

### **Pre-Deployment**
- [ ] All required environment variables added to Vercel
- [ ] Firebase Admin SDK credentials properly formatted
- [ ] Build passes locally (`npm run build`)
- [ ] No TypeScript errors in production build

### **Post-Deployment**
- [ ] Application loads without errors
- [ ] Authentication works correctly
- [ ] API endpoints respond properly
- [ ] Role-based access control functions
- [ ] Database operations work correctly

---

## 🎉 **READY FOR DEPLOYMENT!**

**Once you've added all environment variables to Vercel:**
1. **Push to main branch** - Deployment will trigger automatically
2. **Monitor build logs** - Watch for any errors during deployment
3. **Test the application** - Verify all functionality works correctly
4. **Share the URL** - Your application will be live at `https://your-project.vercel.app`

**Your K9CREST application is now ready for production deployment on Vercel!** 🚀
