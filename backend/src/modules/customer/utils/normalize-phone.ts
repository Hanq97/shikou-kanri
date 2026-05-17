/**
 * Normalize phone number for storage + duplicate matching.
 * Strips spaces, hyphens, parentheses (both ASCII and full-width JP).
 * Returns null if input is null/undefined/empty after strip.
 */
export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-()（）「」]/g, '');
  return cleaned || null;
}
