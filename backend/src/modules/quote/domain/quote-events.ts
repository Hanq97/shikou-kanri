export const QUOTE_EVENTS = {
  CREATED: 'quote.created',
  UPDATED: 'quote.updated',
  SUBMITTED: 'quote.submitted',
  APPROVED: 'quote.approved',
  REJECTED: 'quote.rejected',
  SENT: 'quote.sent',
  WON: 'quote.won',
  LOST: 'quote.lost',
  DELETED: 'quote.deleted',
  CLONED: 'quote.cloned',
  VERSION_CREATED: 'quote.version.created',
} as const;

export interface QuoteCreatedPayload {
  quoteId: string;
  projectId: string;
}

export interface QuoteStatusChangedPayload {
  quoteId: string;
  tier?: 1 | 2;
  reason?: string;
}

export interface QuoteWonPayload {
  quoteId: string;
  projectId: string;
  amountTotal: number;
}

export interface QuoteVersionCreatedPayload {
  quoteId: string;
  versionNo: number;
  changeType: 'correction' | 'deletion' | 'status_change';
}
