/**
 * Global test setup
 * Runs before all tests
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

// Set environment variables for testing
// NODE_ENV is set by vitest automatically

// Firebase Emulator configuration
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Test environment variables
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef';

process.env.FIREBASE_PROJECT_ID = 'test-project';

// Suppress console during tests (optional - comment out to see logs)
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

beforeAll(() => {
  // Suppress console output during tests (optional)
  // console.log = vi.fn();
  // console.warn = vi.fn();
  // console.error = vi.fn();
});

afterAll(() => {
  // Restore console
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

afterEach(() => {
  // Clear mocks after each test
  // vi.clearAllMocks();
});
