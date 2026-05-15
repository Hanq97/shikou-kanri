import i18n from '@/shared/i18n';
import type { ApiError } from '@/shared/api/types';

/**
 * Map ApiError or error code to a translated, user-facing message.
 * Uses i18n.t() with key `errorCodes.<CODE>`. Falls back to error.message or generic INTERNAL_ERROR.
 */
export function mapErrorMessage(error: ApiError | string): string {
  const t = i18n.t.bind(i18n);
  const code = typeof error === 'string' ? error : error.code;
  const fallback = typeof error === 'object' && error.message ? error.message : '';

  // i18next returns the key itself when missing. Detect that and use fallback instead.
  const key = `errorCodes.${code}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  if (fallback) return fallback;
  return t('errorCodes.INTERNAL_ERROR');
}
