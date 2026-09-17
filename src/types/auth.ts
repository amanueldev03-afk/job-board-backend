export type UserRole = 'CANDIDATE' | 'EMPLOYER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  candidateId?: string;
  employerId?: string;
}

export interface JwtTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
