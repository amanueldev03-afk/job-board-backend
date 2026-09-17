export interface CreateEmployerDto {
  companyName: string;
  companyDescription?: string;
  companyWebsite?: string;
  industry?: string;
  companySize?: string;
  location?: string;
  logo?: string;
}

export interface UpdateEmployerDto {
  companyName?: string;
  companyDescription?: string;
  companyWebsite?: string;
  industry?: string;
  companySize?: string;
  location?: string;
  logo?: string;
}

export interface EmployerFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
  location?: string;
}
