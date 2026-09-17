import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { config } from '../config';
import { ConflictError, UnauthorizedError, NotFoundError } from '../middleware/errorHandler';
import { JwtTokenPayload, UserRole } from '../types/auth';

export interface RegisterCandidateDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  headline?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  experienceYears?: number;
  education?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
}

export interface RegisterEmployerDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  companyName: string;
  companyDescription?: string;
  companyWebsite?: string;
  industry?: string;
  companySize?: string;
  location?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  avatar?: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  candidate?: {
    id: string;
    headline: string | null;
    bio: string | null;
    location: string | null;
    skills: string[];
    experienceYears: number | null;
  } | null;
  employer?: {
    id: string;
    companyName: string;
    companyDescription: string | null;
    companyWebsite: string | null;
    industry: string | null;
    companySize: string | null;
    location: string | null;
    isVerified: boolean;
  } | null;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
}

export class AuthService {
  private generateToken(userId: string, email: string, role: UserRole): string {
    const payload: JwtTokenPayload = {
      userId,
      email,
      role,
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpire as jwt.SignOptions['expiresIn'],
    });
  }

  private sanitizeUser(user: any): SafeUser {
    const safeUser = { ...user };
    delete safeUser.password;
    return safeUser as SafeUser;
  }

  public async registerCandidate(data: RegisterCandidateDto): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('An account with this email address already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: 'CANDIDATE',
        phone: data.phone,
        candidate: {
          create: {
            headline: data.headline,
            bio: data.bio,
            location: data.location,
            skills: data.skills || [],
            experienceYears: data.experienceYears,
            education: data.education,
            githubUrl: data.githubUrl,
            linkedinUrl: data.linkedinUrl,
            portfolioUrl: data.portfolioUrl,
          },
        },
      },
      include: {
        candidate: true,
      },
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  public async registerEmployer(data: RegisterEmployerDto): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('An account with this email address already exists');
    }

    const existingCompany = await prisma.employer.findUnique({
      where: { companyName: data.companyName },
    });

    if (existingCompany) {
      throw new ConflictError('A company with this name is already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: 'EMPLOYER',
        phone: data.phone,
        employer: {
          create: {
            companyName: data.companyName,
            companyDescription: data.companyDescription,
            companyWebsite: data.companyWebsite,
            industry: data.industry,
            companySize: data.companySize,
            location: data.location,
          },
        },
      },
      include: {
        employer: true,
      },
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  public async login(data: LoginDto): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        candidate: true,
        employer: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('This account has been deactivated. Please contact support.');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  public async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        candidate: true,
        employer: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return this.sanitizeUser(user);
  }
}

export const authService = new AuthService();
