import type { User, UserRole } from '../schemas/domain.js';
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

export type CreateUserInput = {
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
};

export async function createUser(input: CreateUserInput): Promise<User> {
  const result = await query<UserRow>(
    `INSERT INTO users (name, email, role, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    [input.name, input.email, input.role, input.passwordHash],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to insert user');
  }
  return toUser(row);
}

export type UpdateUserFieldsInput = {
  name?: string;
  email?: string;
  role?: UserRole;
  passwordHash?: string;
};

export async function updateUser(
  id: string,
  fields: UpdateUserFieldsInput,
): Promise<User | null> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (fields.name !== undefined) {
    params.push(fields.name);
    sets.push(`name = $${params.length}`);
  }
  if (fields.email !== undefined) {
    params.push(fields.email);
    sets.push(`email = $${params.length}`);
  }
  if (fields.role !== undefined) {
    params.push(fields.role);
    sets.push(`role = $${params.length}`);
  }
  if (fields.passwordHash !== undefined) {
    params.push(fields.passwordHash);
    sets.push(`password_hash = $${params.length}`);
  }

  if (sets.length === 0) {
    return findUserById(id);
  }

  sets.push('updated_at = NOW()');
  params.push(id);

  const result = await query<UserRow>(
    `UPDATE users
     SET ${sets.join(', ')}
     WHERE id = $${params.length}
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    params,
  );
  const row = result.rows[0];
  return row ? toUser(row) : null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM users
     WHERE id = $1`,
    [id],
  );
  return result.rowCount !== null && result.rowCount > 0;
}
