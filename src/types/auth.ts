export type UserRole = 'CANDIDATE' | 'COMPANY' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  companyId?: string;
}

export interface JwtTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
