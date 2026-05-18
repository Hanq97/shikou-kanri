import { formatJpy } from './jpy-format';

describe('formatJpy', () => {
  it('formats positive integers with thousand separators', () => {
    expect(formatJpy(1234567)).toBe('￥1,234,567');
  });

  it('formats zero', () => {
    expect(formatJpy(0)).toBe('￥0');
  });

  it('formats string numbers', () => {
    expect(formatJpy('500000')).toBe('￥500,000');
  });

  it('returns em-dash for null / undefined / empty', () => {
    expect(formatJpy(null)).toBe('—');
    expect(formatJpy(undefined)).toBe('—');
    expect(formatJpy('')).toBe('—');
  });

  it('returns em-dash for NaN / non-numeric strings', () => {
    expect(formatJpy('abc')).toBe('—');
    expect(formatJpy(NaN)).toBe('—');
  });

  it('formats negative values with leading minus', () => {
    expect(formatJpy(-50000)).toBe('-￥50,000');
  });

  it('rounds floating-point values (no decimals)', () => {
    expect(formatJpy(123.7)).toBe('￥124');
  });
});
