import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';
import { loadEnv } from '../config/env.js';
import { loadDotEnvFile } from '../config/loadDotEnv.js';
import { closePool, createPool, getPool } from './pool.js';

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../migrations',
);

const MIGRATION_FILES = [
  '001_enable_pgcrypto.sql',
  '002_create_users.sql',
  '003_create_tickets.sql',
  '004_create_comments.sql',
  '005_create_indexes.sql',
] as const;

async function ensureMigrationsTable(client: pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function isApplied(
  client: pg.PoolClient,
  id: string,
): Promise<boolean> {
  const result = await client.query<{ id: string }>(
    'SELECT id FROM schema_migrations WHERE id = $1',
    [id],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

async function applyMigration(
  client: pg.PoolClient,
  fileName: string,
): Promise<void> {
  const sqlPath = path.join(MIGRATIONS_DIR, fileName);
  const sql = await fs.readFile(sqlPath, 'utf8');

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [
      fileName,
    ]);
    await client.query('COMMIT');
    console.info(`Applied migration: ${fileName}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

export async function runMigrations(): Promise<void> {
  loadDotEnvFile();
  const env = loadEnv();
  createPool(env);
  const pool = getPool();
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);

    for (const fileName of MIGRATION_FILES) {
      if (await isApplied(client, fileName)) {
        console.info(`Skipping already-applied migration: ${fileName}`);
        continue;
      }
      await applyMigration(client, fileName);
    }

    console.info('Migrations complete.');
  } finally {
    client.release();
    await closePool();
  }
}

void runMigrations().catch((err: unknown) => {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
