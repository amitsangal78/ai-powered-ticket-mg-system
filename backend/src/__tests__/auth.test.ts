import bcrypt from 'bcrypt';
import request from 'supertest';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createApp } from '../app.js';
import type { Env } from '../config/env.js';
import { signAccessToken } from '../middleware/auth.js';
import type { User } from '../schemas/domain.js';
import type { UserAuthRow } from '../repositories/userRepository.js';

vi.mock('../repositories/userRepository.js', () => ({
  findUserByEmailForAuth: vi.fn(),
  findUserById: vi.fn(),
  listUsers: vi.fn(),
  toUser: (row: UserAuthRow): User => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }),
}));

import {
  findUserByEmailForAuth,
  findUserById,
  listUsers,
} from '../repositories/userRepository.js';

const testEnv: Env = {
  DATABASE_URL: 'postgresql://localhost:5432/tickets_test',
  JWT_SECRET: 'test-secret-must-be-at-least-32-chars',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  PORT: 3000,
  NODE_ENV: 'test',
};

const now = new Date('2024-06-01T00:00:00.000Z');

function agentAuthRow(passwordHash: string): UserAuthRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Agent User',
    email: 'agent@example.com',
    role: 'agent',
    password_hash: passwordHash,
    created_at: now,
    updated_at: now,
  };
}

function publicAgent(): User {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Agent User',
    email: 'agent@example.com',
    role: 'agent',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('returns token and user without password fields on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('Agent123!', 12);
      vi.mocked(findUserByEmailForAuth).mockResolvedValue(
        agentAuthRow(passwordHash),
      );

      const app = createApp(testEnv);
      const res = await request(app).post('/api/auth/login').send({
        email: 'agent@example.com',
        password: 'Agent123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({
        id: publicAgent().id,
        email: 'agent@example.com',
        role: 'agent',
      });
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body.user).not.toHaveProperty('password_hash');
      expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    });

    it('returns 401 for wrong password', async () => {
      const passwordHash = await bcrypt.hash('Agent123!', 12);
      vi.mocked(findUserByEmailForAuth).mockResolvedValue(
        agentAuthRow(passwordHash),
      );

      const app = createApp(testEnv);
      const res = await request(app).post('/api/auth/login').send({
        email: 'agent@example.com',
        password: 'wrong-password',
      });

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('returns 401 for unknown email', async () => {
      vi.mocked(findUserByEmailForAuth).mockResolvedValue(null);

      const app = createApp(testEnv);
      const res = await request(app).post('/api/auth/login').send({
        email: 'missing@example.com',
        password: 'Agent123!',
      });

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('returns 400 VALIDATION_ERROR for invalid body', async () => {
      const app = createApp(testEnv);
      const res = await request(app).post('/api/auth/login').send({
        email: 'not-an-email',
        password: '',
      });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(res.body.details).toBeDefined();
    });

    it('returns 429 RATE_LIMITED after 10 attempts from same IP', async () => {
      vi.mocked(findUserByEmailForAuth).mockResolvedValue(null);
      const app = createApp(testEnv);

      for (let i = 0; i < 10; i += 1) {
        const res = await request(app).post('/api/auth/login').send({
          email: 'agent@example.com',
          password: 'x',
        });
        expect(res.status).toBe(401);
      }

      const limited = await request(app).post('/api/auth/login').send({
        email: 'agent@example.com',
        password: 'x',
      });
      expect(limited.status).toBe(429);
      expect(limited.body).toMatchObject({ code: 'RATE_LIMITED' });
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns current user for valid Bearer token', async () => {
      const user = publicAgent();
      vi.mocked(findUserById).mockResolvedValue(user);

      const token = signAccessToken(
        { sub: user.id, email: user.email, role: user.role },
        testEnv.JWT_SECRET,
      );

      const app = createApp(testEnv);
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(user);
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('returns 401 when Authorization header is missing', async () => {
      const app = createApp(testEnv);
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('returns 401 for malformed token', async () => {
      const app = createApp(testEnv);
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-jwt');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('authenticateToken + requireRole', () => {
    it('allows agent on GET /api/users and never leaks password fields', async () => {
      const user = publicAgent();
      vi.mocked(listUsers).mockResolvedValue([
        user,
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ]);

      const token = signAccessToken(
        { sub: user.id, email: user.email, role: 'agent' },
        testEnv.JWT_SECRET,
      );

      const app = createApp(testEnv);
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    });

    it('returns 401 for GET /api/users without token', async () => {
      const app = createApp(testEnv);
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('returns 403 when requireRole(admin) rejects an agent', async () => {
      const { Router } = await import('express');
      const express = (await import('express')).default;
      const { authenticateToken, requireRole } = await import(
        '../middleware/auth.js'
      );
      const { globalErrorHandler } = await import(
        '../middleware/errorHandler.js'
      );

      const app = express();
      const router = Router();
      router.get(
        '/admin-only',
        authenticateToken(testEnv.JWT_SECRET),
        requireRole('admin'),
        (_req, res) => {
          res.status(200).json({ ok: true });
        },
      );
      app.use(router);
      app.use(globalErrorHandler);

      const agentToken = signAccessToken(
        {
          sub: publicAgent().id,
          email: publicAgent().email,
          role: 'agent',
        },
        testEnv.JWT_SECRET,
      );

      const forbidden = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${agentToken}`);
      expect(forbidden.status).toBe(403);
      expect(forbidden.body).toMatchObject({ code: 'FORBIDDEN' });

      const adminToken = signAccessToken(
        {
          sub: '22222222-2222-4222-8222-222222222222',
          email: 'admin@example.com',
          role: 'admin',
        },
        testEnv.JWT_SECRET,
      );
      const allowed = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(allowed.status).toBe(200);
    });
  });
});
