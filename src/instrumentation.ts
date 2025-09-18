// Optional Sentry integration - only load if available
let Sentry: any = null;
try {
  Sentry = require('@sentry/nextjs');
} catch (e) {
  // Sentry not available
}

export async function register() {
  if (Sentry) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      enabled: !!process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    });
  }
}

