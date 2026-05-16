import { apiClient } from './client';

export type PropertyType =
  | 'new_construction'
  | 'remodel'
  | 'single_family'
  | 'multi_family'
  | 'commercial'
  | 'other';

export type PropertyStructure = 'wood' | 'steel' | 'rc' | 'other';

export interface PropertySummary {
  id: string;
  customerId: string;
  address: string;
  propertyType: PropertyType;
  structure: PropertyStructure;
  yearBuilt: number | null;
  handoverDate: string | null;
  floorAreaSqm: string | null;
  photoUrls: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;
}

export interface CreatePropertyInput {
  customerId: string;
  address: string;
  propertyType: PropertyType;
  structure: PropertyStructure;
  yearBuilt?: number;
  handoverDate?: string;
  floorAreaSqm?: number;
  photoUrls?: string[];
  notes?: string;
}

export const propertiesApi = {
  async listByCustomer(customerId: string): Promise<PropertySummary[]> {
    const { data } = await apiClient.get<{ data: PropertySummary[] }>(
      `/customers/${customerId}/properties`,
    );
    return data.data;
  },

  async get(id: string): Promise<PropertySummary> {
    const { data } = await apiClient.get<{ property: PropertySummary }>(`/properties/${id}`);
    return data.property;
  },

  async create(input: CreatePropertyInput): Promise<PropertySummary> {
    const { data } = await apiClient.post<{ property: PropertySummary }>('/properties', input);
    return data.property;
  },

  async update(
    id: string,
    input: Partial<Omit<CreatePropertyInput, 'customerId'>>,
  ): Promise<PropertySummary> {
    const { data } = await apiClient.put<{ property: PropertySummary }>(`/properties/${id}`, input);
    return data.property;
  },

  async softDelete(id: string): Promise<void> {
    await apiClient.delete(`/properties/${id}`);
  },
};
