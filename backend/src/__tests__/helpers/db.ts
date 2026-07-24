import bcrypt from 'bcrypt';
import pg from 'pg';
import { closePool, createPool, getPool } from '../../db/pool.js';
import { applyAllMigrations } from '../../db/migrate.js';
import { buildTestEnv } from './auth.js';

const { Client } = pg;

/** Prefer TEST_DATABASE_URL; fall back to local postgres credentials used in README/setup. */
export function resolveTestDatabaseUrl(): string {
  if (
    typeof process.env.TEST_DATABASE_URL === 'string' &&
    process.env.TEST_DATABASE_URL.length > 0
  ) {
    return process.env.TEST_DATABASE_URL;
  }
  return 'postgresql://postgres:welcome%40123@localhost:5432/tickets_test';
}

async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.replace(/^\//, '');
  if (!dbName) {
    throw new Error('TEST_DATABASE_URL must include a database name');
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName)) {
    throw new Error(`Unsafe database name: ${dbName}`);
  }

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const found = await client.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM pg_database WHERE datname = $1
       ) AS exists`,
      [dbName],
    );
    if (!found.rows[0]?.exists) {
      await client.query(`CREATE DATABASE ${dbName}`);
    }
  } finally {
    await client.end();
  }
}

export type SeededUsers = {
  adminId: string;
  agentId: string;
  adminEmail: string;
  agentEmail: string;
};

/**
 * Creates pool, migrates, and upserts admin/agent seed users.
 * Call once per integration suite (`beforeAll`).
 */
export async function setupIntegrationDatabase(): Promise<{
  databaseUrl: string;
  users: SeededUsers;
}> {
  const databaseUrl = resolveTestDatabaseUrl();
  await ensureDatabaseExists(databaseUrl);
  await closePool();
  createPool(buildTestEnv(databaseUrl));
  await applyAllMigrations();

  const users = await upsertSeedUsers();
  return { databaseUrl, users };
}

async function upsertSeedUsers(): Promise<SeededUsers> {
  const pool = getPool();
  const adminHash = await bcrypt.hash('Admin123!', 4);
  const agentHash = await bcrypt.hash('Agent123!', 4);

  async function ensureUser(input: {
    name: string;
    email: string;
    role: 'admin' | 'agent';
    passwordHash: string;
  }): Promise<string> {
    const existing = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [input.email],
    );
    const existingId = existing.rows[0]?.id;
    if (existingId) {
      await pool.query(
        `UPDATE users SET name = $1, role = $2, password_hash = $3, updated_at = NOW()
         WHERE id = $4`,
        [input.name, input.role, input.passwordHash, existingId],
      );
      return existingId;
    }
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, role, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [input.name, input.email, input.role, input.passwordHash],
    );
    const id = inserted.rows[0]?.id;
    if (!id) throw new Error(`Failed to insert user ${input.email}`);
    return id;
  }

  const adminId = await ensureUser({
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    passwordHash: adminHash,
  });
  const agentId = await ensureUser({
    name: 'Agent User',
    email: 'agent@example.com',
    role: 'agent',
    passwordHash: agentHash,
  });

  return {
    adminId,
    agentId,
    adminEmail: 'admin@example.com',
    agentEmail: 'agent@example.com',
  };
}

/** Wipe tickets/comments between tests; keep seed users. */
export async function resetTicketData(): Promise<void> {
  const pool = getPool();
  await pool.query('TRUNCATE TABLE comments, tickets RESTART IDENTITY CASCADE');
  await pool.query(
    `DELETE FROM users
     WHERE LOWER(email) NOT IN ('admin@example.com', 'agent@example.com')`,
  );
}

export async function teardownIntegrationDatabase(): Promise<void> {
  await closePool();
}

export async function readTicketStatus(id: string): Promise<string | null> {
  const result = await getPool().query<{ status: string }>(
    'SELECT status FROM tickets WHERE id = $1',
    [id],
  );
  return result.rows[0]?.status ?? null;
}
