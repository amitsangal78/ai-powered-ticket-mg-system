import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import type { Env } from '../config/env.js';
import { loadOpenApiDocument, resolveOpenApiPath } from '../openapi/setup.js';
import fs from 'node:fs';

const testEnv: Env = {
  DATABASE_URL: 'postgresql://localhost:5432/tickets_test',
  JWT_SECRET: 'test-secret-must-be-at-least-32-chars',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  PORT: 3000,
  NODE_ENV: 'test',
};

describe('OpenAPI / Swagger (FR-19)', () => {
  it('resolves and parses committed openapi.yaml', () => {
    const path = resolveOpenApiPath();
    expect(fs.existsSync(path)).toBe(true);
    const doc = loadOpenApiDocument();
    expect(doc.openapi).toBe('3.0.3');
    expect(doc.info).toMatchObject({ title: expect.any(String) });
    expect(doc.paths).toBeTypeOf('object');
    expect(doc.components).toBeTypeOf('object');
  });

  it('documents Core (+ implemented) endpoints and Bearer auth', () => {
    const doc = loadOpenApiDocument();
    const paths = doc.paths as Record<string, unknown>;
    const required = [
      '/api/health',
      '/api/auth/login',
      '/api/auth/me',
      '/api/tickets',
      '/api/tickets/{id}',
      '/api/tickets/{id}/status',
      '/api/tickets/{id}/comments',
      '/api/users',
      '/api/users/{id}',
    ];
    for (const p of required) {
      expect(paths[p], `missing path ${p}`).toBeDefined();
    }

    const components = doc.components as {
      securitySchemes?: { bearerAuth?: unknown };
      schemas?: { ApiError?: unknown; User?: unknown; Ticket?: unknown };
    };
    expect(components.securitySchemes?.bearerAuth).toBeDefined();
    expect(components.schemas?.ApiError).toBeDefined();
    expect(components.schemas?.User).toBeDefined();
    expect(components.schemas?.Ticket).toBeDefined();
  });

  it('serves YAML, JSON, and Swagger UI', async () => {
    const app = createApp(testEnv);

    const yaml = await request(app).get('/api/openapi.yaml');
    expect(yaml.status).toBe(200);
    expect(yaml.text).toContain('openapi: 3.0.3');
    expect(yaml.text).toContain('/api/tickets');

    const json = await request(app).get('/api/openapi.json');
    expect(json.status).toBe(200);
    expect(json.body.openapi).toBe('3.0.3');
    expect(json.body.paths['/api/auth/login']).toBeDefined();

    const docs = await request(app).get('/api/docs/');
    expect(docs.status).toBe(200);
    expect(docs.text).toMatch(/swagger/i);
  });
});
