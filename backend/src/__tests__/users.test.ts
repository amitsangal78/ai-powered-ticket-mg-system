import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import type { Env } from '../config/env.js';
import { signAccessToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import type { User } from '../schemas/domain.js';

vi.mock('../services/userService.js', () => ({
  listUsersForAssigneePicker: vi.fn(),
  getUserById: vi.fn(),
  createUserAsAdmin: vi.fn(),
  updateUserAsAdmin: vi.fn(),
  deleteUserAsAdmin: vi.fn(),
}));

import {
  createUserAsAdmin,
  deleteUserAsAdmin,
  getUserById,
  listUsersForAssigneePicker,
  updateUserAsAdmin,
} from '../services/userService.js';

const testEnv: Env = {
  DATABASE_URL: 'postgresql://localhost:5432/tickets_test',
  JWT_SECRET: 'test-secret-must-be-at-least-32-chars',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  PORT: 3000,
  NODE_ENV: 'test',
};

const agentId = '11111111-1111-4111-8111-111111111111';
const adminId = '22222222-2222-4222-8222-222222222222';
const now = '2024-06-01T00:00:00.000Z';

function bearer(role: 'agent' | 'admin'): string {
  const sub = role === 'admin' ? adminId : agentId;
  const email = role === 'admin' ? 'admin@example.com' : 'agent@example.com';
  const token = signAccessToken(
    { sub, email, role },
    testEnv.JWT_SECRET,
  );
  return `Bearer ${token}`;
}

function sampleUser(overrides: Partial<User> = {}): User {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'New Agent',
    email: 'new.agent@example.com',
    role: 'agent',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('allows agents to list users for assignee picker', async () => {
      vi.mocked(listUsersForAssigneePicker).mockResolvedValue([
        sampleUser({ id: agentId, email: 'agent@example.com' }),
        sampleUser({
          id: adminId,
          email: 'admin@example.com',
          role: 'admin',
          name: 'Admin User',
        }),
      ]);

      const app = createApp(testEnv);
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', bearer('agent'));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    });
  });

  describe('admin user CRUD', () => {
    it('creates a user as admin (201) without password fields', async () => {
      const created = sampleUser();
      vi.mocked(createUserAsAdmin).mockResolvedValue(created);

      const app = createApp(testEnv);
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', bearer('admin'))
        .send({
          name: 'New Agent',
          email: 'new.agent@example.com',
          role: 'agent',
          password: 'SecurePass1',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(created);
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(createUserAsAdmin).toHaveBeenCalled();
    });

    it('forbids agents from creating users (403)', async () => {
      const app = createApp(testEnv);
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', bearer('agent'))
        .send({
          name: 'New Agent',
          email: 'new.agent@example.com',
          role: 'agent',
          password: 'SecurePass1',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(createUserAsAdmin).not.toHaveBeenCalled();
    });

    it('gets a user by id as admin', async () => {
      const user = sampleUser();
      vi.mocked(getUserById).mockResolvedValue(user);

      const app = createApp(testEnv);
      const res = await request(app)
        .get(`/api/users/${user.id}`)
        .set('Authorization', bearer('admin'));

      expect(res.status).toBe(200);
      expect(res.body).toEqual(user);
    });

    it('updates a user as admin', async () => {
      const updated = sampleUser({ name: 'Renamed' });
      vi.mocked(updateUserAsAdmin).mockResolvedValue(updated);

      const app = createApp(testEnv);
      const res = await request(app)
        .patch(`/api/users/${updated.id}`)
        .set('Authorization', bearer('admin'))
        .send({ name: 'Renamed' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Renamed');
      expect(updateUserAsAdmin).toHaveBeenCalledWith(updated.id, {
        name: 'Renamed',
      });
    });

    it('forbids agents from updating users', async () => {
      const app = createApp(testEnv);
      const res = await request(app)
        .patch(`/api/users/${sampleUser().id}`)
        .set('Authorization', bearer('agent'))
        .send({ name: 'Nope' });

      expect(res.status).toBe(403);
      expect(updateUserAsAdmin).not.toHaveBeenCalled();
    });

    it('deletes a user as admin (204)', async () => {
      vi.mocked(deleteUserAsAdmin).mockResolvedValue(undefined);

      const app = createApp(testEnv);
      const res = await request(app)
        .delete(`/api/users/${sampleUser().id}`)
        .set('Authorization', bearer('admin'));

      expect(res.status).toBe(204);
      expect(deleteUserAsAdmin).toHaveBeenCalled();
    });

    it('returns 409 when delete hits FK RESTRICT', async () => {
      vi.mocked(deleteUserAsAdmin).mockRejectedValue(
        new AppError(409, 'CONFLICT', 'Related resource not found'),
      );

      const app = createApp(testEnv);
      const res = await request(app)
        .delete(`/api/users/${sampleUser().id}`)
        .set('Authorization', bearer('admin'));

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONFLICT');
    });

    it('forbids agents from deleting users', async () => {
      const app = createApp(testEnv);
      const res = await request(app)
        .delete(`/api/users/${sampleUser().id}`)
        .set('Authorization', bearer('agent'));

      expect(res.status).toBe(403);
      expect(deleteUserAsAdmin).not.toHaveBeenCalled();
    });

    it('validates create body', async () => {
      const app = createApp(testEnv);
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', bearer('admin'))
        .send({
          name: 'x',
          email: 'bad',
          role: 'agent',
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });
});
