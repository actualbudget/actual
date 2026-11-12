// Which currencies are budgeted on lines of their own, as the
// `currency-own-lines` preference stores it: `CODE:FROM` entries separated
// by commas, FROM being the month (YYYYMM) their lines start in, or 0 for
// every month. `*` stands for every currency not listed.
export type OwnLineStarts = ReadonlyMap<string, number>;

export const EVERY_CURRENCY = '*';

export function parseOwnLines(
  value: string | null | undefined,
): Map<string, number> {
  const starts = new Map<string, number>();
  for (const entry of (value ?? '').split(',')) {
    const [code = '', from = '0'] = entry.trim().split(':');
    if (/^([A-Z]{3}|\*)$/.test(code) && /^(0|\d{6})$/.test(from)) {
      starts.set(code, parseInt(from));
    }
  }
  return starts;
}

export function serializeOwnLines(starts: OwnLineStarts): string {
  return [...starts]
    .sort(([a], [b]) =>
      a === EVERY_CURRENCY ? 1 : b === EVERY_CURRENCY ? -1 : a.localeCompare(b),
    )
    .map(([code, from]) => `${code}:${from}`)
    .join(',');
}

// The month (YYYYMM, 0 for every month) the lines of `currency` start in,
// or null when it isn't budgeted on its own
export function getOwnLineStart(
  starts: OwnLineStarts,
  currency: string,
): number | null {
  return starts.get(currency) ?? starts.get(EVERY_CURRENCY) ?? null;
}
