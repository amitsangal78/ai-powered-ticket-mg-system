import bcrypt from 'bcrypt';
import type { User } from '../schemas/domain.js';
import {
  findUserByEmailForAuth,
  findUserById,
  toUser,
} from '../repositories/userRepository.js';
import { AppError } from '../middleware/errors.js';
import { signAccessToken } from '../middleware/auth.js';

export type LoginResult = {
  token: string;
  user: User;
};

export async function loginWithPassword(
  email: string,
  password: string,
  jwtSecret: string,
): Promise<LoginResult> {
  const row = await findUserByEmailForAuth(email);
  if (!row) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }

  const matches = await bcrypt.compare(password, row.password_hash);
  if (!matches) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }

  const user = toUser(row);
  const token = signAccessToken(
    { sub: user.id, email: user.email, role: user.role },
    jwtSecret,
  );

  return { token, user };
}

export async function getCurrentUser(userId: string): Promise<User> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
  return user;
}
