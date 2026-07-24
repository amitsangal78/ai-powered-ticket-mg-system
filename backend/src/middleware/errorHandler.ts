import type { NextFunction, Request, Response } from 'express';
import { AppError, type ApiErrorBody } from './errors.js';

export function notFoundHandler(_req: Request, res: Response): void {
  const body: ApiErrorBody = {
    error: 'Not found',
    code: 'NOT_FOUND',
  };
  res.status(404).json(body);
}

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  req.log?.error({ err }, 'Unhandled error');
  const body: ApiErrorBody = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  };
  res.status(500).json(body);
}
