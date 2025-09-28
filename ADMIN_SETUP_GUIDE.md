# 🔐 ADMIN SETUP GUIDE

## **Setting Up joseph@crucibleanalytics.dev as Admin**

### **METHOD 1: Using the Bootstrap Admin Page (Recommended)**

1. **Make sure you're logged in** as `joseph@crucibleanalytics.dev`
2. **Navigate to**: `http://localhost:3000/bootstrap-admin`
3. **Click "Set Admin Role"** button
4. **Log out and log back in** to refresh your authentication token

### **METHOD 2: Using the Admin Setup Script**

1. **Make sure you have Firebase Admin SDK credentials** in your `.env.local`:
   ```bash
   FIREBASE_PRIVATE_KEY=your_firebase_private_key_here
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@k9-trial-scoring-system.iam.gserviceaccount.com
   ```

2. **Run the admin setup script**:
   ```bash
   npm run set-admin
   ```

3. **Log out and log back in** to refresh your authentication token

### **METHOD 3: Manual Firebase Console Setup**

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: "k9-trials-tracker"
3. **Go to Authentication** → **Users**
4. **Find joseph@crucibleanalytics.dev**
5. **Click on the user** → **Custom Claims**
6. **Add custom claim**:
   - Key: `role`
   - Value: `admin`

---

## **✅ VERIFICATION - What You Should See as Admin**

Once you're set up as admin, you should have access to:

### **🎯 Main Navigation (Admin Only)**
- **Dashboard**: Full dashboard with admin statistics
- **Events**: Create, edit, delete events
- **Manage Rubrics**: Create and configure scoring rubrics
- **Reports**: Generate and view reports
- **Analysis**: Advanced analytics and insights
- **Users**: Manage all platform users
- **Settings**: System settings and configuration

### **🛠️ Creation Features (Admin Only)**
- **Create Events**: Full event creation with all options
- **Manage Competitors**: Add, edit, remove competitors
- **Configure Rubrics**: Set up scoring systems
- **Schedule Management**: AI-powered scheduling
- **User Management**: Invite, assign roles, manage users
- **System Configuration**: Platform settings

### **📊 Admin-Specific Features**
- **Role Switching**: Debug tool to test different user roles
- **User Management**: Full CRUD operations on users
- **Event Management**: Complete event lifecycle management
- **Analytics**: Advanced reporting and insights
- **System Logs**: Audit trails and system monitoring

---

## **🔍 TROUBLESHOOTING**

### **If you don't see admin features:**

1. **Check your email**: Make sure you're logged in as `joseph@crucibleanalytics.dev`
2. **Refresh authentication**: Log out and log back in
3. **Check browser console**: Look for any authentication errors
4. **Verify role**: Check if your role is set correctly in Firebase

### **If the bootstrap page shows 401 error:**

1. **Make sure you're logged in** with the correct email
2. **Check Firebase Admin SDK credentials** are set in your environment
3. **Try the manual script method** instead

### **If you can't access creation features:**

1. **Verify admin role** is set in Firebase Auth custom claims
2. **Check Firestore** has your user record with `role: 'admin'`
3. **Clear browser cache** and refresh

---

## **🚀 NEXT STEPS AFTER ADMIN SETUP**

1. **Test Event Creation**: Create a test event to verify full access
2. **Invite Users**: Use the user management to invite team members
3. **Configure Rubrics**: Set up your scoring rubrics
4. **Create Your First Event**: Set up your first trial event

---

## **📞 SUPPORT**

If you encounter any issues:
1. Check the browser console for errors
2. Verify your authentication status
3. Ensure Firebase Admin SDK is properly configured
4. Contact support if problems persist

**STATUS**: Ready to set up admin access for joseph@crucibleanalytics.dev
