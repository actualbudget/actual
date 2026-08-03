import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode, RefObject } from 'react';

import { useLocalStorage } from 'usehooks-ts';

import { useMetadataPref } from './useMetadataPref';

export const MIN_COLUMN_WIDTH = 30;

function buildWidths(
  defaultWidths: Record<string, number | 'flex'>,
  savedWidths: Record<string, number> | undefined,
): Record<string, number | 'flex'> {
  const initial: Record<string, number | 'flex'> = { ...defaultWidths };
  if (savedWidths) {
    for (const [name, width] of Object.entries(savedWidths)) {
      // Ignore unknown columns and values that would render invalid CSS
      // (NaN, Infinity, strings, etc.) and enforce the minimum width
      if (
        name in defaultWidths &&
        typeof width === 'number' &&
        Number.isFinite(width)
      ) {
        initial[name] = Math.max(MIN_COLUMN_WIDTH, width);
      }
    }
  }
  return initial;
}

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

const ColumnWidthsContext = createContext<ColumnWidthsContextValue | null>(
  null,
);

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

  const [widths, setWidths] = useState<Record<string, number | 'flex'>>(() =>
    buildWidths(defaultWidths, savedWidths),
  );

  // Re-hydrate when the storage key changes (e.g. the user switches
  // budgets) or when the saved widths are updated externally
  useEffect(() => {
    setWidths(buildWidths(defaultWidths, savedWidths));
  }, [defaultWidths, savedWidths]);

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

  // Find the column visually adjacent to `columnName` that gets compensated
  // when it is resized. Only fixed-width columns are returned: flex columns
  // reflow automatically to fill the space a neighbor takes, so pinning them
  // to a pixel width would strip their flex semantics.
  const findNeighbor = useCallback(
    (columnName: string): string | null => {
      const idx = columnOrder.indexOf(columnName);
      if (idx === -1) return null;

      const next = columnOrder[idx + 1];
      if (next !== undefined && typeof widths[next] === 'number') return next;
      const prev = columnOrder[idx - 1];
      if (prev !== undefined && typeof widths[prev] === 'number') return prev;
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
      const cell = el.querySelector<HTMLElement>(`[data-column="${name}"]`);
      const measured = cell?.getBoundingClientRect().width;
      // A flex column may not have been laid out yet (or be measured as 0
      // in tests); fall back to a sane default rather than a 0px width
      return measured ? measured : 100;
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

  const onResize = useCallback((_columnName: string, currentX: number) => {
    const el = containerRef.current;
    const drag = dragRef.current;
    if (!el || !drag) return;

    const delta = currentX - drag.startX;
    // The source column can only grow by as much as the neighbor can
    // shrink, preserving the total width of the two columns
    const maxWidth = drag.neighborName
      ? drag.startWidth + (drag.neighborStartWidth - MIN_COLUMN_WIDTH)
      : Number.POSITIVE_INFINITY;
    const newWidth = Math.min(
      Math.max(MIN_COLUMN_WIDTH, drag.startWidth + delta),
      maxWidth,
    );

    el.style.setProperty(`--col-${drag.columnName}-width`, `${newWidth}px`);

    if (drag.neighborName) {
      const neighborWidth =
        drag.neighborStartWidth - (newWidth - drag.startWidth);
      el.style.setProperty(
        `--col-${drag.neighborName}-width`,
        `${neighborWidth}px`,
      );
    }
  }, []);

  const onResizeEnd = useCallback(() => {
    const el = containerRef.current;
    const drag = dragRef.current;
    if (!el || !drag) return;

    const finalWidth = parseFloat(
      el.style.getPropertyValue(`--col-${drag.columnName}-width`),
    );
    if (!Number.isFinite(finalWidth)) {
      dragRef.current = null;
      return;
    }

    const updated: Record<string, number> = {
      ...(savedWidths || {}),
      [drag.columnName]: finalWidth,
    };

    const neighborIsFinite =
      drag.neighborName != null &&
      Number.isFinite(
        parseFloat(
          el.style.getPropertyValue(`--col-${drag.neighborName}-width`),
        ),
      );
    let neighborFinalWidth = 0;
    if (drag.neighborName && neighborIsFinite) {
      neighborFinalWidth = parseFloat(
        el.style.getPropertyValue(`--col-${drag.neighborName}-width`),
      );
      updated[drag.neighborName] = neighborFinalWidth;
    }

    setWidths(prev => {
      const next = { ...prev, [drag.columnName]: finalWidth };
      if (drag.neighborName && neighborIsFinite) {
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
      // Deleting the override (rather than storing the default) lets future
      // changes to the default widths apply to columns that were never
      // explicitly resized
      const updated = { ...(savedWidths || {}) };
      delete updated[columnName];

      if (defaultVal === 'flex') {
        el.style.removeProperty(`--col-${columnName}-width`);
        setWidths(prev => ({ ...prev, [columnName]: 'flex' }));
      } else if (typeof defaultVal === 'number') {
        el.style.setProperty(`--col-${columnName}-width`, `${defaultVal}px`);
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
          [data-resize-handle]:hover,
          [data-resize-handle]:focus-visible {
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
