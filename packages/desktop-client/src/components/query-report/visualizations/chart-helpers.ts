import * as monthUtils from 'loot-core/shared/months';

import { getColorScale } from '@desktop-client/components/reports/chart-theme';
import type { UseFormatResult } from '@desktop-client/hooks/useFormat';
import type { QueryResultColumn } from '@desktop-client/queries/processQueryResult';
import type { ResolvedChannel } from '@desktop-client/queries/resolveChannels';

export function getSeriesColor(index: number): string {
  const colors = getColorScale('qualitative');
  return colors[index % colors.length];
}

export function getAxisFormatter(
  channel: ResolvedChannel | undefined,
  columns: QueryResultColumn[],
  format: UseFormatResult,
): ((value: unknown) => string) | undefined {
  if (!channel) return undefined;
  const colType = columns.find(c => c.name === channel.field)?.type;
  const fieldType = channel.type;

  if (fieldType === 'date' || colType?.startsWith('date')) {
    return (value: unknown) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') {
        if (colType === 'date-month' || colType === 'date-year') {
          return monthUtils.format(value, 'MMM yyyy');
        }
        return monthUtils.format(value, 'MM/dd/yyyy');
      }
      return String(value);
    };
  }

  if (fieldType === 'number') {
    return (value: unknown) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'number') {
        return format(value, 'financial-no-decimals');
      }
      return String(value);
    };
  }

  return undefined;
}
