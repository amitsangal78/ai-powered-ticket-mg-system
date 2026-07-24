import type { QueryResult, QueryResultRow } from 'pg';
import { AppError } from '../middleware/errors.js';
import { getPool, isPgDatabaseError, mapPoolAcquireError } from '../db/pool.js';

export type TxQueryClient = {
  query: <R extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[],
  ) => Promise<QueryResult<R>>;
};

/**
 * Parameterized query helper — always pass values as `$1…` binds.
 * Never interpolate user input into the SQL string.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  try {
    return await getPool().query<T>(text, [...params]);
  } catch (err) {
    if (isPgDatabaseError(err)) {
      throw mapPgError(err);
    }
    throw mapPoolAcquireError(err);
  }
}

export async function withTransaction<T>(
  fn: (client: TxQueryClient) => Promise<T>,
): Promise<T> {
  let client;
  try {
    client = await getPool().connect();
  } catch (err) {
    throw mapPoolAcquireError(err);
  }

  try {
    await client.query('BEGIN');
    const result = await fn({
      query: <R extends QueryResultRow = QueryResultRow>(
        text: string,
        params: readonly unknown[] = [],
      ) => client.query<R>(text, [...params]),
    });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    if (isPgDatabaseError(err)) {
      throw mapPgError(err);
    }
    if (err instanceof AppError) {
      throw err;
    }
    throw err;
  } finally {
    client.release();
  }
}

export function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(value).toISOString();
}

/** Map PostgreSQL errors to HTTP AppError (database-standards.mdc). */
export function mapPgError(err: unknown): AppError {
  const code =
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
      ? (err as { code: string }).code
      : undefined;

  switch (code) {
    case '23505':
      return new AppError(409, 'CONFLICT', 'Resource already exists');
    case '23503':
      return new AppError(409, 'CONFLICT', 'Related resource not found');
    case '23502':
      return new AppError(400, 'VALIDATION_ERROR', 'Required field missing');
    case '23514':
      return new AppError(400, 'VALIDATION_ERROR', 'Check constraint violated');
    default:
      return new AppError(500, 'INTERNAL_ERROR', 'Database error');
  }
}
