import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { bearerFor, createTestApp } from './helpers/auth.js';
import {
  resetTicketData,
  setupIntegrationDatabase,
  teardownIntegrationDatabase,
  type SeededUsers,
} from './helpers/db.js';

/**
 * Wave 6.3 — Broader API integration against real DB.
 */
describe('API integration (real DB)', () => {
  let databaseUrl = '';
  let users: SeededUsers;
  let agentAuth = '';
  let adminAuth = '';

  beforeAll(async () => {
    const setup = await setupIntegrationDatabase();
    databaseUrl = setup.databaseUrl;
    users = setup.users;
    agentAuth = bearerFor({
      id: users.agentId,
      email: users.agentEmail,
      role: 'agent',
    });
    adminAuth = bearerFor({
      id: users.adminId,
      email: users.adminEmail,
      role: 'admin',
    });
  }, 60_000);

  afterAll(async () => {
    await teardownIntegrationDatabase();
  });

  beforeEach(async () => {
    await resetTicketData();
  });

  it('validation: empty title, oversized, and HTML markers → 400', async () => {
    const app = createTestApp(databaseUrl);

    const empty = await request(app)
      .post('/api/tickets')
      .set('Authorization', agentAuth)
      .send({ title: '', description: 'desc', priority: 'low' });
    expect(empty.status).toBe(400);
    expect(empty.body.code).toBe('VALIDATION_ERROR');

    const oversized = await request(app)
      .post('/api/tickets')
      .set('Authorization', agentAuth)
      .send({
        title: 'x'.repeat(201),
        description: 'ok',
        priority: 'low',
      });
    expect(oversized.status).toBe(400);

    const html = await request(app)
      .post('/api/tickets')
      .set('Authorization', agentAuth)
      .send({
        title: 'Bad <title>',
        description: 'ok description',
        priority: 'low',
      });
    expect(html.status).toBe(400);
  });

  it('search ∩ status equals intersection of separate queries (P property)', async () => {
    const app = createTestApp(databaseUrl);

    await request(app)
      .post('/api/tickets')
      .set('Authorization', agentAuth)
      .send({
        title: 'VPN timeout alpha',
        description: 'network',
        priority: 'high',
      });
    await request(app)
      .post('/api/tickets')
      .set('Authorization', agentAuth)
      .send({
        title: 'Printer offline',
        description: 'hardware',
        priority: 'low',
      });

    const vpnOpen = await request(app)
      .post('/api/tickets')
      .set('Authorization', agentAuth)
      .send({
        title: 'VPN timeout beta',
        description: 'network',
        priority: 'medium',
      });
    await request(app)
      .patch(`/api/tickets/${vpnOpen.body.id}/status`)
      .set('Authorization', agentAuth)
      .send({ status: 'In Progress' });

    const bySearch = await request(app)
      .get('/api/tickets')
      .query({ search: 'VPN' })
      .set('Authorization', agentAuth);
    const byStatus = await request(app)
      .get('/api/tickets')
      .query({ status: 'Open' })
      .set('Authorization', agentAuth);
    const combined = await request(app)
      .get('/api/tickets')
      .query({ search: 'VPN', status: 'Open' })
      .set('Authorization', agentAuth);

    expect(bySearch.status).toBe(200);
    expect(byStatus.status).toBe(200);
    expect(combined.status).toBe(200);

    const searchIds = new Set(
      (bySearch.body as { id: string }[]).map((t) => t.id),
    );
    const statusIds = new Set(
      (byStatus.body as { id: string }[]).map((t) => t.id),
    );
    const expected = [...searchIds].filter((id) => statusIds.has(id)).sort();
    const actual = (combined.body as { id: string }[])
      .map((t) => t.id)
      .sort();
    expect(actual).toEqual(expected);
  });

  it('comments create and appear on ticket detail', async () => {
    const app = createTestApp(databaseUrl);
    const created = await request(app)
      .post('/api/tickets')
      .set('Authorization', agentAuth)
      .send({
        title: 'Comment me',
        description: 'Need comments',
        priority: 'low',
      });
    const id = created.body.id as string;

    const comment = await request(app)
      .post(`/api/tickets/${id}/comments`)
      .set('Authorization', agentAuth)
      .send({ message: 'First triage note' });
    expect(comment.status).toBe(201);
    expect(comment.body.message).toBe('First triage note');

    const detail = await request(app)
      .get(`/api/tickets/${id}`)
      .set('Authorization', agentAuth);
    expect(detail.status).toBe(200);
    expect(detail.body.comments).toHaveLength(1);
    expect(detail.body.comments[0].message).toBe('First triage note');
  });

  it('auth: no token → 401; bad login → 401; agent on admin write → 403', async () => {
    const app = createTestApp(databaseUrl);

    const noToken = await request(app).get('/api/tickets');
    expect(noToken.status).toBe(401);

    const badLogin = await request(app).post('/api/auth/login').send({
      email: 'agent@example.com',
      password: 'wrong-password',
    });
    expect(badLogin.status).toBe(401);

    const forbidden = await request(app)
      .post('/api/users')
      .set('Authorization', agentAuth)
      .send({
        name: 'Nope',
        email: 'nope@example.com',
        role: 'agent',
        password: 'SecurePass1',
      });
    expect(forbidden.status).toBe(403);
  });

  it('no password leakage on login / me / users (P5)', async () => {
    const app = createTestApp(databaseUrl);

    const login = await request(app).post('/api/auth/login').send({
      email: 'agent@example.com',
      password: 'Agent123!',
    });
    expect(login.status).toBe(200);
    expect(JSON.stringify(login.body)).not.toMatch(/password/i);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(JSON.stringify(me.body)).not.toMatch(/password/i);

    const usersList = await request(app)
      .get('/api/users')
      .set('Authorization', adminAuth);
    expect(usersList.status).toBe(200);
    expect(JSON.stringify(usersList.body)).not.toMatch(/password/i);
  });

  it('admin can create user; duplicate email → conflict path', async () => {
    const app = createTestApp(databaseUrl);
    const created = await request(app)
      .post('/api/users')
      .set('Authorization', adminAuth)
      .send({
        name: 'Extra Agent',
        email: 'extra.agent@example.com',
        role: 'agent',
        password: 'SecurePass1',
      });
    expect(created.status).toBe(201);
    expect(JSON.stringify(created.body)).not.toMatch(/password/i);

    const dup = await request(app)
      .post('/api/users')
      .set('Authorization', adminAuth)
      .send({
        name: 'Dup',
        email: 'extra.agent@example.com',
        role: 'agent',
        password: 'SecurePass1',
      });
    expect([409]).toContain(dup.status);
    expect(dup.body.code).toBe('CONFLICT');
  });
});
