import { Router, type IRouter } from 'express';
import rateLimit from 'express-rate-limit';
import type { Env } from '../config/env.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler, parseBody } from '../middleware/validate.js';
import { loginRequestSchema, type LoginRequest } from '../schemas/requests.js';
import { getCurrentUser, loginWithPassword } from '../services/authService.js';

export function createLoginRateLimiter(): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    // Count every attempt (success or failure)
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    handler: (_req, res): void => {
      res.status(429).json({
        error: 'Too many login attempts. Try again later.',
        code: 'RATE_LIMITED',
      });
    },
  });
}

export function createAuthRouter(env: Env): IRouter {
  const router = Router();
  const loginLimiter = createLoginRateLimiter();
  const requireAuth = authenticateToken(env.JWT_SECRET);

  router.post(
    '/login',
    loginLimiter,
    asyncHandler(async (req, res) => {
      const body = parseBody<LoginRequest>(loginRequestSchema, req.body);
      const result = await loginWithPassword(
        body.email,
        body.password,
        env.JWT_SECRET,
      );
      res.status(200).json(result);
    }),
  );

  router.get(
    '/me',
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await getCurrentUser(req.user!.sub);
      res.status(200).json(user);
    }),
  );

  return router;
}
