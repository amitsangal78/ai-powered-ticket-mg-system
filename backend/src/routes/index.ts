import { Router, type IRouter } from 'express';
import type { Env } from '../config/env.js';
import { healthRouter } from './health.js';
import { createAuthRouter } from './auth.js';
import { createUsersRouter } from './users.js';
import { createTicketsRouter } from './tickets.js';

export function createApiRouter(env: Env): IRouter {
  const apiRouter = Router();

  apiRouter.use(healthRouter);
  apiRouter.use('/auth', createAuthRouter(env));
  apiRouter.use('/users', createUsersRouter(env));
  apiRouter.use('/tickets', createTicketsRouter(env));

  return apiRouter;
}
