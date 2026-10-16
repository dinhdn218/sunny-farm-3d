import { describe, expect, it } from 'vitest';
import { formatAmount, formatCountdown } from '@/lib/format';

describe('formatCountdown', () => {
  it('rounds up to the second', () => {
    expect(formatCountdown(125_000)).toBe('2:05');
    expect(formatCountdown(100)).toBe('0:01');
  });
});

describe('formatAmount', () => {
  it('keeps every digit below a hundred thousand', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(16325)).toBe('16325');
    expect(formatAmount(99_999)).toBe('99999');
  });

  it('shortens bigger purses, never rounding up', () => {
    expect(formatAmount(100_000)).toBe('100K');
    expect(formatAmount(999_999)).toBe('999K');
    expect(formatAmount(1_234_567)).toBe('1,23M');
    expect(formatAmount(2_000_000)).toBe('2M');
  });
});
