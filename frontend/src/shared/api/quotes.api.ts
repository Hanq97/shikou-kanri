import { apiClient } from './client';

export type QuoteStatus =
  | 'draft'
  | 'submitted'
  | 'pending_admin'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'won'
  | 'lost';

export type QuoteChangeType = 'correction' | 'deletion' | 'status_change';

export interface QuoteLine {
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

export interface QuoteSummary {
  id: string;
  quoteNumber: string;
  projectId: string;
  versionNo: number;
  version: number;
  status: QuoteStatus;
  issuedAt: string;
  validUntil: string | null;
  counterPartyName: string;
  amountSubtotal: string;
  amountTax: string;
  amountTotal: string;
  notes: string | null;
  qualifiedInvoiceNumber: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;
}

export interface QuoteDetail extends QuoteSummary {
  lines: QuoteLine[];
  project: {
    id: string;
    projectCode: string;
    name: string;
    customerId: string;
  };
  approvedBy: { id: string; name: string } | null;
}

export interface QuoteVersionRecord {
  id: string;
  quoteId: string;
  versionNo: number;
  changeType: QuoteChangeType;
  changeReason: string;
  snapshot: unknown;
  changedAt: string;
  changedById: string;
  changedBy: { id: string; name: string };
}

export interface ListQuotesParams {
  search?: string;
  status?: QuoteStatus[];
  projectId?: string;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  counterPartySearch?: string;
  sortBy?: 'issuedAt' | 'amountTotal' | 'quoteNumber' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ListQuotesResponse {
  data: QuoteSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QuoteLineInput {
  sortOrder?: number;
  category?: string;
  itemName: string;
  description?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  isOptional?: boolean;
  unitPriceMasterId?: string;
}

export interface CreateQuoteInput {
  projectId: string;
  issuedAt: string;
  validUntil?: string;
  notes?: string;
  qualifiedInvoiceNumber?: string;
  lines: QuoteLineInput[];
}

export interface UpdateQuoteInput {
  issuedAt?: string;
  validUntil?: string | null;
  notes?: string | null;
  qualifiedInvoiceNumber?: string | null;
  lines?: QuoteLineInput[];
  version: number;
}

export interface CloneQuoteInput {
  projectId?: string;
}

export interface CreateVersionInput {
  changeReason: string;
}

function buildSearch(params: ListQuotesParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.status?.length) sp.set('status', params.status.join(','));
  if (params.projectId) sp.set('projectId', params.projectId);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  if (params.minAmount !== undefined) sp.set('minAmount', String(params.minAmount));
  if (params.maxAmount !== undefined) sp.set('maxAmount', String(params.maxAmount));
  if (params.counterPartySearch) sp.set('counterPartySearch', params.counterPartySearch);
  if (params.sortBy) sp.set('sortBy', params.sortBy);
  if (params.sortOrder) sp.set('sortOrder', params.sortOrder);
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  return sp;
}

export const quotesApi = {
  async list(params: ListQuotesParams = {}): Promise<ListQuotesResponse> {
    const { data } = await apiClient.get<ListQuotesResponse>('/quotes', {
      params: buildSearch(params),
    });
    return data;
  },

  async get(id: string): Promise<QuoteDetail> {
    const { data } = await apiClient.get<{ quote: QuoteDetail }>(`/quotes/${id}`);
    return data.quote;
  },

  async listVersions(id: string): Promise<QuoteVersionRecord[]> {
    const { data } = await apiClient.get<{ data: QuoteVersionRecord[] }>(`/quotes/${id}/versions`);
    return data.data;
  },

  pdfUrl(id: string): string {
    const base = apiClient.defaults.baseURL ?? '/api/v1';
    return `${base}/quotes/${id}/pdf`;
  },

  async create(input: CreateQuoteInput): Promise<QuoteDetail> {
    const { data } = await apiClient.post<{ quote: QuoteDetail }>('/quotes', input);
    return data.quote;
  },

  async update(id: string, input: UpdateQuoteInput): Promise<QuoteDetail> {
    const { data } = await apiClient.put<{ quote: QuoteDetail }>(`/quotes/${id}`, input);
    return data.quote;
  },

  async softDelete(id: string, reason: string): Promise<void> {
    await apiClient.delete(`/quotes/${id}`, { data: { reason } });
  },

  async clone(id: string, input: CloneQuoteInput = {}): Promise<QuoteDetail> {
    const { data } = await apiClient.post<{ quote: QuoteDetail }>(`/quotes/${id}/clone`, input);
    return data.quote;
  },

  async submit(id: string): Promise<QuoteSummary> {
    const { data } = await apiClient.post<{ quote: QuoteSummary }>(`/quotes/${id}/submit`);
    return data.quote;
  },

  async approve(id: string): Promise<QuoteSummary> {
    const { data } = await apiClient.post<{ quote: QuoteSummary }>(`/quotes/${id}/approve`);
    return data.quote;
  },

  async reject(id: string, reason: string): Promise<QuoteSummary> {
    const { data } = await apiClient.post<{ quote: QuoteSummary }>(`/quotes/${id}/reject`, {
      reason,
    });
    return data.quote;
  },

  async send(id: string): Promise<QuoteSummary> {
    const { data } = await apiClient.post<{ quote: QuoteSummary }>(`/quotes/${id}/send`);
    return data.quote;
  },

  async won(id: string): Promise<QuoteSummary> {
    const { data } = await apiClient.post<{ quote: QuoteSummary }>(`/quotes/${id}/won`);
    return data.quote;
  },

  async lost(id: string): Promise<QuoteSummary> {
    const { data } = await apiClient.post<{ quote: QuoteSummary }>(`/quotes/${id}/lost`, {});
    return data.quote;
  },

  async createVersion(id: string, input: CreateVersionInput): Promise<QuoteDetail> {
    const { data } = await apiClient.post<{ quote: QuoteDetail }>(`/quotes/${id}/version`, input);
    return data.quote;
  },
};
