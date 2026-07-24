import type { Express } from 'express';
import { createApp } from '../../app.js';
import type { Env } from '../../config/env.js';
import { signAccessToken } from '../../middleware/auth.js';
import type { UserRole } from '../../schemas/domain.js';

export const TEST_JWT_SECRET =
  'test-secret-must-be-at-least-32-chars!!';

export function buildTestEnv(databaseUrl: string): Env {
  return {
    DATABASE_URL: databaseUrl,
    JWT_SECRET: TEST_JWT_SECRET,
    FRONTEND_ORIGIN: 'http://localhost:5173',
    PORT: 3000,
    NODE_ENV: 'test',
  };
}

export function createTestApp(databaseUrl: string): Express {
  return createApp(buildTestEnv(databaseUrl));
}

export function bearerFor(input: {
  id: string;
  email: string;
  role: UserRole;
}): string {
  const token = signAccessToken(
    { sub: input.id, email: input.email, role: input.role },
    TEST_JWT_SECRET,
  );
  return `Bearer ${token}`;
}
