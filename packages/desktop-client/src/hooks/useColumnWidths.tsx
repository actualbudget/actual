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

// The default floor a column can never shrink below, in px. Individual
// columns can override this with the provider's `minWidths` map.
export const MIN_COLUMN_WIDTH = 50;
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
  minWidths: Record<string, number> | undefined,
): Record<string, number | 'flex'> {
  const initial: Record<string, number | 'flex'> = { ...defaultWidths };
  if (savedWidths) {
    for (const [name, width] of Object.entries(savedWidths)) {
      // Ignore unknown columns and values that render invalid CSS
      // (NaN, Infinity, strings, and more) and enforce the column's floor
      if (
        name in defaultWidths &&
        typeof width === 'number' &&
        Number.isFinite(width)
      ) {
        initial[name] = Math.max(minWidths?.[name] ?? MIN_COLUMN_WIDTH, width);
      }
    }
  }
  return initial;
}

// Distribute a divider drag across the columns either side of it. The
// column the handle belongs to is `order[index]`; its right neighbour is
// `order[index + 1]`.
//
// - Dragging right (+delta) grows `index` and shrinks the columns to its
//   right, in order, each down to its own floor.
// - Dragging left (-delta) grows `index + 1` and shrinks `index` and then
//   everything to its left, in order.
//
// The shrink cascades outward from the divider, so the divider keeps
// tracking the pointer even after the first neighbour bottoms out. The
// total width is preserved.
function distributeResize(
  order: string[],
  index: number,
  startWidths: Record<string, number>,
  floors: Record<string, number>,
  delta: number,
): Record<string, number> {
  const targets: Record<string, number> = {};
  if (index < 0) return targets;

  const growName = delta >= 0 ? order[index] : order[index + 1];
  if (growName == null) return targets;

  let remaining = Math.abs(delta);
  let absorbed = 0;
  const first = delta >= 0 ? index + 1 : index;
  const last = delta >= 0 ? order.length - 1 : 0;
  const step = delta >= 0 ? 1 : -1;

  for (let i = first; delta >= 0 ? i <= last : i >= last; i += step) {
    if (remaining <= 0) break;
    const name = order[i];
    const capacity = Math.max(0, startWidths[name] - floors[name]);
    const take = Math.min(remaining, capacity);
    if (take > 0) {
      targets[name] = startWidths[name] - take;
      remaining -= take;
      absorbed += take;
    }
  }

  if (absorbed > 0) {
    targets[growName] = startWidths[growName] + absorbed;
  }
  return targets;
}

type DragState = {
  order: string[];
  index: number;
  startX: number;
  startWidths: Record<string, number>;
  floors: Record<string, number>;
  previous: Record<string, number | 'flex'>;
  current: Record<string, number>;
  moved: boolean;
};

export type ColumnWidthsContextValue = {
  widths: Record<string, number | 'flex'>;
  isResizing: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  setContainerRef: (el: HTMLDivElement | null) => void;
  getColumnWidth: (columnName: string) => number;
  getMinWidth: (columnName: string) => number;
  setColumnWidth: (columnName: string, width: number) => void;
  resizeColumnBy: (columnName: string, delta: number) => void;
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
  /** Per-column shrink floors, in px. Falls back to MIN_COLUMN_WIDTH. */
  minWidths?: Record<string, number>;
  children: ReactNode;
};

export function ColumnWidthsProvider({
  tableId,
  defaultWidths,
  minWidths,
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
    buildWidths(defaultWidths, savedWidths, minWidths),
  );
  // While a drag is in progress every named column is rendered with an
  // explicit width instead of flexing, so the cascade can drive the CSS
  // variables directly without a React update per pointermove.
  const [isResizing, setIsResizing] = useState(false);

  // The widths re-hydrate when the pref changes, for example when the
  // user switches budgets or resizes a column from another device.
  useEffect(() => {
    setWidths(buildWidths(defaultWidths, savedWidths, minWidths));
  }, [defaultWidths, savedWidths, minWidths]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const setContainerRef = (el: HTMLDivElement | null) => {
    containerRef.current = el;
  };

  const getMinWidth = (name: string): number =>
    minWidths?.[name] ?? MIN_COLUMN_WIDTH;

  // The width to start a resize from is the live CSS variable, or the
  // rendered width, or the fallback. The CSS variable wins when a drag is
  // in progress or a width was already applied. Flex columns have no CSS
  // variable, so their real rendered width is measured from the DOM
  // rather than assuming a constant (which would make the column jump as
  // soon as it is grabbed).
  const getColumnWidth = (name: string): number => {
    const el = containerRef.current;
    if (el) {
      const val = el.style.getPropertyValue(`--col-${name}-width`);
      if (val) return parseFloat(val);

      const column = el.querySelector<HTMLElement>(`[data-column="${name}"]`);
      const measured = column?.getBoundingClientRect().width;
      if (measured != null && measured > 0) return measured;
    }
    const w = widths[name];
    return typeof w === 'number' ? w : FALLBACK_COLUMN_WIDTH;
  };

  // The columns in visual order. Read from the DOM so it matches whatever
  // column set/order the table is currently rendering.
  const getColumnOrder = (): string[] => {
    const el = containerRef.current;
    const order: string[] = [];
    if (el) {
      const seen = new Set<string>();
      el.querySelectorAll<HTMLElement>('[data-column]').forEach(node => {
        const name = node.getAttribute('data-column');
        if (name && !seen.has(name)) {
          seen.add(name);
          order.push(name);
        }
      });
    }
    return order;
  };

  // The single write path for fixed pixel widths. Takes multiple columns
  // so a coupled resize updates them together.
  const applyWidths = (entries: Array<[string, number]>, persist: boolean) => {
    const el = containerRef.current;
    const stateUpdate: Record<string, number> = {};
    for (const [name, width] of entries) {
      const clamped = Math.max(getMinWidth(name), width);
      el?.style.setProperty(`--col-${name}-width`, `${clamped}px`);
      stateUpdate[name] = clamped;
    }
    setWidths(prev => ({ ...prev, ...stateUpdate }));
    if (persist) {
      setSavedWidthsPref(
        JSON.stringify({ ...(savedWidths || {}), ...stateUpdate }),
      );
    }
  };

  const applyWidth = (columnName: string, width: number, persist: boolean) => {
    applyWidths([[columnName, width]], persist);
  };

  // Restore / set each column to an explicit state, including back to
  // `flex`. Used at the end of a drag so columns that were only pinned for
  // the duration go back to sharing the leftover width.
  const applyStates = (entries: Array<[string, number | 'flex']>) => {
    const el = containerRef.current;
    const stateUpdate: Record<string, number | 'flex'> = {};
    for (const [name, value] of entries) {
      if (value === 'flex') {
        el?.style.removeProperty(`--col-${name}-width`);
        stateUpdate[name] = 'flex';
      } else {
        const clamped = Math.max(getMinWidth(name), value);
        el?.style.setProperty(`--col-${name}-width`, `${clamped}px`);
        stateUpdate[name] = clamped;
      }
    }
    setWidths(prev => ({ ...prev, ...stateUpdate }));
  };

  const setColumnWidth = (columnName: string, width: number) => {
    applyWidth(columnName, width, true);
  };

  const onResizeStart = (columnName: string, startX: number) => {
    const order = getColumnOrder();
    const index = order.indexOf(columnName);
    const startWidths: Record<string, number> = {};
    const floors: Record<string, number> = {};
    const previous: Record<string, number | 'flex'> = {};
    for (const name of order) {
      startWidths[name] = getColumnWidth(name);
      floors[name] = getMinWidth(name);
      previous[name] = widths[name];
    }
    dragRef.current = {
      order,
      index,
      startX,
      startWidths,
      floors,
      previous,
      current: { ...startWidths },
      moved: false,
    };
    if (index === -1) return;

    // Pin every column at its current width for the duration of the drag.
    // Nothing visibly moves until the pointer actually moves.
    setIsResizing(true);
    const el = containerRef.current;
    for (const name of order) {
      el?.style.setProperty(`--col-${name}-width`, `${startWidths[name]}px`);
    }
  };

  const onResize = (_columnName: string, currentX: number) => {
    const drag = dragRef.current;
    if (!drag || drag.index === -1) return;
    if (currentX !== drag.startX) {
      drag.moved = true;
    }
    const targets = distributeResize(
      drag.order,
      drag.index,
      drag.startWidths,
      drag.floors,
      currentX - drag.startX,
    );
    const el = containerRef.current;
    for (const name of drag.order) {
      const width = targets[name] ?? drag.startWidths[name];
      drag.current[name] = width;
      el?.style.setProperty(`--col-${name}-width`, `${width}px`);
    }
  };

  const onResizeEnd = () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setIsResizing(false);
    if (drag.index === -1) return;

    const changed: Array<[string, number]> = [];
    const restore: Array<[string, number | 'flex']> = [];
    for (const name of drag.order) {
      if (drag.current[name] !== drag.startWidths[name]) {
        changed.push([name, drag.current[name]]);
      } else {
        restore.push([name, drag.previous[name] ?? 'flex']);
      }
    }
    // A click without movement leaves `changed` empty, so nothing is
    // resized or persisted.
    if (restore.length > 0) applyStates(restore);
    if (changed.length > 0) applyWidths(changed, true);
  };

  const resizeColumnBy = (columnName: string, delta: number) => {
    const order = getColumnOrder();
    const index = order.indexOf(columnName);
    if (index === -1) return;
    const startWidths: Record<string, number> = {};
    const floors: Record<string, number> = {};
    for (const name of order) {
      startWidths[name] = getColumnWidth(name);
      floors[name] = getMinWidth(name);
    }
    const targets = distributeResize(order, index, startWidths, floors, delta);
    const entries = order
      .filter(
        name => targets[name] != null && targets[name] !== startWidths[name],
      )
      .map(name => [name, targets[name]] as [string, number]);
    if (entries.length > 0) applyWidths(entries, true);
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
      containerRef.current?.style.removeProperty(`--col-${columnName}-width`);
      setWidths(prev => ({ ...prev, [columnName]: 'flex' }));
    } else if (typeof defaultVal === 'number') {
      applyWidth(columnName, defaultVal, false);
    }
  };

  const value = {
    widths,
    isResizing,
    containerRef,
    setContainerRef,
    getColumnWidth,
    getMinWidth,
    setColumnWidth,
    resizeColumnBy,
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
