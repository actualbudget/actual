import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode, RefObject } from 'react';

import { css } from '@emotion/css';

import { useSyncedPref } from './useSyncedPref';

export const MIN_COLUMN_WIDTH = 30;
export const FALLBACK_COLUMN_WIDTH = 100;

// The handle is visible while the column is hovered or the handle is
// focused. These styles apply only to elements inside the provider, so
// other tables are unaffected.
const resizeHandleStyles = css`
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
`;

function parseWidthsPref(
  pref: string | undefined,
): Record<string, number> | undefined {
  if (pref == null || pref === '') return undefined;
  try {
    const parsed: unknown = JSON.parse(pref);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return undefined;
    }
    return parsed as Record<string, number>;
  } catch {
    return undefined;
  }
}

function buildWidths(
  defaultWidths: Record<string, number | 'flex'>,
  savedWidths: Record<string, number> | undefined,
): Record<string, number | 'flex'> {
  const initial: Record<string, number | 'flex'> = { ...defaultWidths };
  if (savedWidths) {
    for (const [name, width] of Object.entries(savedWidths)) {
      // Ignore unknown columns and values that render invalid CSS
      // (NaN, Infinity, strings, and more) and enforce the minimum width
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

export type ColumnWidthsContextValue = {
  widths: Record<string, number | 'flex'>;
  containerRef: RefObject<HTMLDivElement | null>;
  setContainerRef: (el: HTMLDivElement | null) => void;
  getColumnWidth: (columnName: string) => number;
  setColumnWidth: (columnName: string, width: number) => void;
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
  children: ReactNode;
};

export function ColumnWidthsProvider({
  tableId,
  defaultWidths,
  children,
}: ColumnWidthsProviderProps) {
  // Synced prefs are strings, and the widths map is JSON-encoded. Parsing
  // is memoized because the rehydrate effect below depends on its
  // identity — a fresh object every render re-runs the effect, and
  // setWidths, on every render.
  const [savedWidthsPref, setSavedWidthsPref] = useSyncedPref(
    `column-widths-${tableId}`,
  );
  const savedWidths = useMemo(
    () => parseWidthsPref(savedWidthsPref),
    [savedWidthsPref],
  );

  const [widths, setWidths] = useState<Record<string, number | 'flex'>>(() =>
    buildWidths(defaultWidths, savedWidths),
  );

  // The widths re-hydrate when the pref changes, for example when the
  // user switches budgets or resizes a column from another device.
  useEffect(() => {
    setWidths(buildWidths(defaultWidths, savedWidths));
  }, [defaultWidths, savedWidths]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    columnName: string;
    startWidth: number;
    startX: number;
    width: number;
  } | null>(null);

  const setContainerRef = (el: HTMLDivElement | null) => {
    containerRef.current = el;
  };

  // The width to start a resize from is the live CSS variable, or the
  // state value, or the default width. The CSS variable wins when a drag
  // is in progress or a width was already applied. Flex columns have no
  // pixel width, so they use the default.
  const getColumnWidth = (name: string): number => {
    const el = containerRef.current;
    if (el) {
      const val = el.style.getPropertyValue(`--col-${name}-width`);
      if (val) return parseFloat(val);
    }
    const w = widths[name];
    return typeof w === 'number' ? w : FALLBACK_COLUMN_WIDTH;
  };

  // The single write path for a column width: clamp, update the live CSS
  // variable, update state, and (optionally) persist the override
  const applyWidth = (columnName: string, width: number, persist: boolean) => {
    const clamped = Math.max(MIN_COLUMN_WIDTH, width);
    const el = containerRef.current;
    if (el) {
      el.style.setProperty(`--col-${columnName}-width`, `${clamped}px`);
    }
    setWidths(prev => ({ ...prev, [columnName]: clamped }));
    if (persist) {
      setSavedWidthsPref(
        JSON.stringify({ ...(savedWidths || {}), [columnName]: clamped }),
      );
    }
  };

  const setColumnWidth = (columnName: string, width: number) => {
    applyWidth(columnName, width, true);
  };

  const onResizeStart = (columnName: string, startX: number) => {
    const startWidth = getColumnWidth(columnName);
    dragRef.current = { columnName, startWidth, startX, width: startWidth };
    applyWidth(columnName, startWidth, false);
  };

  const onResize = (_columnName: string, currentX: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    const newWidth = Math.max(
      MIN_COLUMN_WIDTH,
      drag.startWidth + (currentX - drag.startX),
    );
    drag.width = newWidth;
    const el = containerRef.current;
    if (el) {
      el.style.setProperty(`--col-${drag.columnName}-width`, `${newWidth}px`);
    }
  };

  const onResizeEnd = () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    applyWidth(drag.columnName, drag.width, true);
  };

  const onResetWidth = (columnName: string) => {
    const defaultVal = defaultWidths[columnName];
    // Deleting the override (rather than storing the default) lets future
    // changes to the default widths apply to columns that were never
    // explicitly resized
    const updated = { ...(savedWidths || {}) };
    delete updated[columnName];
    setSavedWidthsPref(JSON.stringify(updated));

    if (defaultVal === 'flex') {
      const el = containerRef.current;
      if (el) {
        el.style.removeProperty(`--col-${columnName}-width`);
      }
      setWidths(prev => ({ ...prev, [columnName]: 'flex' }));
    } else if (typeof defaultVal === 'number') {
      applyWidth(columnName, defaultVal, false);
    }
  };

  const value = {
    widths,
    containerRef,
    setContainerRef,
    getColumnWidth,
    setColumnWidth,
    onResizeStart,
    onResize,
    onResizeEnd,
    onResetWidth,
  };

  return (
    <ColumnWidthsContext.Provider value={value}>
      <div
        ref={setContainerRef}
        className={resizeHandleStyles}
        style={{
          display: 'contents',
          ...Object.fromEntries(
            Object.entries(widths)
              .filter(([, w]) => typeof w === 'number')
              .map(([name, w]) => [`--col-${name}-width`, `${w}px`]),
          ),
        }}
      >
        {children}
      </div>
    </ColumnWidthsContext.Provider>
  );
}
