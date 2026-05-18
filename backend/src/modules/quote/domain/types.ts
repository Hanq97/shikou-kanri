import {
  Quote,
  QuoteLine,
  QuoteVersion,
  UnitPrice,
  User,
} from '@prisma/client';

export type QuoteStatusName =
  | 'draft'
  | 'submitted'
  | 'pending_admin'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'won'
  | 'lost';

export type QuoteChangeTypeName = 'correction' | 'deletion' | 'status_change';

export interface QuoteDto {
  id: string;
  quoteNumber: string;
  projectId: string;
  versionNo: number;
  version: number;
  status: QuoteStatusName;
  issuedAt: Date;
  validUntil: Date | null;
  counterPartyName: string;
  amountSubtotal: string;
  amountTax: string;
  amountTotal: string;
  notes: string | null;
  qualifiedInvoiceNumber: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
}

export interface QuoteLineDto {
  id: string;
  quoteId: string;
  sortOrder: number;
  category: string | null;
  itemName: string;
  description: string | null;
  unit: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  taxRate: string;
  isOptional: boolean;
  unitPriceMasterId: string | null;
}

export interface QuoteDetailDto extends QuoteDto {
  lines: QuoteLineDto[];
  project: {
    id: string;
    projectCode: string;
    name: string;
    customerId: string;
  };
  approvedBy: { id: string; name: string } | null;
}

export type QuoteWithRelations = Quote & {
  project: {
    id: string;
    projectCode: string;
    name: string;
    customerId: string;
  };
};

export type QuoteWithLines = Quote & {
  lines: QuoteLine[];
  project: {
    id: string;
    projectCode: string;
    name: string;
    customerId: string;
  };
  approvedBy: Pick<User, 'id' | 'name'> | null;
};

export interface ListQuotesFilter {
  search?: string;
  status?: QuoteStatusName[];
  projectId?: string;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  counterPartySearch?: string;
  sortBy:
    | 'issuedAt'
    | 'amountTotal'
    | 'quoteNumber'
    | 'createdAt'
    | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface ListUnitPricesFilter {
  search?: string;
  category?: string;
  isActive?: boolean;
  sortBy: 'itemName' | 'code' | 'defaultUnitPrice';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface UnitPriceDto {
  id: string;
  code: string;
  category: string | null;
  itemName: string;
  description: string | null;
  unit: string;
  defaultUnitPrice: string;
  supplierName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type QuoteVersionRecord = QuoteVersion;
export type UnitPriceRecord = UnitPrice;
