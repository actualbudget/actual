import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { useSyncedPref } from '#hooks/useSyncedPref';

import { debugLog } from './debugLog';
import {
  applyNeighborColumnResize,
  getVisibleColumnsWidth,
  getVisibleNeighborColumnId,
  parseTransactionColumnWidthsPref,
  resetTransactionColumnWidth,
  resolveTransactionColumnWidths,
  serializeTransactionColumnWidthsPref,
} from './transactionTableColumnLayout';
import {
  getTransactionTableUtilityWidth,
  getTransactionTableVariantKey,
  getVisibleTransactionColumns,
} from './transactionTableColumns';
import type {
  TransactionColumnId,
  TransactionColumnWidths,
  TransactionTableVariantKey,
} from './types';

type UseTransactionTableColumnLayoutArgs = {
  containerWidth: number;
  showAccount: boolean;
  showBalances: boolean;
  showCategory: boolean;
  showCleared: boolean;
  showSelection: boolean;
};

type ResizeState = {
  activeColumnId: TransactionColumnId;
  startClientX: number;
  startWidths: TransactionColumnWidths;
};

type TransactionTableColumnWidthsPrefKey =
  `transaction-table-column-widths-${string}`;

type ResizeHandleProps = {
  isResizable: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>, measuredWidths?: TransactionColumnWidths) => void;
};

export function useTransactionTableColumnLayout({
  containerWidth,
  showAccount,
  showBalances,
  showCategory,
  showCleared,
  showSelection,
}: UseTransactionTableColumnLayoutArgs) {
  const variantKey = getTransactionTableVariantKey({
    showAccount,
    showBalances,
    showCategory,
    showCleared,
    showSelection,
  }) as TransactionTableVariantKey;
  const prefKey =
    `transaction-table-column-widths-${variantKey}` as TransactionTableColumnWidthsPrefKey;
  const [persistedValue, setPersistedValue] = useSyncedPref(prefKey);
  const [draftWidths, setDraftWidths] =
    useState<Partial<TransactionColumnWidths> | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const draftWidthsRef = useRef<Partial<TransactionColumnWidths> | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const previousContainerWidthRef = useRef<number | null>(null);
  const visibleColumns = useMemo(
    () =>
      getVisibleTransactionColumns({
        showAccount,
        showBalances,
        showCategory,
      }),
    [showAccount, showBalances, showCategory],
  );
  const utilityWidth = useMemo(
    () =>
      getTransactionTableUtilityWidth({
        showCleared,
        showSelection,
      }),
    [showCleared, showSelection],
  );
  const parsedPersistedLayout = useMemo(
    () => parseTransactionColumnWidthsPref(persistedValue),
    [persistedValue],
  );
  const persistedWidths = parsedPersistedLayout.widths;
  const persistedOriginalWidths = parsedPersistedLayout.originalWidths;
  const activeWidths = draftWidths ?? persistedWidths;
  const availableDataWidth =
    containerWidth > 0 ? Math.max(containerWidth - utilityWidth, 0) : null;
  const columnWidths = useMemo(
    () =>
      resolveTransactionColumnWidths({
        visibleColumns,
        savedWidths: activeWidths,
        availableWidth: availableDataWidth,
      }),
    [activeWidths, availableDataWidth, visibleColumns],
  );
  const tableWidth = useMemo(
    () => utilityWidth + getVisibleColumnsWidth(columnWidths, visibleColumns),
    [columnWidths, utilityWidth, visibleColumns],
  );

  draftWidthsRef.current = draftWidths;

  useEffect(() => {
    if (!resizeStateRef.current) {
      setDraftWidths(null);
    }
  }, [persistedValue, variantKey]);

  useEffect(() => {
    if (!containerWidth) {
      return;
    }

    const previousContainerWidth = previousContainerWidthRef.current;
    previousContainerWidthRef.current = containerWidth;

    if (
      previousContainerWidth == null ||
      previousContainerWidth === containerWidth ||
      isResizing
    ) {
      return;
    }

    resizeStateRef.current = null;
    setIsResizing(false);
    setDraftWidths(null);
    setPersistedValue(serializeTransactionColumnWidthsPref({}));
  }, [containerWidth, isResizing, setPersistedValue]);

  useEffect(() => {
    if (!isResizing || !resizeStateRef.current) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const resizeState = resizeStateRef.current;
      if (!resizeState) {
        return;
      }

      const delta = event.clientX - resizeState.startClientX;
      setDraftWidths(
        applyNeighborColumnResize({
          widths: resizeState.startWidths,
          visibleColumns,
          activeColumnId: resizeState.activeColumnId,
          delta,
        }),
      );
    }

    function handlePointerUp() {
      const resizeState = resizeStateRef.current;
      if (!resizeState) {
        return;
      }

      resizeStateRef.current = null;
      setIsResizing(false);
      const nextWidths = draftWidthsRef.current ?? resizeState.startWidths;
      const originalWidths =
        Object.keys(persistedOriginalWidths).length > 0
          ? persistedOriginalWidths
          : resizeState.startWidths;
      setPersistedValue(
        serializeTransactionColumnWidthsPref(nextWidths, originalWidths),
      );
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing, persistedOriginalWidths, setPersistedValue, visibleColumns]);

  function beginResize(
    activeColumnId: TransactionColumnId,
    clientX: number,
    measuredWidths?: TransactionColumnWidths,
  ) {
    let startWidths = resolveTransactionColumnWidths({
      visibleColumns,
      savedWidths: activeWidths,
      availableWidth: availableDataWidth,
    });

    debugLog('RESIZE_START_INITIAL', {
      activeColumnId,
      containerWidth,
      utilityWidth,
      availableDataWidth,
      startWidths,
      measuredWidths,
      visibleColumns: visibleColumns.map(c => ({
        id: c.id,
        defaultWidth: c.defaultWidth,
        minWidth: c.minWidth,
      })),
    });

    // Always ensure columns fill available space to prevent gaps
    if (measuredWidths && availableDataWidth !== null && visibleColumns.length > 0) {
      // Use measured widths as the base
      const updatedWidths = { ...startWidths };
      visibleColumns.forEach(column => {
        const measured = measuredWidths[column.id];
        if (measured !== undefined && typeof measured === 'number') {
          updatedWidths[column.id] = measured;
        }
      });

      let totalCalculated = visibleColumns.reduce((sum, col) => {
        const w = updatedWidths[col.id];
        return sum + (typeof w === 'number' ? w : 0);
      }, 0);

      const difference = availableDataWidth - totalCalculated;

      // Simply add any difference to the last visible column
      if (difference !== 0) {
        const lastColumn = visibleColumns[visibleColumns.length - 1];
        const lastColumnWidth = updatedWidths[lastColumn.id] as number;
        updatedWidths[lastColumn.id] = Math.max(
          lastColumn.minWidth,
          lastColumnWidth + difference,
        );

        totalCalculated = visibleColumns.reduce((sum, col) => {
          const w = updatedWidths[col.id];
          return sum + (typeof w === 'number' ? w : 0);
        }, 0);
      }

      debugLog('RESIZE_FLEX_CONVERTED', {
        measuredWidths,
        updatedWidths,
        totalCalculated,
        availableDataWidth,
        difference,
        adjustedColumn: visibleColumns[visibleColumns.length - 1]?.id,
      });

      startWidths = updatedWidths;
    } else {
      // Fallback: Calculate flex columns mathematically (old approach)
      const fixedColumnsWidth = visibleColumns.reduce((total, col) => {
        const width = startWidths[col.id];
        return width === 'flex' ? total : total + (width as number);
      }, 0);

      const flexColumns = visibleColumns.filter(
        col => startWidths[col.id] === 'flex',
      );

      if (flexColumns.length > 0 && availableDataWidth) {
        const totalFlexSpace = availableDataWidth - fixedColumnsWidth;
        const baseFlexColumnWidth = Math.floor(
          totalFlexSpace / flexColumns.length,
        );
        const remainder =
          totalFlexSpace - baseFlexColumnWidth * flexColumns.length;

        const updatedWidths = { ...startWidths };
        flexColumns.forEach((column, index) => {
          updatedWidths[column.id] =
            baseFlexColumnWidth + (index < remainder ? 1 : 0);
        });

        debugLog('RESIZE_FLEX_CONVERTED', {
          fixedColumnsWidth,
          totalFlexSpace,
          baseFlexColumnWidth,
          remainder,
          flexColumns: flexColumns.map((c, i) => ({
            id: c.id,
            width: baseFlexColumnWidth + (i < remainder ? 1 : 0),
          })),
          totalCalculated:
            fixedColumnsWidth +
            flexColumns.reduce(
              (sum, _, i) => sum + baseFlexColumnWidth + (i < remainder ? 1 : 0),
              0,
            ),
        });

        startWidths = updatedWidths;
      }
    }

    resizeStateRef.current = {
      activeColumnId,
      startClientX: clientX,
      startWidths,
    };
    setIsResizing(true);
    setDraftWidths(startWidths);
  }

  function getResizeHandleProps(
    columnId: TransactionColumnId,
  ): ResizeHandleProps {
    const isResizable = !!getVisibleNeighborColumnId(visibleColumns, columnId);

    return {
      isResizable,
      onPointerDown: (event, measuredWidths) => {
        if (!isResizable) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        beginResize(columnId, event.clientX, measuredWidths);
      },
    };
  }

  function resetColumnWidth(columnId: TransactionColumnId) {
    const nextWidths = resetTransactionColumnWidth({
      widths: columnWidths,
      visibleColumns,
      columnId,
      originalWidths: persistedOriginalWidths,
    });
    resizeStateRef.current = null;
    setIsResizing(false);
    setDraftWidths(null);
    setPersistedValue(
      serializeTransactionColumnWidthsPref(nextWidths, persistedOriginalWidths),
    );
  }

  function resetAllColumnWidths() {
    resizeStateRef.current = null;
    setIsResizing(false);
    setDraftWidths(null);
    setPersistedValue(serializeTransactionColumnWidthsPref({}));
  }

  return {
    columnWidths,
    tableWidth,
    variantKey,
    visibleColumns,
    getResizeHandleProps,
    resetAllColumnWidths,
    resetColumnWidth,
  };
}
