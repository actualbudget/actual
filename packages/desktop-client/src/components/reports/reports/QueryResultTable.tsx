import { useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import type { ConditionalRule } from 'loot-core/types/chart-spec';

import { evaluateConditionalFormat } from '@desktop-client/components/query-report/visualizations/conditionalFormat';
import type { ConditionalStyling } from '@desktop-client/components/query-report/visualizations/conditionalFormat';
import { useFormat } from '@desktop-client/hooks/useFormat';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';

type QueryResultTableProps = {
  result: QueryResult;
  compact?: boolean;
  groupColumnCount?: number;
  conditionalRules?: ConditionalRule[];
  columnTitles?: Record<string, string>;
  columnFormats?: Record<string, string>;
};

type SortDirection = 'asc' | 'desc' | null;

type SortState = {
  column: string | null;
  direction: SortDirection;
};

export function QueryResultTable({
  result,
  compact = false,
  groupColumnCount = 0,
  conditionalRules,
  columnTitles,
  columnFormats,
}: QueryResultTableProps) {
  const format = useFormat();
  const [sortState, setSortState] = useState<SortState>({
    column: null,
    direction: null,
  });

  const sortedRows = useMemo(() => {
    if (!sortState.column || !sortState.direction) {
      return result.rows;
    }

    const column = sortState.column;
    const direction = sortState.direction;

    return [...result.rows].sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }, [result.rows, sortState]);

  const displayRows = sortedRows;

  const handleSort = (columnName: string) => {
    setSortState(prev => {
      if (prev.column !== columnName) {
        return { column: columnName, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column: columnName, direction: 'desc' };
      }
      return { column: null, direction: null };
    });
  };

  const formatCellValue = (
    value: unknown,
    type: string,
    formatOverride?: string,
  ): string => {
    if (value === null || value === undefined) return '—';

    if (formatOverride) {
      if (typeof value === 'number') {
        if (formatOverride === 'percent') {
          return `${(value * 100).toFixed(1)}%`;
        }
        if (
          formatOverride === 'financial' ||
          formatOverride === 'financial-no-decimals' ||
          formatOverride === 'financial-with-sign' ||
          formatOverride === 'number' ||
          formatOverride === 'number-no-decimals'
        ) {
          return format(value, formatOverride);
        }
      }
    }

    switch (type) {
      case 'date':
        return monthUtils.format(value as string, 'MM/dd/yyyy');
      case 'date-month':
        return monthUtils.format(value as string, 'MMM yyyy');
      case 'date-year':
        return String(value);
      case 'integer':
        if (typeof value === 'number') {
          return format(value, 'financial');
        }
        return String(value);
      case 'float':
      case 'number':
        if (typeof value === 'number') {
          return format(value, 'number');
        }
        return String(value);
      case 'boolean':
        return value ? '✓' : '—';
      case 'id':
        return String(value).slice(0, 8) + '…';
      default:
        return String(value);
    }
  };

  const columnValuesByName = useMemo(() => {
    const map: Record<string, unknown[]> = {};
    for (const col of result.columns) {
      map[col.name] = result.rows.map(r => r[col.name]);
    }
    return map;
  }, [result]);

  if (result.columns.length === 0) {
    return (
      <View style={{ padding: 20, color: theme.pageTextSubdued }}>
        <Trans>No data</Trans>
      </View>
    );
  }

  return (
    <View style={{ overflow: 'auto', flex: 1 }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: compact ? 11 : 13,
        }}
      >
        <thead>
          <tr>
            {result.columns.map((col, colIdx) => {
              const isGroupSeparator =
                groupColumnCount > 0 && colIdx === groupColumnCount - 1;
              return (
                <th
                  key={col.name}
                  onClick={() => handleSort(col.name)}
                  style={{
                    padding: compact ? '4px 8px' : '8px 12px',
                    textAlign: 'left',
                    borderBottom: `2px solid ${theme.tableBorder}`,
                    backgroundColor: theme.tableHeaderBackground,
                    color: theme.tableHeaderText,
                    fontWeight: 600,
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    ...(isGroupSeparator
                      ? { borderRight: `2px solid ${theme.tableBorder}` }
                      : {}),
                  }}
                >
                  {columnTitles?.[col.name] ?? col.name}
                  {sortState.column === col.name && sortState.direction && (
                    <span style={{ marginLeft: 4 }}>
                      {sortState.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, idx) => {
            const rowFormatting: ConditionalStyling[] = [];
            for (const col of result.columns) {
              const cellValue = row[col.name];
              const styling = evaluateConditionalFormat(
                col.name,
                cellValue,
                columnValuesByName[col.name] ?? [],
                conditionalRules,
              );
              if (styling?.formatEntireRow) {
                rowFormatting.push(styling);
              }
            }
            const rowMerged: ConditionalStyling =
              rowFormatting.reduce<ConditionalStyling | null>(
                (acc, next) => (acc ? { ...acc, ...next } : next),
                null,
              );
            return (
              <tr
                key={idx}
                style={{
                  backgroundColor:
                    idx % 2 === 0
                      ? theme.tableBackground
                      : theme.tableRowBackgroundHover,
                  ...(rowMerged?.backgroundColor
                    ? { backgroundColor: rowMerged.backgroundColor }
                    : {}),
                  ...(rowMerged?.textColor
                    ? { color: rowMerged.textColor }
                    : {}),
                  ...(rowMerged?.bold ? { fontWeight: 600 } : {}),
                  ...(rowMerged?.italic ? { fontStyle: 'italic' } : {}),
                }}
              >
                {result.columns.map((col, colIdx) => {
                  const isGroupSeparator =
                    groupColumnCount > 0 && colIdx === groupColumnCount - 1;
                  const cellValue = row[col.name];
                  const cellStyling = evaluateConditionalFormat(
                    col.name,
                    cellValue,
                    columnValuesByName[col.name] ?? [],
                    conditionalRules,
                  );
                  return (
                    <td
                      key={col.name}
                      style={{
                        padding: compact ? '3px 8px' : '6px 12px',
                        borderBottom: `1px solid ${theme.tableBorder}`,
                        backgroundColor:
                          cellStyling?.backgroundColor ??
                          (cellStyling?.formatEntireRow
                            ? rowMerged?.backgroundColor
                            : undefined),
                        color:
                          cellStyling?.textColor ??
                          rowMerged?.textColor ??
                          theme.tableText,
                        whiteSpace: 'nowrap',
                        ...(cellStyling?.bold || rowMerged?.bold
                          ? { fontWeight: 600 }
                          : {}),
                        ...(cellStyling?.italic || rowMerged?.italic
                          ? { fontStyle: 'italic' }
                          : {}),
                        ...(isGroupSeparator
                          ? { borderRight: `2px solid ${theme.tableBorder}` }
                          : {}),
                      }}
                    >
                      {formatCellValue(
                        cellValue,
                        col.type,
                        columnFormats?.[col.name],
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </View>
  );
}
