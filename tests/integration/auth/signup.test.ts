/**
 * Authentication Sign-Up Integration Tests
 *
 * Tests the /api/auth/signup endpoint with rate limiting and validation
 */

import { describe, it, expect } from 'vitest';

describe('POST /api/auth/signup - Sign Up Tests', () => {
  const baseUrl = 'http://localhost:3000';

  it('TC-009: Successfully creates account with valid credentials', async () => {
    const uniqueEmail = `test${Date.now()}@example.com`;

    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'SecurePass123!',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('uid');
    expect(data).toHaveProperty('token');
    expect(data.email).toBe(uniqueEmail);
  });

  it('TC-010: Rejects signup with duplicate email', async () => {
    const email = `duplicate${Date.now()}@example.com`;

    // Create account first time
    await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'SecurePass123!',
      }),
    });

    // Try to create same account again
    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'SecurePass123!',
      }),
    });

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('already exists');
  });

  it('TC-011: Enforces strong password requirements', async () => {
    const weakPasswords = [
      { password: 'short1A', desc: 'too short' },
      { password: 'nouppercase123', desc: 'no uppercase' },
      { password: 'NOLOWERCASE123', desc: 'no lowercase' },
      { password: 'NoNumbers!', desc: 'no numbers' },
    ];

    for (const test of weakPasswords) {
      const response = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `test${Date.now()}@example.com`,
          password: test.password,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      // Should explain what's wrong with the password
      expect(data.error).toBeTruthy();
    }
  });

  it('TC-012: Enforces rate limiting (3 signups per hour)', async () => {
    // Make 3 signup attempts
    for (let i = 0; i < 3; i++) {
      await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `ratelimit${Date.now()}${i}@example.com`,
          password: 'SecurePass123!',
        }),
      });
    }

    // 4th attempt should be rate limited
    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `ratelimit${Date.now()}@example.com`,
        password: 'SecurePass123!',
      }),
    });

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Too many requests');
  });

  it('TC-013: Validates email format', async () => {
    const invalidEmails = [
      'notanemail',
      'missing@domain',
      '@nodomain.com',
      'spaces in@email.com',
    ];

    for (const email of invalidEmails) {
      const response = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'SecurePass123!',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid email');
    }
  });

  it('TC-014: Creates user with default spectator role', async () => {
    const email = `newuser${Date.now()}@example.com`;

    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'SecurePass123!',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);

    // Verify user has spectator role (would need to check Firestore)
    // This is tested in role verification tests
  });
});
