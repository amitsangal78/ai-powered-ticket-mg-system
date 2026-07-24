import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../migrations',
);

const EXPECTED = [
  '001_enable_pgcrypto.sql',
  '002_create_users.sql',
  '003_create_tickets.sql',
  '004_create_comments.sql',
  '005_create_indexes.sql',
] as const;

describe('migrations', () => {
  it('includes ordered migration files with required schema pieces', () => {
    for (const file of EXPECTED) {
      const full = path.join(migrationsDir, file);
      expect(fs.existsSync(full), `${file} missing`).toBe(true);
      const sql = fs.readFileSync(full, 'utf8');
      expect(sql.trim().length).toBeGreaterThan(0);
    }

    const users = fs.readFileSync(
      path.join(migrationsDir, '002_create_users.sql'),
      'utf8',
    );
    expect(users).toContain('CREATE TABLE users');
    expect(users).toContain('password_hash');
    expect(users).toContain("CHECK (role IN ('agent', 'admin'))");

    const tickets = fs.readFileSync(
      path.join(migrationsDir, '003_create_tickets.sql'),
      'utf8',
    );
    expect(tickets).toContain('ON DELETE SET NULL');
    expect(tickets).toContain('ON DELETE RESTRICT');
    expect(tickets).toContain("DEFAULT 'Open'");

    const comments = fs.readFileSync(
      path.join(migrationsDir, '004_create_comments.sql'),
      'utf8',
    );
    expect(comments).toContain('ON DELETE CASCADE');

    const indexes = fs.readFileSync(
      path.join(migrationsDir, '005_create_indexes.sql'),
      'utf8',
    );
    expect(indexes).toContain('pg_trgm');
    expect(indexes).toContain('idx_users_email_lower');
    expect(indexes).toContain('gin_trgm_ops');
  });
});
