export type JobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'REMOTE';

export type ExperienceLevel = 'ENTRY' | 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD' | 'EXECUTIVE';

export type JobStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'EXPIRED';

export interface CreateJobDto {
  title: string;
  description: string;
  requirements?: string[];
  responsibilities?: string[];
  skills?: string[];
  location: string;
  isRemote?: boolean;
  jobType?: JobType;
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  status?: JobStatus;
  deadline?: string | Date;
}

export interface UpdateJobDto {
  title?: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  skills?: string[];
  location?: string;
  isRemote?: boolean;
  jobType?: JobType;
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  status?: JobStatus;
  deadline?: string | Date;
}
