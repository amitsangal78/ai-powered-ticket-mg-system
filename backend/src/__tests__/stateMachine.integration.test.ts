import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { VALID_STATUSES, TRANSITIONS, type TicketStatus } from '../schemas/domain.js';
import { bearerFor, createTestApp } from './helpers/auth.js';
import {
  readTicketStatus,
  resetTicketData,
  setupIntegrationDatabase,
  teardownIntegrationDatabase,
  type SeededUsers,
} from './helpers/db.js';

/**
 * Wave 6.2 — Core state-machine integration (real DB, real TicketStatusService).
 * Spec §9.1 / §9.4 / FR-09 — do not mock TicketStatusService.
 */
describe('State machine integration (real DB)', () => {
  let databaseUrl = '';
  let users: SeededUsers;
  let agentAuth = '';

  beforeAll(async () => {
    const setup = await setupIntegrationDatabase();
    databaseUrl = setup.databaseUrl;
    users = setup.users;
    agentAuth = bearerFor({
      id: users.agentId,
      email: users.agentEmail,
      role: 'agent',
    });
  }, 60_000);

  afterAll(async () => {
    await teardownIntegrationDatabase();
  });

  beforeEach(async () => {
    await resetTicketData();
  });

  async function createOpenTicket(title = 'Integration ticket'): Promise<string> {
    const app = createTestApp(databaseUrl);
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', agentAuth)
      .send({
        title,
        description: 'Created for state-machine integration coverage',
        priority: 'medium',
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Open');
    return res.body.id as string;
  }

  async function patchStatus(id: string, status: TicketStatus) {
    const app = createTestApp(databaseUrl);
    return request(app)
      .patch(`/api/tickets/${id}/status`)
      .set('Authorization', agentAuth)
      .send({ status });
  }

  it('create yields status Open (P1 / §9.4)', async () => {
    const id = await createOpenTicket('Create open invariant');
    expect(await readTicketStatus(id)).toBe('Open');
  });

  it('walks Open → In Progress → Resolved → Closed and persists each step', async () => {
    const id = await createOpenTicket('Happy path chain');

    let res = await patchStatus(id, 'In Progress');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('In Progress');
    expect(await readTicketStatus(id)).toBe('In Progress');

    res = await patchStatus(id, 'Resolved');
    expect(res.status).toBe(200);
    expect(await readTicketStatus(id)).toBe('Resolved');

    res = await patchStatus(id, 'Closed');
    expect(res.status).toBe(200);
    expect(await readTicketStatus(id)).toBe('Closed');
  });

  it('allows Open → Cancelled and In Progress → Cancelled', async () => {
    const openId = await createOpenTicket('Cancel from open');
    let res = await patchStatus(openId, 'Cancelled');
    expect(res.status).toBe(200);
    expect(await readTicketStatus(openId)).toBe('Cancelled');

    const midId = await createOpenTicket('Cancel from in progress');
    res = await patchStatus(midId, 'In Progress');
    expect(res.status).toBe(200);
    res = await patchStatus(midId, 'Cancelled');
    expect(res.status).toBe(200);
    expect(await readTicketStatus(midId)).toBe('Cancelled');
  });

  it('rejects illegal transitions with 409 and leaves DB status unchanged (P3)', async () => {
    const id = await createOpenTicket('Illegal Open→Resolved');
    const before = await readTicketStatus(id);
    const res = await patchStatus(id, 'Resolved');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_TRANSITION');
    expect(await readTicketStatus(id)).toBe(before);
  });

  it('rejects all transitions from Closed and Cancelled with 409', async () => {
    for (const terminal of ['Closed', 'Cancelled'] as const) {
      const id = await createOpenTicket(`Terminal ${terminal}`);
      if (terminal === 'Closed') {
        await patchStatus(id, 'In Progress');
        await patchStatus(id, 'Resolved');
        await patchStatus(id, 'Closed');
      } else {
        await patchStatus(id, 'Cancelled');
      }
      expect(await readTicketStatus(id)).toBe(terminal);

      for (const to of VALID_STATUSES) {
        const res = await patchStatus(id, to);
        expect(res.status).toBe(409);
        expect(res.body.code).toBe('INVALID_TRANSITION');
        expect(await readTicketStatus(id)).toBe(terminal);
      }
    }
  });

  it('PATCH /api/tickets/:id with status field returns 400 and does not change status (P4)', async () => {
    const id = await createOpenTicket('PATCH isolation');
    const app = createTestApp(databaseUrl);
    const res = await request(app)
      .patch(`/api/tickets/${id}`)
      .set('Authorization', agentAuth)
      .send({ status: 'In Progress' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(await readTicketStatus(id)).toBe('Open');
  });

  it('table-driven: allows only ✓ edges from TRANSITIONS (P2)', async () => {
    for (const from of VALID_STATUSES) {
      for (const to of VALID_STATUSES) {
        const allowed = (TRANSITIONS[from] as readonly TicketStatus[]).includes(
          to,
        );
        const id = await createOpenTicket(`Matrix ${from} to ${to}`);

        // Drive ticket to `from`
        if (from === 'In Progress') {
          await patchStatus(id, 'In Progress');
        } else if (from === 'Resolved') {
          await patchStatus(id, 'In Progress');
          await patchStatus(id, 'Resolved');
        } else if (from === 'Closed') {
          await patchStatus(id, 'In Progress');
          await patchStatus(id, 'Resolved');
          await patchStatus(id, 'Closed');
        } else if (from === 'Cancelled') {
          await patchStatus(id, 'Cancelled');
        }

        const before = await readTicketStatus(id);
        expect(before).toBe(from);

        const res = await patchStatus(id, to);
        if (allowed) {
          expect(res.status).toBe(200);
          expect(await readTicketStatus(id)).toBe(to);
        } else {
          expect(res.status).toBe(409);
          expect(await readTicketStatus(id)).toBe(from);
        }
      }
    }
  });

  it('sequential conflicting transitions: second illegal call loses; first wins (FOR UPDATE)', async () => {
    const id = await createOpenTicket('Concurrent-ish sequence');
    const first = await patchStatus(id, 'In Progress');
    expect(first.status).toBe(200);

    const second = await patchStatus(id, 'Resolved'); // valid from In Progress
    expect(second.status).toBe(200);
    expect(await readTicketStatus(id)).toBe('Resolved');

    const illegal = await patchStatus(id, 'Open');
    expect(illegal.status).toBe(409);
    expect(await readTicketStatus(id)).toBe('Resolved');
  });
});
