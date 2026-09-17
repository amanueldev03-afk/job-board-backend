import prisma from '../lib/prisma';
import { CreateEmployerDto, UpdateEmployerDto } from '../types/employer';

export class EmployerRepository {
  private safeUserSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    avatar: true,
    phone: true,
    isVerified: true,
    createdAt: true,
  };

  public async findByUserId(userId: string) {
    return prisma.employer.findUnique({
      where: { userId },
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    });
  }

  public async findById(id: string) {
    return prisma.employer.findUnique({
      where: { id },
      include: {
        user: {
          select: this.safeUserSelect,
        },
        jobs: {
          where: { status: 'OPEN' },
          select: {
            id: true,
            title: true,
            location: true,
            jobType: true,
            experienceLevel: true,
            isRemote: true,
            createdAt: true,
          },
        },
      },
    });
  }

  public async findByCompanyName(companyName: string) {
    return prisma.employer.findUnique({
      where: { companyName },
    });
  }

  public async create(userId: string, data: CreateEmployerDto) {
    return prisma.employer.create({
      data: {
        userId,
        companyName: data.companyName,
        companyDescription: data.companyDescription,
        companyWebsite: data.companyWebsite,
        industry: data.industry,
        companySize: data.companySize,
        location: data.location,
        logo: data.logo,
      },
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    });
  }

  public async updateByUserId(userId: string, data: UpdateEmployerDto) {
    return prisma.employer.update({
      where: { userId },
      data: {
        ...(data.companyName && { companyName: data.companyName }),
        ...(data.companyDescription !== undefined && { companyDescription: data.companyDescription }),
        ...(data.companyWebsite !== undefined && { companyWebsite: data.companyWebsite }),
        ...(data.industry !== undefined && { industry: data.industry }),
        ...(data.companySize !== undefined && { companySize: data.companySize }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.logo !== undefined && { logo: data.logo }),
      },
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    });
  }

  public async updateById(id: string, data: UpdateEmployerDto) {
    return prisma.employer.update({
      where: { id },
      data: {
        ...(data.companyName && { companyName: data.companyName }),
        ...(data.companyDescription !== undefined && { companyDescription: data.companyDescription }),
        ...(data.companyWebsite !== undefined && { companyWebsite: data.companyWebsite }),
        ...(data.industry !== undefined && { industry: data.industry }),
        ...(data.companySize !== undefined && { companySize: data.companySize }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.logo !== undefined && { logo: data.logo }),
      },
      include: {
        user: {
          select: this.safeUserSelect,
        },
      },
    });
  }

  public async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    industry?: string;
    location?: string;
  }) {
    const where: any = {};

    if (params.search) {
      where.OR = [
        { companyName: { contains: params.search, mode: 'insensitive' } },
        { companyDescription: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.industry) {
      where.industry = { contains: params.industry, mode: 'insensitive' };
    }

    if (params.location) {
      where.location = { contains: params.location, mode: 'insensitive' };
    }

    return prisma.employer.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: this.safeUserSelect,
        },
        _count: {
          select: { jobs: true },
        },
      },
    });
  }

  public async count(params: { search?: string; industry?: string; location?: string }) {
    const where: any = {};

    if (params.search) {
      where.OR = [
        { companyName: { contains: params.search, mode: 'insensitive' } },
        { companyDescription: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.industry) {
      where.industry = { contains: params.industry, mode: 'insensitive' };
    }

    if (params.location) {
      where.location = { contains: params.location, mode: 'insensitive' };
    }

    return prisma.employer.count({ where });
  }
}

export const employerRepository = new EmployerRepository();
export default employerRepository;
