import { Router, type IRouter } from 'express';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { authenticateToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import {
  asyncHandler,
  parseBody,
  parseQuery,
} from '../middleware/validate.js';
import {
  createCommentRequestSchema,
  createTicketRequestSchema,
  statusTransitionRequestSchema,
  ticketListQuerySchema,
  updateTicketRequestSchema,
  type CreateCommentRequest,
  type CreateTicketRequest,
  type StatusTransitionRequest,
  type TicketListQuery,
  type UpdateTicketRequest,
} from '../schemas/requests.js';
import {
  addCommentForUser,
  changeTicketStatus,
  createTicketForUser,
  getTicketDetail,
  listCommentsForUser,
  listTicketsForUser,
  updateTicketForUser,
} from '../services/ticketService.js';

const ticketIdParamSchema = z.object({
  id: z.string().uuid(),
});

function parseTicketId(params: unknown): string {
  const parsed = ticketIdParamSchema.safeParse(params);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid ticket id', {
      id: ['Must be a valid UUID'],
    });
  }
  return parsed.data.id;
}

export function createTicketsRouter(env: Env): IRouter {
  const router = Router();
  const requireAuth = authenticateToken(env.JWT_SECRET);

  router.use(requireAuth);

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const body = parseBody<CreateTicketRequest>(
        createTicketRequestSchema,
        req.body,
      );
      const ticket = await createTicketForUser(req.user!.sub, body);
      res.status(201).json(ticket);
    }),
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = parseQuery<TicketListQuery>(
        ticketListQuerySchema,
        req.query,
      );
      const tickets = await listTicketsForUser({
        ...(query.search !== undefined ? { search: query.search } : {}),
        ...(query.status !== undefined ? { status: query.status } : {}),
      });
      res.status(200).json(tickets);
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseTicketId(req.params);
      const detail = await getTicketDetail(id);
      res.status(200).json(detail);
    }),
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const id = parseTicketId(req.params);
      if (
        req.body !== null &&
        typeof req.body === 'object' &&
        'status' in req.body
      ) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'status cannot be updated via this endpoint; use PATCH /api/tickets/:id/status',
        );
      }
      const body = parseBody<UpdateTicketRequest>(
        updateTicketRequestSchema,
        req.body,
      );
      const ticket = await updateTicketForUser(id, body);
      res.status(200).json(ticket);
    }),
  );

  router.patch(
    '/:id/status',
    asyncHandler(async (req, res) => {
      const id = parseTicketId(req.params);
      const body = parseBody<StatusTransitionRequest>(
        statusTransitionRequestSchema,
        req.body,
      );
      const ticket = await changeTicketStatus(id, body.status);
      res.status(200).json(ticket);
    }),
  );

  router.get(
    '/:id/comments',
    asyncHandler(async (req, res) => {
      const id = parseTicketId(req.params);
      const comments = await listCommentsForUser(id);
      res.status(200).json(comments);
    }),
  );

  router.post(
    '/:id/comments',
    asyncHandler(async (req, res) => {
      const id = parseTicketId(req.params);
      const body = parseBody<CreateCommentRequest>(
        createCommentRequestSchema,
        req.body,
      );
      const comment = await addCommentForUser(id, req.user!.sub, body.message);
      res.status(201).json(comment);
    }),
  );

  return router;
}
