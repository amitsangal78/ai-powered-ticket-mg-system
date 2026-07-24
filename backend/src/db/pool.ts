import pg from 'pg';
import type { Env } from '../config/env.js';
import { AppError } from '../middleware/errors.js';

const { Pool, DatabaseError } = pg;

let pool: pg.Pool | undefined;

export function createPool(env: Env): pg.Pool {
  if (pool) {
    return pool;
  }

  const next = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    // Cap long-running statements (database-standards.mdc)
    options: '-c statement_timeout=30s',
    ...(env.NODE_ENV === 'production'
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
  });

  next.on('error', (err: Error) => {
    // Never log DATABASE_URL / connection string
    console.error('Unexpected PostgreSQL pool error', err.message);
  });

  pool = next;
  return next;
}

export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('Database pool has not been initialized');
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

/** Prefer 503 when the pool cannot hand out a client. */
export function mapPoolAcquireError(err: unknown): AppError {
  const message = err instanceof Error ? err.message : 'Database unavailable';
  const exhausted =
    /timeout|too many clients|remaining connection slots/i.test(message);

  if (exhausted) {
    return new AppError(
      503,
      'SERVICE_UNAVAILABLE',
      'Database connection pool exhausted',
    );
  }

  return new AppError(503, 'SERVICE_UNAVAILABLE', 'Database unavailable');
}

export function isPgDatabaseError(err: unknown): err is pg.DatabaseError {
  return err instanceof DatabaseError;
}
