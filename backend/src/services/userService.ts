import bcrypt from 'bcrypt';
import type { User } from '../schemas/domain.js';
import { AppError } from '../middleware/errors.js';
import type {
  CreateUserRequest,
  UpdateUserRequest,
} from '../schemas/requests.js';
import {
  createUser,
  deleteUser,
  findUserById,
  listUsers,
  updateUser,
} from '../repositories/userRepository.js';

const BCRYPT_COST = 12;

export async function listUsersForAssigneePicker(): Promise<User[]> {
  return listUsers();
}

export async function getUserById(id: string): Promise<User> {
  const user = await findUserById(id);
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }
  return user;
}

export async function createUserAsAdmin(
  input: CreateUserRequest,
): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  return createUser({
    name: input.name,
    email: input.email,
    role: input.role,
    passwordHash,
  });
}

export async function updateUserAsAdmin(
  id: string,
  input: UpdateUserRequest,
): Promise<User> {
  const existing = await findUserById(id);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  const passwordHash =
    input.password !== undefined
      ? await bcrypt.hash(input.password, BCRYPT_COST)
      : undefined;

  const updated = await updateUser(id, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.role !== undefined ? { role: input.role } : {}),
    ...(passwordHash !== undefined ? { passwordHash } : {}),
  });

  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }
  return updated;
}

export async function deleteUserAsAdmin(id: string): Promise<void> {
  const existing = await findUserById(id);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  const deleted = await deleteUser(id);
  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }
}
