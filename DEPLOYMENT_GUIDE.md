# K9CREST Deployment Guide

## Overview
This guide covers deploying the K9CREST application to Firebase Hosting with automated CI/CD pipeline.

## Prerequisites

### 1. Firebase CLI Installation
```bash
npm install -g firebase-tools
firebase login
```

### 2. Environment Variables Setup
Create a `.env.local` file in the project root with:
```bash
# Firebase Configuration (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id_here

# Google API Key (Required for address autocomplete)
GOOGLE_API_KEY=your_google_api_key_here
```

### 3. GitHub Secrets Setup
Add the following secrets to your GitHub repository:

**Required Secrets:**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `GOOGLE_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT` (JSON key for Firebase service account)

## Deployment Methods

### Method 1: Manual Deployment

#### 1. Build the Application
```bash
npm run build
```

#### 2. Deploy to Firebase
```bash
# Deploy only hosting
npm run deploy

# Deploy everything (hosting + firestore rules + indexes)
npm run deploy:all
```

### Method 2: Automated Deployment (Recommended)

#### 1. Push to Main Branch
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

The GitHub Actions workflow will automatically:
- Run type checking
- Run linting
- Build the application
- Deploy to Firebase Hosting

#### 2. Monitor Deployment
- Check the Actions tab in your GitHub repository
- View deployment logs for any issues
- Access your deployed app at: `https://k9-trials-tracker.web.app`

## Firebase Configuration

### 1. Hosting Configuration (`firebase.json`)
```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

### 2. Next.js Configuration (`next.config.js`)
```javascript
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // ... other config
};
```

## Security Considerations

### 1. Firestore Rules
Current rules allow all authenticated users full access. Consider implementing role-based access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow access for authenticated users
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Role-based access control
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Events - only admins can create, all authenticated users can read
    match /events/{eventId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Schedule - judges and admins can write, all authenticated users can read
    match /events/{eventId}/schedule/{runId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && 
        (isAdmin() || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'judge']);
    }
  }
}
```

### 2. Environment Variables
- Never commit `.env.local` to version control
- Use GitHub Secrets for CI/CD
- Rotate API keys regularly

## Monitoring and Maintenance

### 1. Firebase Console
- Monitor usage in Firebase Console
- Check Firestore usage and performance
- Review security rules and indexes

### 2. GitHub Actions
- Monitor deployment status
- Review build logs for issues
- Set up notifications for failed deployments

### 3. Performance Monitoring
- Use Firebase Performance Monitoring
- Monitor Core Web Vitals
- Track user engagement metrics

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check TypeScript errors
npm run typecheck

# Check linting errors
npm run lint

# Clear Next.js cache
rm -rf .next
npm run build
```

#### 2. Deployment Failures
```bash
# Check Firebase CLI version
firebase --version

# Re-authenticate
firebase logout
firebase login

# Check project configuration
firebase projects:list
firebase use k9-trials-tracker
```

#### 3. Environment Variable Issues
- Verify all required variables are set
- Check variable names match exactly
- Ensure no trailing spaces in values

### Debug Commands
```bash
# Test build locally
npm run build

# Preview deployment
firebase hosting:channel:open

# Check Firestore rules
firebase firestore:rules:get

# Deploy with debug info
firebase deploy --debug
```

## Production Checklist

### Before Deployment
- [ ] All environment variables configured
- [ ] TypeScript errors resolved
- [ ] Linting errors resolved
- [ ] Tests passing
- [ ] Security rules reviewed
- [ ] Performance optimized

### After Deployment
- [ ] Application loads correctly
- [ ] Authentication works
- [ ] Database operations function
- [ ] All features tested
- [ ] Performance metrics acceptable
- [ ] Error monitoring active

## Rollback Procedure

### 1. Quick Rollback
```bash
# Deploy previous version
git checkout <previous-commit>
npm run deploy
```

### 2. Firebase Console Rollback
- Go to Firebase Console > Hosting
- Select previous deployment
- Click "Rollback"

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Review Firebase Console for errors
3. Check browser console for client-side errors
4. Verify environment variables are correct

## Next Steps

1. **Set up monitoring** - Implement error tracking and performance monitoring
2. **Add staging environment** - Create a staging deployment for testing
3. **Implement blue-green deployment** - Reduce downtime during deployments
4. **Add automated testing** - Include E2E tests in CI/CD pipeline
5. **Set up alerts** - Configure notifications for deployment failures
