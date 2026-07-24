import bcrypt from 'bcrypt';
import { loadEnv } from '../config/env.js';
import { loadDotEnvFile } from '../config/loadDotEnv.js';
import { closePool, createPool, getPool } from './pool.js';

const BCRYPT_COST = 12;

type SeedUser = {
  name: string;
  email: string;
  role: 'admin' | 'agent';
  password: string;
};

const SEED_USERS: readonly SeedUser[] = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    password: 'Admin123!',
  },
  {
    name: 'Agent User',
    email: 'agent@example.com',
    role: 'agent',
    password: 'Agent123!',
  },
];

async function upsertSeedUser(user: SeedUser): Promise<'inserted' | 'skipped'> {
  const pool = getPool();

  const existing = await pool.query<{ id: string }>(
    `SELECT id
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [user.email],
  );

  if (existing.rowCount !== null && existing.rowCount > 0) {
    return 'skipped';
  }

  const passwordHash = await bcrypt.hash(user.password, BCRYPT_COST);

  await pool.query(
    `INSERT INTO users (name, email, role, password_hash)
     VALUES ($1, $2, $3, $4)`,
    [user.name, user.email, user.role, passwordHash],
  );

  return 'inserted';
}

export async function runSeed(): Promise<void> {
  loadDotEnvFile();
  const env = loadEnv();
  createPool(env);

  try {
    for (const user of SEED_USERS) {
      const result = await upsertSeedUser(user);
      console.info(
        result === 'inserted'
          ? `Seeded user: ${user.email}`
          : `Seed user already present: ${user.email}`,
      );
    }
    console.info('Seed complete.');
  } finally {
    await closePool();
  }
}

void runSeed().catch((err: unknown) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
