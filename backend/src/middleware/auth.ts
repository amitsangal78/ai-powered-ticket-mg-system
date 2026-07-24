import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../schemas/domain.js';
import type { AuthUser } from '../types/auth.js';
import { AppError } from './errors.js';

type JwtClaims = {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
};

const JWT_EXPIRES_IN = '24h' as const;

export function signAccessToken(
  payload: Pick<AuthUser, 'sub' | 'email' | 'role'>,
  jwtSecret: string,
): string {
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    },
    jwtSecret,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function authenticateToken(
  jwtSecret: string,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const token = header.slice('Bearer '.length).trim();
      if (token.length === 0) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const decoded = jwt.verify(token, jwtSecret);
      if (typeof decoded === 'string') {
        throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
      }

      const claims = decoded as JwtClaims;
      if (
        typeof claims.sub !== 'string' ||
        typeof claims.email !== 'string' ||
        (claims.role !== 'agent' && claims.role !== 'admin')
      ) {
        throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
      }

      req.user = {
        sub: claims.sub,
        email: claims.email,
        role: claims.role,
      };
      next();
    } catch (err) {
      if (err instanceof AppError) {
        next(err);
        return;
      }
      next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
    }
  };
}

export function requireRole(
  role: UserRole,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }
    if (req.user.role !== role) {
      next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
      return;
    }
    next();
  };
}
