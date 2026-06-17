import * as monthUtils from 'loot-core/shared/months';

import type { QueryResultColumn } from './processQueryResult';
import type { ResolvedChannel } from './resolveChannels';

export function needsGapFill(
  xChannel: ResolvedChannel | ResolvedChannel[] | undefined,
): boolean {
  if (!xChannel || Array.isArray(xChannel)) return false;
  return xChannel.type === 'date';
}

export type FillGapsOptions = {
  maxPeriods?: number;
  xColumnType?: QueryResultColumn['type'];
};

export function fillGaps(
  data: Record<string, unknown>[],
  xChannel: ResolvedChannel | ResolvedChannel[] | undefined,
  yFields: string[],
  options?: FillGapsOptions,
): Record<string, unknown>[] {
  if (!xChannel || Array.isArray(xChannel)) return data;
  if (xChannel.type !== 'date') return data;
  if (data.length === 0 || data.length === 1) return data;

  const maxPeriods = options?.maxPeriods ?? 120;
  const xColumnType: 'date' | 'date-month' | 'date-year' =
    options?.xColumnType === 'date-month' ||
    options?.xColumnType === 'date-year'
      ? options.xColumnType
      : 'date';

  const rawValues: string[] = [];
  for (const row of data) {
    const val = row[xChannel.field];
    if (val === null || val === undefined) continue;
    if (typeof val === 'string' || typeof val === 'number') {
      rawValues.push(String(val));
    }
  }
  if (rawValues.length === 0) return data;

  rawValues.sort();
  const min = rawValues[0];
  const max = rawValues[rawValues.length - 1];

  const allPeriods = generatePeriods(min, max, xColumnType);
  if (allPeriods.length > maxPeriods) return data;

  const rowByX = new Map<string, Record<string, unknown>>();
  for (const row of data) {
    const val = row[xChannel.field];
    if (val === null || val === undefined) continue;
    const key = String(val);
    if (!rowByX.has(key)) {
      rowByX.set(key, row);
    }
  }

  if (allPeriods.length === rowByX.size) return data;

  const otherFields: string[] = [];
  const seenKeys = new Set<string>([xChannel.field, ...yFields]);
  for (const row of data) {
    for (const key of Object.keys(row)) {
      if (!seenKeys.has(key)) {
        otherFields.push(key);
        seenKeys.add(key);
      }
    }
  }

  const filled: Record<string, unknown>[] = [];
  for (const period of allPeriods) {
    const existing = rowByX.get(period);
    if (existing) {
      filled.push(existing);
    } else {
      const newRow: Record<string, unknown> = { [xChannel.field]: period };
      for (const yField of yFields) {
        newRow[yField] = 0;
      }
      for (const key of otherFields) {
        newRow[key] = null;
      }
      filled.push(newRow);
    }
  }

  return filled;
}

function generatePeriods(
  min: string,
  max: string,
  type: 'date' | 'date-month' | 'date-year',
): string[] {
  if (type === 'date-month') {
    return monthUtils.rangeInclusive(min, max);
  }
  if (type === 'date-year') {
    return monthUtils.yearRangeInclusive(min, max);
  }
  return monthUtils.dayRangeInclusive(min, max);
}
