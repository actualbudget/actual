import type {
  TransactionColumnId,
  TransactionColumnWidths,
  VisibleTransactionColumn,
} from './types';
import { TRANSACTION_DATA_COLUMN_ORDER } from './transactionTableColumns';

type PersistedColumnWidths = {
  version: 2;
  widths: Partial<TransactionColumnWidths>;
  originalWidths?: Partial<TransactionColumnWidths>;
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

type ResetColumnWidthArgs = {
  widths: TransactionColumnWidths;
  visibleColumns: VisibleTransactionColumn[];
  columnId: TransactionColumnId;
  originalWidths?: Partial<TransactionColumnWidths>;
};

function roundWidth(value: number) {
  return Math.round(value);
}

export function parseTransactionColumnWidthsPref(
  value: string | undefined,
): {
  widths: Partial<TransactionColumnWidths>;
  originalWidths: Partial<TransactionColumnWidths>;
} {
  if (!value) {
    return { widths: {}, originalWidths: {} };
  }

  try {
    const parsed = JSON.parse(value) as
      | PersistedColumnWidths
      | {
          version: 1;
          widths: Partial<TransactionColumnWidths>;
        };
    if (!parsed || typeof parsed !== 'object') {
      return { widths: {}, originalWidths: {} };
    }

    const parseWidthsRecord = (
      record: Partial<TransactionColumnWidths> | undefined,
    ) =>
      Object.entries(record ?? {}).reduce<
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

    return {
      widths: parseWidthsRecord(parsed.widths),
      originalWidths:
        parsed.version === 2 ? parseWidthsRecord(parsed.originalWidths) : {},
    };
  } catch {
    return { widths: {}, originalWidths: {} };
  }
}

export function serializeTransactionColumnWidthsPref(
  widths: Partial<TransactionColumnWidths>,
  originalWidths: Partial<TransactionColumnWidths> = {},
) {
  return JSON.stringify({
    version: 2,
    widths,
    originalWidths,
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

function getResizePair(
  visibleColumns: VisibleTransactionColumn[],
  activeColumnId: TransactionColumnId,
) {
  const activeIndex = visibleColumns.findIndex(column => column.id === activeColumnId);
  if (activeIndex === -1) {
    return null;
  }

  const nextNeighbor = visibleColumns[activeIndex + 1];
  if (nextNeighbor) {
    return {
      activeColumn: visibleColumns[activeIndex],
      neighborColumn: nextNeighbor,
      deltaSign: 1,
    };
  }

  const previousNeighbor = visibleColumns[activeIndex - 1];
  if (previousNeighbor) {
    return {
      activeColumn: visibleColumns[activeIndex],
      neighborColumn: previousNeighbor,
      deltaSign: -1,
    };
  }

  return null;
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
  const resizePair = getResizePair(visibleColumns, activeColumnId);
  if (!resizePair) {
    return widths;
  }

  const { activeColumn, neighborColumn, deltaSign } = resizePair;
  const adjustedDelta = delta * deltaSign;

  const pairWidth = widths[activeColumn.id] + widths[neighborColumn.id];
  const minActiveWidth = activeColumn.minWidth;
  const minNeighborWidth = neighborColumn.minWidth;
  const maxActiveWidth = pairWidth - minNeighborWidth;

  const nextActiveWidth = Math.max(
    minActiveWidth,
    Math.min(maxActiveWidth, roundWidth(widths[activeColumn.id] + adjustedDelta)),
  );
  const nextNeighborWidth = pairWidth - nextActiveWidth;

  return {
    ...widths,
    [activeColumn.id]: nextActiveWidth,
    [neighborColumn.id]: nextNeighborWidth,
  };
}

export function resetTransactionColumnWidth({
  widths,
  visibleColumns,
  columnId,
  originalWidths,
}: ResetColumnWidthArgs): TransactionColumnWidths {
  const activeColumn = visibleColumns.find(column => column.id === columnId);
  if (!activeColumn) {
    return widths;
  }

  const targetWidth = Math.max(
    activeColumn.minWidth,
    roundWidth(originalWidths?.[columnId] ?? activeColumn.defaultWidth),
  );
  const delta = targetWidth - widths[columnId];

  if (delta === 0) {
    return widths;
  }

  return applyNeighborColumnResize({
    widths,
    visibleColumns,
    activeColumnId: columnId,
    delta,
  });
}
