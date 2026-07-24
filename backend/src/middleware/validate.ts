import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { validationError } from '../middleware/errors.js';

export function parseBody<T>(schema: ZodTypeAny, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw validationError(parsed.error.flatten().fieldErrors);
  }
  return parsed.data as T;
}

export function parseQuery<T>(schema: ZodTypeAny, query: unknown): T {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw validationError(parsed.error.flatten().fieldErrors);
  }
  return parsed.data as T;
}

/** Wrap async route handlers so rejected promises reach the error middleware. */
export function asyncHandler(
  fn: (
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
  ) => Promise<void>,
): RequestHandler {
  return (req, res, next): void => {
    void fn(req, res).catch(next);
  };
}
