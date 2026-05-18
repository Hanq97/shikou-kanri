import { apiClient } from './client';

export interface UnitPriceSummary {
  id: string;
  code: string;
  category: string | null;
  itemName: string;
  description: string | null;
  unit: string;
  defaultUnitPrice: string;
  supplierName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListUnitPricesParams {
  search?: string;
  category?: string;
  isActive?: boolean;
  sortBy?: 'itemName' | 'code' | 'defaultUnitPrice';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ListUnitPricesResponse {
  data: UnitPriceSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateUnitPriceInput {
  code: string;
  category?: string;
  itemName: string;
  description?: string;
  unit: string;
  defaultUnitPrice: number;
  supplierName?: string;
  isActive?: boolean;
}

export interface UpdateUnitPriceInput {
  code?: string;
  category?: string | null;
  itemName?: string;
  description?: string | null;
  unit?: string;
  defaultUnitPrice?: number;
  supplierName?: string | null;
  isActive?: boolean;
}

function buildSearch(params: ListUnitPricesParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.category) sp.set('category', params.category);
  if (params.isActive !== undefined) sp.set('isActive', String(params.isActive));
  if (params.sortBy) sp.set('sortBy', params.sortBy);
  if (params.sortOrder) sp.set('sortOrder', params.sortOrder);
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  return sp;
}

export const unitPricesApi = {
  async list(params: ListUnitPricesParams = {}): Promise<ListUnitPricesResponse> {
    const { data } = await apiClient.get<ListUnitPricesResponse>('/unit-prices', {
      params: buildSearch(params),
    });
    return data;
  },

  async create(input: CreateUnitPriceInput): Promise<UnitPriceSummary> {
    const { data } = await apiClient.post<{ unitPrice: UnitPriceSummary }>('/unit-prices', input);
    return data.unitPrice;
  },

  async update(id: string, input: UpdateUnitPriceInput): Promise<UnitPriceSummary> {
    const { data } = await apiClient.put<{ unitPrice: UnitPriceSummary }>(
      `/unit-prices/${id}`,
      input,
    );
    return data.unitPrice;
  },

  async softDelete(id: string): Promise<void> {
    await apiClient.delete(`/unit-prices/${id}`);
  },
};
