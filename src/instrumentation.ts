import * as Sentry from '@sentry/nextjs';

export async function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: !!process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  });
}

