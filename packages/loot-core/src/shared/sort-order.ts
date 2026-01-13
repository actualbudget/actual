/**
 * Constants for sort_order format: YYYYMMDDseq
 * - Date portion: 8 digits (YYYYMMDD)
 * - Seq portion: up to 5 digits (0-99999)
 * - Combined: dateInt * 100000 + seq = 13 digits total (same as Date.now())
 * - Example: 2024-01-15 seq 42 = 2024011500042
 */
export const SEQ_MULTIPLIER = 100000;
export const MAX_SEQ = 99999;

/**
 * Convert a date string (YYYY-MM-DD) to integer representation (YYYYMMDD)
 */
export function toDateRepr(str: string): number {
  if (typeof str !== 'string') {
    throw new Error('toDateRepr not passed a string: ' + str);
  }
  return parseInt(str.replace(/-/g, ''));
}

/**
 * Generate a sort_order value from a date and sequence number.
 * Format: YYYYMMDDseq where seq can be 0-99999 (5 digits)
 * Total: 13 digits, same numeric space as Date.now() timestamps
 *
 * @param date - Date string in 'YYYY-MM-DD' format
 * @param seq - Sequence number (default: 1)
 * @returns Combined sort_order value
 */
export function generateSortOrder(date: string, seq: number = 1): number {
  if (seq < 0 || seq > MAX_SEQ) {
    throw new Error(`seq must be between 0 and ${MAX_SEQ}, got: ${seq}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`date must be in YYYY-MM-DD format, got: ${date}`);
  }
  const dateInt = toDateRepr(date);
  return dateInt * SEQ_MULTIPLIER + seq;
}

/**
 * Extract the sequence number from a sort_order value.
 * Handles both new YYYYMMDDseq format and legacy timestamp format.
 *
 * @param sortOrder - The sort_order value
 * @returns Sequence number (or the full value if legacy timestamp)
 */
export function extractSeq(sortOrder: number | null | undefined): number {
  if (sortOrder == null) {
    return 0;
  }

  // Legacy timestamps are much larger than the new format
  if (isLegacyTimestamp(sortOrder)) {
    return sortOrder;
  }

  return sortOrder % SEQ_MULTIPLIER;
}

/**
 * Extract the date integer (YYYYMMDD) from a sort_order value.
 *
 * @param sortOrder - The sort_order value
 * @returns Date integer in YYYYMMDD format
 */
export function extractDateInt(sortOrder: number | null | undefined): number {
  if (sortOrder == null) {
    return 0;
  }

  // Legacy timestamps don't have an embedded date
  if (isLegacyTimestamp(sortOrder)) {
    return 0;
  }

  return Math.floor(sortOrder / SEQ_MULTIPLIER);
}

/**
 * Check if a sort_order value is in the legacy timestamp format.
 * Both legacy timestamps (Date.now()) and new format are 13 digits.
 * - Legacy: 1736xxx... (timestamp from ~2024-2025, starting with "17")
 * - New: 2024xxx... (YYYYMMDDseq format, starting with "20")
 *
 * @param sortOrder - The sort_order value
 * @returns true if the value appears to be a legacy timestamp
 */
export function isLegacyTimestamp(
  sortOrder: number | null | undefined,
): boolean {
  if (sortOrder == null) {
    return false;
  }

  // Negative values (split children) are treated as new format.
  if (sortOrder < 0) {
    return false;
  }

  // Extract the date portion (YYYYMMDD) from the value
  const dateInt = Math.floor(sortOrder / SEQ_MULTIPLIER);

  // New format uses dates from 1995-2099 (19950101 to 20991231)
  // Legacy Date.now() timestamps from ~2024 give dateInt like 17050000
  // which has year 1705 - not in our valid range.
  //
  // We validate by checking:
  // 1. Year is 1995-2099 (first 4 digits)
  // 2. Month is 01-12
  // 3. Day is 01-31
  const year = Math.floor(dateInt / 10000);
  const month = Math.floor((dateInt % 10000) / 100);
  const day = dateInt % 100;

  const isValidYear = year >= 1995 && year <= 2099;
  const isValidMonth = month >= 1 && month <= 12;
  const isValidDay = day >= 1 && day <= 31;

  // If it's a valid YYYYMMDDseq format, it's NOT a legacy timestamp
  return !(isValidYear && isValidMonth && isValidDay);
}

/**
 * Validate a sequence number for a given date.
 * Ensures the combined sort_order value is within safe integer range.
 *
 * @param seq - The sequence number to validate
 * @param date - Date string in 'YYYY-MM-DD' format
 * @returns Object with isValid and error message if invalid
 */
export function validateSeq(
  seq: number,
  date: string,
): { isValid: boolean; error?: string } {
  if (!Number.isInteger(seq)) {
    return { isValid: false, error: 'Sequence must be an integer' };
  }

  if (seq < 0) {
    return { isValid: false, error: 'Sequence must be at least 0' };
  }

  if (seq > MAX_SEQ) {
    return {
      isValid: false,
      error: `Sequence number limit reached (${MAX_SEQ} max per day)`,
    };
  }

  // Defensive safeguard: ensure sort_order is within JavaScript's safe integer range.
  // In practice, with MAX_SEQ=99999 and max date 2099-12-31, the maximum sort_order is
  // ~2 trillion, well under MAX_SAFE_INTEGER (~9 quadrillion). This check guards against
  // future changes to these limits.
  const sortOrder = generateSortOrder(date, seq);
  if (sortOrder > Number.MAX_SAFE_INTEGER) {
    return { isValid: false, error: 'Sequence number too large for this date' };
  }

  return { isValid: true };
}

/**
 * Get the next available sequence number for a given date.
 * Scans existing transactions to find the maximum seq and returns max + 1.
 *
 * @param date - Date string in 'YYYY-MM-DD' format
 * @param transactions - Array of transactions to scan (should include sort_order)
 * @returns Next available sequence number (capped at MAX_SEQ)
 */
export function getNextSeqForDate(
  date: string,
  transactions: Array<{ date: string; sort_order?: number | null }>,
): { seq: number; atLimit: boolean } {
  const dateInt = toDateRepr(date);
  let maxSeq = 0;

  for (const trans of transactions) {
    if (trans.sort_order == null) continue;

    // Skip legacy timestamps
    if (isLegacyTimestamp(trans.sort_order)) continue;

    // Check if this transaction is on the same date
    const transDateInt = extractDateInt(trans.sort_order);
    if (transDateInt === dateInt) {
      const seq = extractSeq(trans.sort_order);
      if (seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  if (nextSeq > MAX_SEQ) {
    return { seq: MAX_SEQ, atLimit: true };
  }

  return { seq: nextSeq, atLimit: false };
}

/**
 * Assign sequence numbers to a batch of transactions.
 * Groups transactions by date and assigns incrementing seq values.
 * Useful for batch operations and imports.
 *
 * @param transactions - Array of transactions to process
 * @param existingTransactions - Existing transactions to consider when finding next seq
 * @returns Array of transactions with assigned sort_order values
 */
export function assignBatchSeq<
  T extends { date: string; sort_order?: number | null },
>(
  transactions: T[],
  existingTransactions: Array<{
    date: string;
    sort_order?: number | null;
  }> = [],
): Array<T & { sort_order: number; _seqAtLimit?: boolean }> {
  // Track next seq per date
  const seqByDate = new Map<string, { current: number; atLimit: boolean }>();

  // Initialize with existing transactions
  for (const trans of existingTransactions) {
    if (trans.sort_order == null) continue;
    if (isLegacyTimestamp(trans.sort_order)) continue;

    const dateInt = extractDateInt(trans.sort_order);
    const date = `${Math.floor(dateInt / 10000)}-${String(Math.floor((dateInt % 10000) / 100)).padStart(2, '0')}-${String(dateInt % 100).padStart(2, '0')}`;
    const seq = extractSeq(trans.sort_order);

    const existing = seqByDate.get(date);
    if (!existing || seq >= existing.current) {
      seqByDate.set(date, { current: seq + 1, atLimit: seq >= MAX_SEQ });
    }
  }

  // Assign seq to new transactions
  return transactions.map(trans => {
    let state = seqByDate.get(trans.date);
    if (!state) {
      state = { current: 1, atLimit: false };
      seqByDate.set(trans.date, state);
    }

    // Note: When at limit (extremely unlikely with normal use - would require 99,999+
    // transactions on a single day), all remaining transactions on this date will share
    // the same sort_order value (MAX_SEQ), resulting in undefined ordering among them.
    const seq = state.current;
    const atLimit = state.atLimit || seq >= MAX_SEQ;

    // Update state for next transaction on same date
    if (!atLimit) {
      state.current = seq + 1;
      state.atLimit = state.current > MAX_SEQ;
    }

    return {
      ...trans,
      sort_order: generateSortOrder(trans.date, Math.min(seq, MAX_SEQ)),
      ...(atLimit ? { _seqAtLimit: true } : {}),
    };
  });
}
