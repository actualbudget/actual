import { useMemo } from 'react';
import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { ChartSpec } from 'loot-core/types/chart-spec';

import { ColumnBarMark } from './ColumnBarMark';
import { NumberMark } from './NumberMark';
import { TableMark } from './TableMark';

import { fillGaps, needsGapFill } from '@desktop-client/queries/fillGaps';
import { needsPivot, pivotData } from '@desktop-client/queries/pivotData';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';
import type { ResolvedChannel } from '@desktop-client/queries/resolveChannels';
import { resolveChannels } from '@desktop-client/queries/resolveChannels';

type ChartRendererProps = {
  result: QueryResult;
  spec: ChartSpec;
  compact?: boolean;
};

export function ChartRenderer({
  result,
  spec,
  compact = false,
}: ChartRendererProps) {
  const resolved = useMemo(() => resolveChannels(spec, result), [spec, result]);

  const pivoted = useMemo(
    () =>
      resolved.mark !== 'table' && needsPivot(resolved)
        ? pivotData(result.rows, resolved)
        : null,
    [result.rows, resolved],
  );

  const preGapsData = pivoted?.data ?? result.rows;
  const seriesKeys = pivoted?.seriesKeys ?? [];

  const yFields = useMemo<string[]>(() => {
    const yEnc = resolved.encoding.y;
    if (!yEnc) return [];
    if (Array.isArray(yEnc)) return yEnc.map(ch => ch.field);
    return [yEnc.field];
  }, [resolved.encoding.y]);

  const data = useMemo(() => {
    if (
      resolved.config?.fillGaps === false ||
      !['column', 'bar', 'line', 'area'].includes(resolved.mark)
    ) {
      return preGapsData;
    }
    if (!needsGapFill(resolved.encoding.x)) return preGapsData;
    const xFieldName =
      resolved.encoding.x && !Array.isArray(resolved.encoding.x)
        ? resolved.encoding.x.field
        : undefined;
    const xColumn = xFieldName
      ? result.columns.find(c => c.name === xFieldName)
      : undefined;
    return fillGaps(
      preGapsData,
      resolved.encoding.x as ResolvedChannel,
      yFields,
      { xColumnType: xColumn?.type },
    );
  }, [
    preGapsData,
    resolved.encoding.x,
    resolved.mark,
    resolved.config?.fillGaps,
    yFields,
    result.columns,
  ]);

  const normalizedData = useMemo(() => {
    const xEnc = resolved.encoding.x;
    const yEnc = resolved.encoding.y;

    const categoryFields = new Set<string>();
    const addFields = (
      enc: ResolvedChannel | ResolvedChannel[] | undefined,
    ) => {
      if (!enc) return;
      const channels = Array.isArray(enc) ? enc : [enc];
      for (const ch of channels) {
        if (ch.type !== 'number') {
          categoryFields.add(ch.field);
        }
      }
    };
    addFields(xEnc);
    addFields(yEnc);
    if (categoryFields.size === 0) return data;

    return data.map(row => {
      let needsUpdate = false;
      const updated = { ...row };
      for (const field of categoryFields) {
        const val = row[field];
        if (val === null || val === undefined) {
          updated[field] = '—';
          needsUpdate = true;
        }
      }
      return needsUpdate ? updated : row;
    });
  }, [data, resolved.encoding.x, resolved.encoding.y]);

  if (resolved.errors.length > 0) {
    return (
      <View
        style={{
          padding: 20,
          color: theme.errorText,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {resolved.errors.map((err, i) => (
          <div key={i} style={{ fontSize: 12 }}>
            {err}
          </div>
        ))}
      </View>
    );
  }

  switch (resolved.mark) {
    case 'table':
      return (
        <TableMark result={result} resolved={resolved} compact={compact} />
      );
    case 'number':
      return (
        <NumberMark result={result} resolved={resolved} compact={compact} />
      );
    case 'column':
    case 'bar':
      return (
        <ColumnBarMark
          result={result}
          resolved={resolved}
          data={normalizedData}
          seriesKeys={seriesKeys}
          compact={compact}
        />
      );
    default:
      return (
        <View
          style={{
            padding: 20,
            color: theme.pageTextSubdued,
            textAlign: 'center',
          }}
        >
          <Trans>This visualization type is coming soon.</Trans>
        </View>
      );
  }
}
