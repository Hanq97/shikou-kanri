import { apiClient } from './client';

export type CustomerType = 'individual' | 'corporate';

export interface CustomerSummary {
  id: string;
  customerType: CustomerType;
  name: string;
  nameKana: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isOb: boolean;
  acquiredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;
}

export interface ListCustomersParams {
  search?: string;
  isOb?: boolean;
  sortBy?: 'createdAt' | 'name' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ListCustomersResponse {
  data: CustomerSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DuplicateOf {
  id: string;
  name: string;
  address: string | null;
}

export interface CreateCustomerInput {
  customerType: CustomerType;
  name: string;
  nameKana?: string;
  phone?: string;
  email?: string;
  address?: string;
  isOb?: boolean;
  acquiredAt?: string;
  notes?: string;
}

export type CreateCustomerResponse =
  | { customer: CustomerSummary; duplicateOf?: undefined }
  | { duplicateOf: DuplicateOf; customer?: undefined };

export const customersApi = {
  async list(params: ListCustomersParams = {}): Promise<ListCustomersResponse> {
    const { data } = await apiClient.get<ListCustomersResponse>('/customers', { params });
    return data;
  },

  async get(id: string): Promise<CustomerSummary> {
    const { data } = await apiClient.get<{ customer: CustomerSummary }>(`/customers/${id}`);
    return data.customer;
  },

  async create(input: CreateCustomerInput, force = false): Promise<CreateCustomerResponse> {
    const { data } = await apiClient.post<CreateCustomerResponse>('/customers', input, {
      params: force ? { force: 'true' } : {},
    });
    return data;
  },

  async update(
    id: string,
    input: Partial<CreateCustomerInput>,
    force = false,
  ): Promise<CreateCustomerResponse> {
    const { data } = await apiClient.put<CreateCustomerResponse>(`/customers/${id}`, input, {
      params: force ? { force: 'true' } : {},
    });
    return data;
  },

  async softDelete(id: string): Promise<void> {
    await apiClient.delete(`/customers/${id}`);
  },
};
