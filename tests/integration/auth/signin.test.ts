/**
 * Authentication Sign-In Integration Tests
 *
 * Tests the /api/auth/login endpoint with rate limiting
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('POST /api/auth/login - Sign In Tests', () => {
  const baseUrl = 'http://localhost:3000';
  const validEmail = 'test@example.com';
  const validPassword = 'TestPass123!';

  it('TC-001: Successfully logs in with valid credentials', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: validEmail,
        password: validPassword,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('token');
    expect(data).toHaveProperty('uid');
    expect(data.email).toBe(validEmail);
  });

  it('TC-002: Rejects login with invalid email', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: validPassword,
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Invalid email');
  });

  it('TC-003: Rejects login with incorrect password', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: validEmail,
        password: 'WrongPassword123!',
      }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Invalid email or password');
  });

  it('TC-004: Rejects login with non-existent user', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: validPassword,
      }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Invalid email or password');
  });

  it('TC-005: Enforces rate limiting after 5 failed attempts', async () => {
    const invalidEmail = `ratelimit${Date.now()}@example.com`;

    // Make 5 failed login attempts
    for (let i = 0; i < 5; i++) {
      await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invalidEmail,
          password: 'WrongPassword',
        }),
      });
    }

    // 6th attempt should be rate limited
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: invalidEmail,
        password: 'WrongPassword',
      }),
    });

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Too many requests');
    expect(data).toHaveProperty('retryAfter');
  });

  it('TC-006: Rejects login with missing email', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: validPassword,
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('TC-007: Rejects login with missing password', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: validEmail,
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('TC-008: Rejects login with password too short', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: validEmail,
        password: '12345', // Less than 6 characters
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('at least 6 characters');
  });
});
