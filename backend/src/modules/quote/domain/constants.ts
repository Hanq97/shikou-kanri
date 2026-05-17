/**
 * Approval tier 2 threshold: quotes with amount_total > this value require admin approval.
 * Per F2 SRS D5 — hard-coded MVP, future migrate to env/settings.
 */
export const APPROVAL_TIER2_THRESHOLD_JPY = 10_000_000;

/**
 * Default tax rate (consumption tax).
 */
export const DEFAULT_TAX_RATE = 0.1;

/**
 * Reduced tax rate (8% for food, rare in construction).
 */
export const REDUCED_TAX_RATE = 0.08;
