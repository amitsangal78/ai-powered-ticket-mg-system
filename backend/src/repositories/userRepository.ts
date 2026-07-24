import type { User } from '../schemas/domain.js';
import { query, toIsoString } from './base.js';

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: 'agent' | 'admin';
  created_at: Date;
  updated_at: Date;
};

export type UserAuthRow = UserRow & {
  password_hash: string;
};

const PUBLIC_USER_COLUMNS = `
  id, name, email, role, created_at, updated_at
` as const;

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

/** Public user by id — never selects password_hash. */
export async function findUserById(id: string): Promise<User | null> {
  const result = await query<UserRow>(
    `SELECT ${PUBLIC_USER_COLUMNS}
     FROM users
     WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  return row ? toUser(row) : null;
}

/** Login lookup — includes password_hash for bcrypt.compare only. */
export async function findUserByEmailForAuth(
  email: string,
): Promise<UserAuthRow | null> {
  const result = await query<UserAuthRow>(
    `SELECT id, name, email, role, password_hash, created_at, updated_at
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email],
  );
  return result.rows[0] ?? null;
}

/** Assignee picker — public columns only. */
export async function listUsers(): Promise<User[]> {
  const result = await query<UserRow>(
    `SELECT ${PUBLIC_USER_COLUMNS}
     FROM users
     ORDER BY name ASC`,
  );
  return result.rows.map(toUser);
}
