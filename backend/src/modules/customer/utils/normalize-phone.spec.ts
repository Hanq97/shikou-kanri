import { normalizePhone } from './normalize-phone';

describe('normalizePhone', () => {
  it('returns null for null/undefined/empty', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });

  it('returns null if only separators', () => {
    expect(normalizePhone('   ')).toBeNull();
    expect(normalizePhone('-()()')).toBeNull();
  });

  it('strips ASCII spaces, hyphens, parentheses', () => {
    expect(normalizePhone('03-1234-5678')).toBe('0312345678');
    expect(normalizePhone('(03) 1234 5678')).toBe('0312345678');
    expect(normalizePhone('03 1234 5678')).toBe('0312345678');
  });

  it('strips full-width JP parentheses and brackets', () => {
    expect(normalizePhone('（03）1234-5678')).toBe('0312345678');
    expect(normalizePhone('「03」1234「5678」')).toBe('0312345678');
  });

  it('preserves digits otherwise', () => {
    expect(normalizePhone('0312345678')).toBe('0312345678');
  });
});
