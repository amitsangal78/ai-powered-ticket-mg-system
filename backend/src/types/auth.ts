import type { UserRole } from '../schemas/domain.js';

export type AuthUser = {
  sub: string;
  email: string;
  role: UserRole;
};
