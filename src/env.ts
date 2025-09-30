import { z } from "zod";

// Client-side environment schema (only NEXT_PUBLIC_ vars are available)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, "NEXT_PUBLIC_FIREBASE_API_KEY is required"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is required"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_PROJECT_ID is required"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is required"),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is required"),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_APP_ID is required"),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is required"),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1, "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is required"),
});

// Server-side environment schema
const serverEnvSchema = clientEnvSchema.extend({
  // Google API Keys - Multiple keys for different services
  GOOGLE_API_KEY: z.string().min(1, "GOOGLE_API_KEY is required"), // Primary AI API key
  GOOGLE_MAPS_API_KEY: z.string().min(1, "GOOGLE_MAPS_API_KEY is required"), // Maps and Places API
  GOOGLE_API_KEY_2: z.string().optional(), // Backup/general use API key
  
  // Firebase Admin SDK (required for server-side operations)
  FIREBASE_PRIVATE_KEY: z.string().min(1, "FIREBASE_PRIVATE_KEY is required"),
  FIREBASE_CLIENT_EMAIL: z.string().email("FIREBASE_CLIENT_EMAIL must be a valid email"),
  
  // Sentry (optional but recommended in prod)
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),

  // Email Configuration - Optional for MVP
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email if provided").optional(),
  
  // Security Configuration
  ALLOWED_EMAIL_DOMAINS: z.string().optional(), // Comma-separated list of allowed email domains
  MAX_FILE_SIZE: z.string().optional().transform(val => val ? parseInt(val) : 10 * 1024 * 1024), // Default 10MB
  RATE_LIMIT_REQUESTS: z.string().optional().transform(val => val ? parseInt(val) : 100), // Default 100 requests
  RATE_LIMIT_WINDOW: z.string().optional().transform(val => val ? parseInt(val) : 15 * 60 * 1000), // Default 15 minutes
  
  // JWT Configuration
  JWT_SECRET: z.string().optional(), // For additional JWT validation if needed
  JWT_EXPIRES_IN: z.string().optional().default("1h"),

  // Resend Email Service (for bug reports and notifications)
  RESEND_API_KEY: z.string().optional(), // Get from https://resend.com/api-keys
  RESEND_FROM_EMAIL: z.string().optional(),
  BUG_REPORT_EMAIL: z.string().email("BUG_REPORT_EMAIL must be a valid email if provided").optional(),
});

// Export appropriate env based on runtime
export const env = typeof window === 'undefined'
  ? serverEnvSchema.parse(process.env)
  : clientEnvSchema.parse(process.env);
