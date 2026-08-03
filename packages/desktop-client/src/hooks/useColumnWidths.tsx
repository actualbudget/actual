import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode, RefObject } from 'react';
import { useLocalStorage } from 'usehooks-ts';

import { useMetadataPref } from './useMetadataPref';

const MIN_COLUMN_WIDTH = 30;

type ColumnWidthsContextValue = {
  widths: Record<string, number | 'flex'>;
  columnOrder: string[];
  defaultWidths: Record<string, number | 'flex'>;
  containerRef: RefObject<HTMLDivElement | null>;
  setContainerRef: (el: HTMLDivElement | null) => void;
  onResizeStart: (columnName: string, startX: number) => void;
  onResize: (columnName: string, currentX: number) => void;
  onResizeEnd: () => void;
  onResetWidth: (columnName: string) => void;
};

const ColumnWidthsContext = createContext<ColumnWidthsContextValue | null>(null);

export function useColumnWidthsContext() {
  return useContext(ColumnWidthsContext);
}

type ColumnWidthsProviderProps = {
  tableId: string;
  defaultWidths: Record<string, number | 'flex'>;
  columnOrder: string[];
  children: ReactNode;
};

export function ColumnWidthsProvider({
  tableId,
  defaultWidths,
  columnOrder,
  children,
}: ColumnWidthsProviderProps) {
  const [budgetId] = useMetadataPref('id');

  const [savedWidths, setSavedWidths] = useLocalStorage<
    Record<string, number> | undefined
  >(`${budgetId}-columnWidths-${tableId}`, undefined, {
    deserializer: JSON.parse,
    serializer: JSON.stringify,
  });

  const [widths, setWidths] = useState<Record<string, number | 'flex'>>(() => {
    const initial: Record<string, number | 'flex'> = { ...defaultWidths };
    if (savedWidths) {
      for (const [name, width] of Object.entries(savedWidths)) {
        if (name in defaultWidths) {
          initial[name] = width;
        }
      }
    }
    return initial;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    columnName: string;
    startWidth: number;
    startX: number;
    neighborName: string | null;
    neighborStartWidth: number;
  } | null>(null);

  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
  }, []);

  const findNeighbor = useCallback(
    (columnName: string): string | null => {
      const idx = columnOrder.indexOf(columnName);
      if (idx === -1) return null;

      for (let i = idx + 1; i < columnOrder.length; i++) {
        if (columnOrder[i] in widths) return columnOrder[i];
      }
      for (let i = idx - 1; i >= 0; i--) {
        if (columnOrder[i] in widths) return columnOrder[i];
      }
      return null;
    },
    [columnOrder, widths],
  );

  const getColumnWidth = useCallback(
    (name: string): number => {
      const el = containerRef.current;
      if (!el) return 100;
      const val = el.style.getPropertyValue(`--col-${name}-width`);
      if (val) return parseFloat(val);
      const w = widths[name];
      if (typeof w === 'number') return w;
      const cell = el.querySelector(
        `[data-column="${name}"]`,
      ) as HTMLElement | null;
      return cell?.getBoundingClientRect().width ?? 100;
    },
    [widths],
  );

  const onResizeStart = useCallback(
    (columnName: string, startX: number) => {
      const el = containerRef.current;
      if (!el) return;

      const startWidth = getColumnWidth(columnName);
      const neighborName = findNeighbor(columnName);
      const neighborStartWidth = neighborName
        ? getColumnWidth(neighborName)
        : 0;

      dragRef.current = {
        columnName,
        startWidth,
        startX,
        neighborName,
        neighborStartWidth,
      };

      el.style.setProperty(`--col-${columnName}-width`, `${startWidth}px`);
      if (neighborName) {
        el.style.setProperty(
          `--col-${neighborName}-width`,
          `${neighborStartWidth}px`,
        );
      }

      setWidths(prev => {
        const next = { ...prev, [columnName]: startWidth };
        if (neighborName) next[neighborName] = neighborStartWidth;
        return next;
      });
    },
    [findNeighbor, getColumnWidth],
  );

  const onResize = useCallback(
    (_columnName: string, currentX: number) => {
      const el = containerRef.current;
      const drag = dragRef.current;
      if (!el || !drag) return;

      const delta = currentX - drag.startX;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, drag.startWidth + delta);

      el.style.setProperty(`--col-${drag.columnName}-width`, `${newWidth}px`);

      if (drag.neighborName) {
        const effectiveDelta = newWidth - drag.startWidth;
        const neighborWidth = Math.max(
          MIN_COLUMN_WIDTH,
          drag.neighborStartWidth - effectiveDelta,
        );
        el.style.setProperty(
          `--col-${drag.neighborName}-width`,
          `${neighborWidth}px`,
        );
      }
    },
    [],
  );

  const onResizeEnd = useCallback(() => {
    const el = containerRef.current;
    const drag = dragRef.current;
    if (!el || !drag) return;

    const finalWidth = parseFloat(
      el.style.getPropertyValue(`--col-${drag.columnName}-width`),
    );
    const updated: Record<string, number> = {
      ...(savedWidths || {}),
      [drag.columnName]: finalWidth,
    };

    let neighborFinalWidth = 0;
    if (drag.neighborName) {
      neighborFinalWidth = parseFloat(
        el.style.getPropertyValue(`--col-${drag.neighborName}-width`),
      );
      updated[drag.neighborName] = neighborFinalWidth;
    }

    setWidths(prev => {
      const next = { ...prev, [drag.columnName]: finalWidth };
      if (drag.neighborName) {
        next[drag.neighborName] = neighborFinalWidth;
      }
      return next;
    });

    setSavedWidths(updated);
    dragRef.current = null;
  }, [savedWidths, setSavedWidths]);

  const onResetWidth = useCallback(
    (columnName: string) => {
      const el = containerRef.current;
      if (!el) return;

      const defaultVal = defaultWidths[columnName];
      const updated = { ...(savedWidths || {}) };

      if (defaultVal === 'flex') {
        el.style.removeProperty(`--col-${columnName}-width`);
        delete updated[columnName];
        setWidths(prev => ({ ...prev, [columnName]: 'flex' }));
      } else {
        el.style.setProperty(
          `--col-${columnName}-width`,
          `${defaultVal as number}px`,
        );
        updated[columnName] = defaultVal as number;
        setWidths(prev => ({ ...prev, [columnName]: defaultVal }));
      }

      setSavedWidths(updated);
    },
    [defaultWidths, savedWidths, setSavedWidths],
  );

  const value = useMemo(
    () => ({
      widths,
      columnOrder,
      defaultWidths,
      containerRef,
      setContainerRef,
      onResizeStart,
      onResize,
      onResizeEnd,
      onResetWidth,
    }),
    [
      widths,
      columnOrder,
      defaultWidths,
      setContainerRef,
      onResizeStart,
      onResize,
      onResizeEnd,
      onResetWidth,
    ],
  );

  return (
    <ColumnWidthsContext.Provider value={value}>
      <div
        ref={setContainerRef}
        style={{
          display: 'contents',
          ...Object.fromEntries(
            Object.entries(widths)
              .filter(([, w]) => typeof w === 'number')
              .map(([name, w]) => [`--col-${name}-width`, `${w}px`]),
          ),
        }}
      >
        <style>{`
          [data-resize-handle] {
            opacity: 0;
            transition: opacity 0.15s ease;
          }
          [data-resize-handle]:hover {
            opacity: 1;
          }
          [data-column]:hover > [data-resize-handle] {
            opacity: 0.5;
          }
          [data-column]:hover > [data-resize-handle]:hover {
            opacity: 1;
          }
        `}</style>
        {children}
      </div>
    </ColumnWidthsContext.Provider>
  );
}
