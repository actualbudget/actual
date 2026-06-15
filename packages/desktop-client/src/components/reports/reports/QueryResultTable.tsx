import { useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import { integerToAmount } from 'loot-core/shared/util';

import { useFormat } from '@desktop-client/hooks/useFormat';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';

type QueryResultTableProps = {
  result: QueryResult;
  compact?: boolean;
};

type SortDirection = 'asc' | 'desc' | null;

type SortState = {
  column: string | null;
  direction: SortDirection;
};

export function QueryResultTable({
  result,
  compact = false,
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

  const displayRows = compact ? sortedRows.slice(0, 5) : sortedRows;
  const hasMoreRows = compact && sortedRows.length > 5;

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

  const formatCellValue = (value: unknown, type: string): string => {
    if (value === null || value === undefined) return '—';

    switch (type) {
      case 'date':
        return monthUtils.format(value as string, 'MM/dd/yyyy');
      case 'date-month':
        return monthUtils.format(value as string, 'MMM yyyy');
      case 'date-year':
        return String(value);
      case 'integer':
      case 'float':
      case 'number':
        if (typeof value === 'number') {
          return Number.isInteger(value)
            ? format(integerToAmount(value), 'financial')
            : format(value, 'number');
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

  if (result.columns.length === 0) {
    return (
      <View style={{ padding: 20, color: theme.pageTextSubdued }}>
        <Trans>No data</Trans>
      </View>
    );
  }

  return (
    <View style={{ overflow: 'auto', maxHeight: compact ? 300 : '100%' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            {result.columns.map(col => (
              <th
                key={col.name}
                onClick={() => handleSort(col.name)}
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  borderBottom: `2px solid ${theme.tableBorder}`,
                  backgroundColor: theme.tableHeaderBackground,
                  color: theme.tableHeaderText,
                  fontWeight: 600,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.name}
                {sortState.column === col.name && sortState.direction && (
                  <span style={{ marginLeft: 4 }}>
                    {sortState.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, idx) => (
            <tr
              key={idx}
              style={{
                backgroundColor:
                  idx % 2 === 0 ? theme.tableBackground : theme.pageBackground,
              }}
            >
              {result.columns.map(col => (
                <td
                  key={col.name}
                  style={{
                    padding: '6px 12px',
                    borderBottom: `1px solid ${theme.tableBorder}`,
                    color: theme.tableText,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatCellValue(row[col.name], col.type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {hasMoreRows && (
        <View
          style={{
            padding: '8px 12px',
            textAlign: 'center',
            color: theme.pageTextSubdued,
            fontSize: 12,
          }}
        >
          {sortedRows.length - 5} more rows
        </View>
      )}
    </View>
  );
}
