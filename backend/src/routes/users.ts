import { Router, type IRouter } from 'express';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import { asyncHandler, parseBody } from '../middleware/validate.js';
import {
  createUserRequestSchema,
  updateUserRequestSchema,
  type CreateUserRequest,
  type UpdateUserRequest,
} from '../schemas/requests.js';
import {
  createUserAsAdmin,
  deleteUserAsAdmin,
  getUserById,
  listUsersForAssigneePicker,
  updateUserAsAdmin,
} from '../services/userService.js';

const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

function parseUserId(params: unknown): string {
  const parsed = userIdParamSchema.safeParse(params);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid user id', {
      id: ['Must be a valid UUID'],
    });
  }
  return parsed.data.id;
}

export function createUsersRouter(env: Env): IRouter {
  const router = Router();
  const requireAuth = authenticateToken(env.JWT_SECRET);
  const requireAdmin = requireRole('admin');

  router.get(
    '/',
    requireAuth,
    asyncHandler(async (_req, res) => {
      const users = await listUsersForAssigneePicker();
      res.status(200).json(users);
    }),
  );

  router.get(
    '/:id',
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = parseUserId(req.params);
      const user = await getUserById(id);
      res.status(200).json(user);
    }),
  );

  router.post(
    '/',
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const body = parseBody<CreateUserRequest>(
        createUserRequestSchema,
        req.body,
      );
      const user = await createUserAsAdmin(body);
      res.status(201).json(user);
    }),
  );

  router.patch(
    '/:id',
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = parseUserId(req.params);
      const body = parseBody<UpdateUserRequest>(
        updateUserRequestSchema,
        req.body,
      );
      const user = await updateUserAsAdmin(id, body);
      res.status(200).json(user);
    }),
  );

  router.delete(
    '/:id',
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = parseUserId(req.params);
      await deleteUserAsAdmin(id);
      res.status(204).send();
    }),
  );

  return router;
}
