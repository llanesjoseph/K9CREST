/**
 * Role Verification Integration Tests
 *
 * Tests the /api/auth/verify-role endpoint
 */

import { describe, it, expect } from 'vitest';

describe('GET /api/auth/verify-role - Role Verification Tests', () => {
  const baseUrl = 'http://localhost:3000';

  it('TC-015: Returns user role with valid token', async () => {
    // First, create a user and get token
    const email = `roletest${Date.now()}@example.com`;
    const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'SecurePass123!',
      }),
    });

    const { token } = await signupResponse.json();

    // Verify role
    const response = await fetch(`${baseUrl}/api/auth/verify-role`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('uid');
    expect(data).toHaveProperty('email', email);
    expect(data).toHaveProperty('role');
    expect(['admin', 'judge', 'competitor', 'spectator']).toContain(data.role);
  });

  it('TC-016: Rejects request without authorization header', async () => {
    const response = await fetch(`${baseUrl}/api/auth/verify-role`);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Unauthorized');
  });

  it('TC-017: Rejects request with invalid token', async () => {
    const response = await fetch(`${baseUrl}/api/auth/verify-role`, {
      headers: {
        'Authorization': 'Bearer invalid-token-12345',
      },
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('TC-018: Rejects request with malformed authorization header', async () => {
    const response = await fetch(`${baseUrl}/api/auth/verify-role`, {
      headers: {
        'Authorization': 'InvalidFormat token123',
      },
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('TC-019: Returns correct role for new user (spectator)', async () => {
    // Create new user
    const email = `spectator${Date.now()}@example.com`;
    const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'SecurePass123!',
      }),
    });

    const { token } = await signupResponse.json();

    // Verify role is spectator
    const response = await fetch(`${baseUrl}/api/auth/verify-role`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    expect(data.role).toBe('spectator');
  });

  it('TC-020: Includes security headers in response', async () => {
    // Create user and get token
    const email = `headers${Date.now()}@example.com`;
    const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'SecurePass123!',
      }),
    });

    const { token } = await signupResponse.json();

    const response = await fetch(`${baseUrl}/api/auth/verify-role`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    // Verify security headers
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-xss-protection')).toBe('1; mode=block');
  });
});
