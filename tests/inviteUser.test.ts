import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    createUser: vi.fn().mockResolvedValue({ uid: '1', email: 'test@example.com' }),
    setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
    generatePasswordResetLink: vi.fn().mockResolvedValue('http://link'),
  }),
}));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: () => ({ doc: () => ({ set: vi.fn().mockResolvedValue(undefined) }) }) },
}));

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(),
}));

describe('inviteUser', () => {
  it('fails fast when SMTP config is incomplete', async () => {
    vi.mock('@/env', () => ({ env: { EMAIL_HOST: '', EMAIL_PORT: '', EMAIL_USER: '', EMAIL_PASS: '', EMAIL_FROM: '' } }));
    const { inviteUser } = await import('@/ai/flows/invite-user');
    await expect(inviteUser({ email: 'user@example.com', role: 'admin' })).rejects.toThrow(/Missing SMTP configuration/);
  });
});
