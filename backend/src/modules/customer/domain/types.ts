export type CustomerTypeName = 'individual' | 'corporate';

export type PropertyTypeName =
  | 'new_construction'
  | 'remodel'
  | 'single_family'
  | 'multi_family'
  | 'commercial'
  | 'other';

export type PropertyStructureName = 'wood' | 'steel' | 'rc' | 'other';

export interface CustomerDto {
  id: string;
  customerType: CustomerTypeName;
  name: string;
  nameKana: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isOb: boolean;
  acquiredAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
}

export interface ListCustomersFilter {
  search?: string;
  isOb?: boolean;
  sortBy: 'createdAt' | 'name' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface DuplicateCheckResult {
  duplicateOf: { id: string; name: string; address: string | null } | null;
}
