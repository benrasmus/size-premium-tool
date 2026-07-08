export function fmtPercent(v: number, decimals = 2): string {
  return `${(v * 100).toFixed(decimals)}%`;
}

export function fmtNumber(v: number, decimals = 2): string {
  return v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtMultiple(v: number | null, decimals = 1): string {
  if (v === null || !Number.isFinite(v) || v < 0) return "n/a";
  return `${v.toFixed(decimals)}x`;
}

export function fmtMoneyMillions(v: number): string {
  if (v >= 1000) {
    return `$${(v / 1000).toFixed(2)}B`;
  }
  return `$${v.toFixed(1)}M`;
}

/** Format a raw dollar amount (not millions) compactly, e.g. 2_500_000 -> "$2.50M". */
export function fmtDollarsCompact(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}
