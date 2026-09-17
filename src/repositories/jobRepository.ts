import prisma from '../lib/prisma';
import { CreateJobDto, UpdateJobDto } from '../types/job';

export class JobRepository {
  private employerSelect = {
    id: true,
    userId: true,
    companyName: true,
    companyWebsite: true,
    companyDescription: true,
    industry: true,
    location: true,
    logo: true,
    isVerified: true,
  };

  public async create(employerId: string, data: CreateJobDto) {
    return prisma.job.create({
      data: {
        employerId,
        title: data.title,
        description: data.description,
        requirements: data.requirements || [],
        responsibilities: data.responsibilities || [],
        skills: data.skills || [],
        location: data.location,
        isRemote: data.isRemote ?? false,
        jobType: data.jobType ?? 'FULL_TIME',
        experienceLevel: data.experienceLevel ?? 'MID',
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        currency: data.currency ?? 'USD',
        status: data.status ?? 'OPEN',
        deadline: data.deadline ? new Date(data.deadline) : null,
      },
      include: {
        employer: {
          select: this.employerSelect,
        },
      },
    });
  }

  public async findById(id: string) {
    return prisma.job.findUnique({
      where: { id },
      include: {
        employer: {
          select: this.employerSelect,
        },
      },
    });
  }

  public async findByEmployerId(employerId: string) {
    return prisma.job.findMany({
      where: { employerId },
      orderBy: { createdAt: 'desc' },
      include: {
        employer: {
          select: this.employerSelect,
        },
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  public async updateById(id: string, data: UpdateJobDto) {
    return prisma.job.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.requirements && { requirements: data.requirements }),
        ...(data.responsibilities && { responsibilities: data.responsibilities }),
        ...(data.skills && { skills: data.skills }),
        ...(data.location && { location: data.location }),
        ...(data.isRemote !== undefined && { isRemote: data.isRemote }),
        ...(data.jobType && { jobType: data.jobType }),
        ...(data.experienceLevel && { experienceLevel: data.experienceLevel }),
        ...(data.salaryMin !== undefined && { salaryMin: data.salaryMin }),
        ...(data.salaryMax !== undefined && { salaryMax: data.salaryMax }),
        ...(data.currency && { currency: data.currency }),
        ...(data.status && { status: data.status }),
        ...(data.deadline !== undefined && {
          deadline: data.deadline ? new Date(data.deadline) : null,
        }),
      },
      include: {
        employer: {
          select: this.employerSelect,
        },
      },
    });
  }

  public async deleteById(id: string) {
    return prisma.job.delete({
      where: { id },
    });
  }

  public async findByIdWithEmployer(id: string) {
    return prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        employerId: true,
      },
    });
  }
}

export const jobRepository = new JobRepository();
export default jobRepository;
