import * as monthUtils from 'loot-core/shared/months';

import { getColorScale } from '@desktop-client/components/reports/chart-theme';
import type {
  FormatType,
  UseFormatResult,
} from '@desktop-client/hooks/useFormat';
import type { QueryResultColumn } from '@desktop-client/queries/processQueryResult';
import type { ResolvedChannel } from '@desktop-client/queries/resolveChannels';

export function axisFormatType(
  channels: ResolvedChannel | ResolvedChannel[] | undefined,
  fallback: FormatType = 'financial-no-decimals',
): FormatType {
  if (!channels) return fallback;
  const channelArray = Array.isArray(channels) ? channels : [channels];
  const formats = channelArray
    .map(ch => ch.format)
    .filter((f): f is string => !!f && f !== 'default');
  if (formats.length === 0) return fallback;
  const first = formats[0];
  if (formats.every(f => f === first)) {
    return channelFormatType(
      { field: '', format: first } as ResolvedChannel,
      fallback,
    );
  }
  return 'number';
}

export function getSeriesColor(index: number): string {
  const colors = getColorScale('qualitative');
  return colors[index % colors.length];
}

export function channelFormatType(
  channel: ResolvedChannel | ResolvedChannel[] | undefined,
  fallback: FormatType = 'financial-no-decimals',
): FormatType {
  const ch = Array.isArray(channel) ? channel[0] : channel;
  if (!ch?.format) return fallback;
  switch (ch.format) {
    case 'financial':
      return 'financial';
    case 'financial-no-decimals':
      return 'financial-no-decimals';
    case 'financial-with-sign':
      return 'financial-with-sign';
    case 'number':
      return 'number';
    case 'percent':
      return 'percentage';
    default:
      return fallback;
  }
}

export function getAxisFormatter(
  channel: ResolvedChannel | undefined,
  columns: QueryResultColumn[],
  format: UseFormatResult,
): ((value: unknown) => string) | undefined {
  if (!channel) return undefined;
  const colType = columns.find(c => c.name === channel.field)?.type;
  const fieldType = channel.type;

  if (channel.format && channel.format !== 'default') {
    switch (channel.format) {
      case 'date-year':
        return (value: unknown) => {
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') {
            return monthUtils.format(value, 'yyyy');
          }
          return String(value);
        };
      case 'date-month':
        return (value: unknown) => {
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') {
            return monthUtils.format(value, 'MMM yyyy');
          }
          return String(value);
        };
      case 'date':
        return (value: unknown) => {
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') {
            return monthUtils.format(value, 'MM/dd/yyyy');
          }
          return String(value);
        };
      default:
        break;
    }
  }

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
    const fmtType =
      channel?.format && channel.format !== 'default'
        ? channelFormatType(channel, 'number')
        : 'number';
    return (value: unknown) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'number') {
        return format(value, fmtType);
      }
      return String(value);
    };
  }

  return undefined;
}
