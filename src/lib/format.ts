// "2:05" for a workshop countdown (rounded up so it never shows 0:00 before it is done)
export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// A purse amount short enough for the bar: "16325", then "125K" from a hundred thousand and "1,23M" from a
// million (rounded down, so it never shows more than there is)
export function formatAmount(n: number) {
  if (n < 100_000) return String(n);
  if (n < 1_000_000) return `${Math.floor(n / 1000)}K`;
  return `${(Math.floor(n / 10_000) / 100).toString().replace('.', ',')}M`;
}
