import type {
  TransactionColumnId,
  TransactionColumnWidths,
  VisibleTransactionColumn,
} from './types';
import { TRANSACTION_DATA_COLUMN_ORDER } from './transactionTableColumns';

type PersistedColumnWidths = {
  version: 1;
  widths: Partial<TransactionColumnWidths>;
};

type ResolveColumnWidthsArgs = {
  visibleColumns: VisibleTransactionColumn[];
  savedWidths?: Partial<TransactionColumnWidths>;
  availableWidth?: number | null;
};

type ApplyNeighborResizeArgs = {
  widths: TransactionColumnWidths;
  visibleColumns: VisibleTransactionColumn[];
  activeColumnId: TransactionColumnId;
  delta: number;
};

function roundWidth(value: number) {
  return Math.round(value);
}

export function parseTransactionColumnWidthsPref(
  value: string | undefined,
): Partial<TransactionColumnWidths> {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as PersistedColumnWidths;
    if (parsed?.version !== 1 || !parsed.widths || typeof parsed.widths !== 'object') {
      return {};
    }

    const widths = Object.entries(parsed.widths).reduce<
      Partial<TransactionColumnWidths>
    >((memo, [columnId, width]) => {
      if (typeof width !== 'number' || !Number.isFinite(width)) {
        return memo;
      }

      if (!TRANSACTION_DATA_COLUMN_ORDER.includes(columnId as TransactionColumnId)) {
        return memo;
      }

      memo[columnId as TransactionColumnId] = roundWidth(width);
      return memo;
    }, {});

    return widths;
  } catch {
    return {};
  }
}

export function serializeTransactionColumnWidthsPref(
  widths: Partial<TransactionColumnWidths>,
) {
  return JSON.stringify({
    version: 1,
    widths,
  } satisfies PersistedColumnWidths);
}

export function getVisibleNeighborColumnId(
  visibleColumns: VisibleTransactionColumn[],
  activeColumnId: TransactionColumnId,
) {
  const columnIndex = visibleColumns.findIndex(column => column.id === activeColumnId);
  if (columnIndex === -1) {
    return null;
  }

  return visibleColumns[columnIndex + 1]?.id ?? null;
}

export function getVisibleColumnsWidth(
  widths: TransactionColumnWidths,
  visibleColumns: VisibleTransactionColumn[],
) {
  return visibleColumns.reduce(
    (total, column) => total + widths[column.id],
    0,
  );
}

function distributeExtraWidth(
  widths: TransactionColumnWidths,
  visibleColumns: VisibleTransactionColumn[],
  extraWidth: number,
) {
  if (extraWidth <= 0 || visibleColumns.length === 0) {
    return widths;
  }

  const totalWeight = visibleColumns.reduce(
    (sum, column) => sum + column.defaultWidth,
    0,
  );

  let remainingExtra = extraWidth;
  const nextWidths = { ...widths };

  visibleColumns.forEach((column, index) => {
    const share =
      index === visibleColumns.length - 1
        ? remainingExtra
        : roundWidth((extraWidth * column.defaultWidth) / totalWeight);

    nextWidths[column.id] += share;
    remainingExtra -= share;
  });

  return nextWidths;
}

export function resolveTransactionColumnWidths({
  visibleColumns,
  savedWidths,
  availableWidth,
}: ResolveColumnWidthsArgs): TransactionColumnWidths {
  const baseWidths = visibleColumns.reduce<TransactionColumnWidths>(
    (memo, column) => {
      memo[column.id] = roundWidth(savedWidths?.[column.id] ?? column.defaultWidth);
      return memo;
    },
    {} as TransactionColumnWidths,
  );

  if (!availableWidth || availableWidth <= 0) {
    return baseWidths;
  }

  const baseTotal = getVisibleColumnsWidth(baseWidths, visibleColumns);
  if (baseTotal >= availableWidth) {
    return baseWidths;
  }

  return distributeExtraWidth(baseWidths, visibleColumns, availableWidth - baseTotal);
}

export function applyNeighborColumnResize({
  widths,
  visibleColumns,
  activeColumnId,
  delta,
}: ApplyNeighborResizeArgs): TransactionColumnWidths {
  const neighborColumnId = getVisibleNeighborColumnId(visibleColumns, activeColumnId);
  if (!neighborColumnId) {
    return widths;
  }

  const activeColumn = visibleColumns.find(column => column.id === activeColumnId);
  const neighborColumn = visibleColumns.find(
    column => column.id === neighborColumnId,
  );

  if (!activeColumn || !neighborColumn) {
    return widths;
  }

  const pairWidth = widths[activeColumnId] + widths[neighborColumnId];
  const minActiveWidth = activeColumn.minWidth;
  const minNeighborWidth = neighborColumn.minWidth;
  const maxActiveWidth = pairWidth - minNeighborWidth;

  const nextActiveWidth = Math.max(
    minActiveWidth,
    Math.min(maxActiveWidth, roundWidth(widths[activeColumnId] + delta)),
  );
  const nextNeighborWidth = pairWidth - nextActiveWidth;

  return {
    ...widths,
    [activeColumnId]: nextActiveWidth,
    [neighborColumnId]: nextNeighborWidth,
  };
}
