import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Env } from './config/env.js';
import { createApiRouter } from './routes/index.js';
import { mountOpenApiDocs } from './openapi/setup.js';
import {
  globalErrorHandler,
  notFoundHandler,
} from './middleware/errorHandler.js';

export function createApp(env: Env): Express {
  const app = express();

  // Needed so express-rate-limit sees the real client IP behind a reverse proxy
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      // Allow Swagger UI inline assets while keeping a restrictive baseline CSP
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://validator.swagger.io'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(
    pinoHttp({
      level: env.NODE_ENV === 'test' ? 'silent' : 'info',
      redact: {
        paths: [
          'req.headers.authorization',
          'req.body.password',
          'res.headers["set-cookie"]',
        ],
        remove: true,
      },
    }),
  );

  mountOpenApiDocs(app);
  app.use('/api', createApiRouter(env));
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
