import { QuoteStatusName } from './types';

export const VALID_TRANSITIONS: Record<QuoteStatusName, QuoteStatusName[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'pending_admin', 'rejected'],
  pending_admin: ['approved', 'rejected'],
  approved: ['sent', 'rejected'],
  sent: ['won', 'lost'],
  rejected: ['submitted'],
  won: [],
  lost: [],
};

export function isValidTransition(
  from: QuoteStatusName,
  to: QuoteStatusName,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
