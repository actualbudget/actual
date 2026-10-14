import type { FormatType } from '#hooks/useFormat';

/**
 * A change from a baseline, with a plus sign when it's positive.
 */
export function formatChange(
  change: number,
  format: (value: unknown, type: FormatType) => string,
) {
  return (change > 0 ? '+' : '') + format(change, 'financial');
}
