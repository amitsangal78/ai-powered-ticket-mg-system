import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import type { Env } from '../config/env.js';

const testEnv: Env = {
  DATABASE_URL: 'postgresql://localhost:5432/tickets_test',
  JWT_SECRET: 'test-secret-must-be-at-least-32-chars',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  PORT: 3000,
  NODE_ENV: 'test',
};

describe('GET /api/health', () => {
  it('returns 200 with status ok without requiring DB', async () => {
    const app = createApp(testEnv);
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('unknown routes', () => {
  it('returns 404 NOT_FOUND wire shape', async () => {
    const app = createApp(testEnv);
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      error: expect.any(String),
      code: 'NOT_FOUND',
    });
  });
});
