import { AuthUser } from '../types/auth';
import { CreateEmployerDto, UpdateEmployerDto, EmployerFilterQuery } from '../types/employer';
import { employerRepository, EmployerRepository } from '../repositories/employerRepository';
import { authorizationService, AuthorizationService } from './authorizationService';
import { ConflictError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';

export class EmployerService {
  constructor(
    private readonly repo: EmployerRepository = employerRepository,
    private readonly authzService: AuthorizationService = authorizationService
  ) {}

  /**
   * Retrieve the currently logged in employer's profile.
   */
  public async getOwnProfile(currentUser: AuthUser) {
    if (currentUser.role !== 'EMPLOYER' && currentUser.role !== 'ADMIN') {
      throw new ForbiddenError('Only employers can access employer profiles');
    }

    const employer = await this.repo.findByUserId(currentUser.id);
    if (!employer) {
      throw new NotFoundError('Employer profile not found for this account');
    }

    return employer;
  }

  /**
   * Retrieve public employer profile by ID.
   */
  public async getEmployerById(id: string) {
    const employer = await this.repo.findById(id);
    if (!employer) {
      throw new NotFoundError('Employer not found');
    }

    return employer;
  }

  /**
   * Create or update the logged in employer's profile.
   */
  public async updateOwnProfile(currentUser: AuthUser, data: UpdateEmployerDto) {
    if (currentUser.role !== 'EMPLOYER' && currentUser.role !== 'ADMIN') {
      throw new ForbiddenError('Only employers can update employer profiles');
    }

    const existingEmployer = await this.repo.findByUserId(currentUser.id);

    // If companyName is updated, check for uniqueness
    if (data.companyName) {
      const companyWithSameName = await this.repo.findByCompanyName(data.companyName);
      if (companyWithSameName && companyWithSameName.userId !== currentUser.id) {
        throw new ConflictError('A company with this name already exists');
      }
    }

    if (existingEmployer) {
      return this.repo.updateByUserId(currentUser.id, data);
    } else {
      if (!data.companyName) {
        throw new ConflictError('Company name is required to create employer profile');
      }
      return this.repo.create(currentUser.id, data as CreateEmployerDto);
    }
  }

  /**
   * Update employer profile by Employer ID with object-level authorization.
   */
  public async updateEmployerById(
    employerId: string,
    currentUser: AuthUser,
    data: UpdateEmployerDto
  ) {
    // 1. Verify object-level ownership
    await this.authzService.ensureEmployerOwnership(employerId, currentUser);

    // 2. Check company name uniqueness if changing
    if (data.companyName) {
      const companyWithSameName = await this.repo.findByCompanyName(data.companyName);
      if (companyWithSameName && companyWithSameName.id !== employerId) {
        throw new ConflictError('A company with this name already exists');
      }
    }

    return this.repo.updateById(employerId, data);
  }

  /**
   * List employers with optional search, industry and location filtering.
   */
  public async listEmployers(query: EmployerFilterQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const [employers, total] = await Promise.all([
      this.repo.findAll({
        skip,
        take: limit,
        search: query.search,
        industry: query.industry,
        location: query.location,
      }),
      this.repo.count({
        search: query.search,
        industry: query.industry,
        location: query.location,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      employers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}

export const employerService = new EmployerService();
export default employerService;
