import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import type { Env } from '../config/env.js';
import { signAccessToken } from '../middleware/auth.js';
import type { Comment, Ticket } from '../schemas/domain.js';
import { AppError } from '../middleware/errors.js';

vi.mock('../services/ticketService.js', () => ({
  createTicketForUser: vi.fn(),
  listTicketsForUser: vi.fn(),
  getTicketDetail: vi.fn(),
  updateTicketForUser: vi.fn(),
  changeTicketStatus: vi.fn(),
  addCommentForUser: vi.fn(),
  listCommentsForUser: vi.fn(),
}));

import {
  addCommentForUser,
  changeTicketStatus,
  createTicketForUser,
  getTicketDetail,
  listCommentsForUser,
  listTicketsForUser,
  updateTicketForUser,
} from '../services/ticketService.js';

const testEnv: Env = {
  DATABASE_URL: 'postgresql://localhost:5432/tickets_test',
  JWT_SECRET: 'test-secret-must-be-at-least-32-chars',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  PORT: 3000,
  NODE_ENV: 'test',
};

const userId = '11111111-1111-4111-8111-111111111111';
const ticketId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const now = '2024-06-01T00:00:00.000Z';

function authHeader(): string {
  const token = signAccessToken(
    { sub: userId, email: 'agent@example.com', role: 'agent' },
    testEnv.JWT_SECRET,
  );
  return `Bearer ${token}`;
}

function sampleTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: ticketId,
    title: 'Cannot login',
    description: 'Users report login failures',
    priority: 'high',
    status: 'Open',
    assignedTo: null,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Tickets API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/tickets', () => {
    it('creates a ticket with status Open', async () => {
      const created = sampleTicket();
      vi.mocked(createTicketForUser).mockResolvedValue(created);

      const app = createApp(testEnv);
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', authHeader())
        .send({
          title: 'Cannot login',
          description: 'Users report login failures',
          priority: 'high',
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: ticketId,
        status: 'Open',
        title: 'Cannot login',
      });
      expect(createTicketForUser).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          title: 'Cannot login',
          priority: 'high',
        }),
      );
    });

    it('rejects HTML-like title with 400', async () => {
      const app = createApp(testEnv);
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', authHeader())
        .send({
          title: '<script>x</script>',
          description: 'ok description here',
          priority: 'low',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(createTicketForUser).not.toHaveBeenCalled();
    });

    it('requires authentication', async () => {
      const app = createApp(testEnv);
      const res = await request(app).post('/api/tickets').send({
        title: 'x',
        description: 'y',
        priority: 'low',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/tickets', () => {
    it('lists tickets and forwards search + status filters', async () => {
      vi.mocked(listTicketsForUser).mockResolvedValue([sampleTicket()]);

      const app = createApp(testEnv);
      const res = await request(app)
        .get('/api/tickets')
        .query({ search: 'login', status: 'Open' })
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(listTicketsForUser).toHaveBeenCalledWith({
        search: 'login',
        status: 'Open',
      });
    });

    it('rejects invalid status query with 400', async () => {
      const app = createApp(testEnv);
      const res = await request(app)
        .get('/api/tickets')
        .query({ status: 'Nope' })
        .set('Authorization', authHeader());

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/tickets/:id', () => {
    it('updates fields', async () => {
      const updated = sampleTicket({ title: 'Updated title' });
      vi.mocked(updateTicketForUser).mockResolvedValue(updated);

      const app = createApp(testEnv);
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .set('Authorization', authHeader())
        .send({ title: 'Updated title' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated title');
      expect(updateTicketForUser).toHaveBeenCalledWith(ticketId, {
        title: 'Updated title',
      });
    });

    it('returns 400 when body includes status', async () => {
      const app = createApp(testEnv);
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}`)
        .set('Authorization', authHeader())
        .send({ status: 'In Progress' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(updateTicketForUser).not.toHaveBeenCalled();
      expect(changeTicketStatus).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/tickets/:id/status', () => {
    it('applies a valid transition', async () => {
      const next = sampleTicket({ status: 'In Progress' });
      vi.mocked(changeTicketStatus).mockResolvedValue(next);

      const app = createApp(testEnv);
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}/status`)
        .set('Authorization', authHeader())
        .send({ status: 'In Progress' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('In Progress');
      expect(changeTicketStatus).toHaveBeenCalledWith(ticketId, 'In Progress');
    });

    it('returns 409 INVALID_TRANSITION from the status service', async () => {
      vi.mocked(changeTicketStatus).mockRejectedValue(
        new AppError(
          409,
          'INVALID_TRANSITION',
          "Cannot transition from 'Open' to 'Resolved'",
        ),
      );

      const app = createApp(testEnv);
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}/status`)
        .set('Authorization', authHeader())
        .send({ status: 'Resolved' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('INVALID_TRANSITION');
    });
  });

  describe('GET /api/tickets/:id + comments', () => {
    it('returns ticket detail with comments', async () => {
      const comment: Comment = {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        ticketId,
        message: 'Looking into it',
        createdBy: userId,
        createdAt: now,
      };
      vi.mocked(getTicketDetail).mockResolvedValue({
        ...sampleTicket(),
        comments: [comment],
      });

      const app = createApp(testEnv);
      const res = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body.comments).toHaveLength(1);
      expect(res.body.comments[0].message).toBe('Looking into it');
    });

    it('lists comments via GET /api/tickets/:id/comments', async () => {
      const comment: Comment = {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        ticketId,
        message: 'Looking into it',
        createdBy: userId,
        createdAt: now,
      };
      vi.mocked(listCommentsForUser).mockResolvedValue([comment]);

      const app = createApp(testEnv);
      const res = await request(app)
        .get(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toEqual([comment]);
    });

    it('creates a comment', async () => {
      const comment: Comment = {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        ticketId,
        message: 'Looking into it',
        createdBy: userId,
        createdAt: now,
      };
      vi.mocked(addCommentForUser).mockResolvedValue(comment);

      const app = createApp(testEnv);
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', authHeader())
        .send({ message: 'Looking into it' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Looking into it');
      expect(addCommentForUser).toHaveBeenCalledWith(
        ticketId,
        userId,
        'Looking into it',
      );
    });

    it('rejects empty / HTML comment messages with 400', async () => {
      const app = createApp(testEnv);

      const empty = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', authHeader())
        .send({ message: '' });
      expect(empty.status).toBe(400);
      expect(empty.body.code).toBe('VALIDATION_ERROR');

      const html = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', authHeader())
        .send({ message: 'Hello <b>world</b>' });
      expect(html.status).toBe(400);
      expect(html.body.code).toBe('VALIDATION_ERROR');
      expect(addCommentForUser).not.toHaveBeenCalled();
    });

    it('returns 404 when commenting on a missing ticket', async () => {
      vi.mocked(addCommentForUser).mockRejectedValue(
        new AppError(404, 'NOT_FOUND', 'Ticket not found'),
      );

      const app = createApp(testEnv);
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', authHeader())
        .send({ message: 'Still here' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });
});
