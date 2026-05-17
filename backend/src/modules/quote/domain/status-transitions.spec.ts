import { isValidTransition, VALID_TRANSITIONS } from './status-transitions';
import { QuoteStatusName } from './types';

describe('quote status-transitions', () => {
  it('allows draft → submitted', () => {
    expect(isValidTransition('draft', 'submitted')).toBe(true);
  });

  it('rejects draft → approved', () => {
    expect(isValidTransition('draft', 'approved')).toBe(false);
  });

  it('submitted has 3 next states (approved/pending_admin/rejected)', () => {
    expect(VALID_TRANSITIONS.submitted).toEqual(
      expect.arrayContaining(['approved', 'pending_admin', 'rejected']),
    );
  });

  it('terminal states won/lost have no transitions', () => {
    expect(VALID_TRANSITIONS.won).toEqual([]);
    expect(VALID_TRANSITIONS.lost).toEqual([]);
  });

  it('rejected allows resubmit (rejected → submitted)', () => {
    expect(isValidTransition('rejected', 'submitted')).toBe(true);
  });

  it('approved allows send and reject (regret approval)', () => {
    expect(isValidTransition('approved', 'sent')).toBe(true);
    expect(isValidTransition('approved', 'rejected')).toBe(true);
  });

  it('sent allows won/lost only', () => {
    expect(isValidTransition('sent', 'won')).toBe(true);
    expect(isValidTransition('sent', 'lost')).toBe(true);
    expect(isValidTransition('sent', 'approved')).toBe(false);
  });

  it('won is locked (no further transitions)', () => {
    const allStates: QuoteStatusName[] = [
      'draft',
      'submitted',
      'pending_admin',
      'approved',
      'rejected',
      'sent',
      'won',
      'lost',
    ];
    for (const to of allStates) {
      expect(isValidTransition('won', to)).toBe(false);
    }
  });
});
