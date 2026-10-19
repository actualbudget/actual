import { useEffect, useRef, useState } from 'react';
import type {
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
  SyntheticEvent,
} from 'react';

export type ReorderScope = 'category' | 'group';

export type CategoryDropTarget = {
  groupId: string;
  targetId: string | null;
};

type UseTouchReorderOptions = {
  isEnabled: boolean;
  onMoveCategory?: (id: string, target: CategoryDropTarget) => void;
  onMoveGroup?: (id: string, targetId: string | null) => void;
};

type ReorderEntry = {
  scope: ReorderScope;
  id: string;
  element: HTMLElement;
  groupId: string | null;
};

type DropSlot = {
  groupId: string | null;
  targetId: string | null;
  edgeTop: number;
};

const EDGE_SCROLL_ZONE_PX = 56;
const EDGE_SCROLL_MAX_PX_PER_FRAME = 16;
const EDGE_SCROLL_ARM_DISTANCE_PX = 8;

function getScrollParent(element: HTMLElement): HTMLElement {
  let current = element.parentElement;
  while (current) {
    const { overflowY } = getComputedStyle(current);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return (document.scrollingElement ?? document.documentElement) as HTMLElement;
}

function getScrollerEdges(scroller: HTMLElement) {
  if (scroller === document.scrollingElement) {
    return { top: 0, bottom: window.innerHeight };
  }
  const rect = scroller.getBoundingClientRect();
  return { top: rect.top, bottom: rect.bottom };
}

function getEdgeScrollDelta(clientY: number, top: number, bottom: number) {
  if (clientY < top + EDGE_SCROLL_ZONE_PX) {
    const depth = (top + EDGE_SCROLL_ZONE_PX - clientY) / EDGE_SCROLL_ZONE_PX;
    return -Math.min(1, depth) * EDGE_SCROLL_MAX_PX_PER_FRAME;
  }
  if (clientY > bottom - EDGE_SCROLL_ZONE_PX) {
    const depth =
      (clientY - (bottom - EDGE_SCROLL_ZONE_PX)) / EDGE_SCROLL_ZONE_PX;
    return Math.min(1, depth) * EDGE_SCROLL_MAX_PX_PER_FRAME;
  }
  return 0;
}

function getEntries(container: HTMLElement): ReorderEntry[] {
  const entries: ReorderEntry[] = [];
  let currentGroupId: string | null = container.dataset.reorderGroupId ?? null;
  for (const element of container.querySelectorAll<HTMLElement>(
    '[data-reorder-item]',
  )) {
    const scope = element.dataset.reorderItem;
    const id = element.dataset.reorderId;
    if ((scope !== 'category' && scope !== 'group') || !id) {
      continue;
    }
    if (scope === 'group') {
      currentGroupId = id;
    }
    entries.push({
      scope,
      id,
      element,
      groupId: scope === 'category' ? currentGroupId : null,
    });
  }
  return entries;
}

function isSameSlot(a: DropSlot, b: DropSlot) {
  return a.groupId === b.groupId && a.targetId === b.targetId;
}

function resolveGroupSlot(entries: ReorderEntry[], clientY: number): DropSlot {
  const groups = entries.filter(entry => entry.scope === 'group');
  let index = groups.length;
  for (let i = 0; i < groups.length; i++) {
    const rect = groups[i].element.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      index = i;
      break;
    }
  }
  const target = groups[index];
  return {
    groupId: null,
    targetId: target?.id ?? null,
    edgeTop:
      target?.element.getBoundingClientRect().top ??
      entries.at(-1)?.element.getBoundingClientRect().bottom ??
      0,
  };
}

function resolveCategorySlot(
  entries: ReorderEntry[],
  clientY: number,
): DropSlot | null {
  const lastElementOfGroup = new Map<string | null, HTMLElement>();
  for (const entry of entries) {
    lastElementOfGroup.set(
      entry.scope === 'group' ? entry.id : entry.groupId,
      entry.element,
    );
  }
  const endOfGroup = (
    groupId: string | null,
    fallbackTop: number,
  ): DropSlot => ({
    groupId,
    targetId: null,
    edgeTop:
      lastElementOfGroup.get(groupId)?.getBoundingClientRect().bottom ??
      fallbackTop,
  });

  let currentGroupId: string | null = null;
  let hasEnteredGroup = false;
  for (const entry of entries) {
    const rect = entry.element.getBoundingClientRect();
    if (entry.scope === 'group') {
      if (hasEnteredGroup && clientY < rect.top + rect.height / 2) {
        return endOfGroup(currentGroupId, rect.top);
      }
      currentGroupId = entry.id;
      hasEnteredGroup = true;
      const isCollapsed = lastElementOfGroup.get(entry.id) === entry.element;
      if (isCollapsed && clientY < rect.bottom) {
        return endOfGroup(entry.id, rect.bottom);
      }
      continue;
    }
    currentGroupId = entry.groupId;
    hasEnteredGroup = true;
    if (clientY < rect.top + rect.height / 2) {
      return { groupId: entry.groupId, targetId: entry.id, edgeTop: rect.top };
    }
  }
  return hasEnteredGroup ? endOfGroup(currentGroupId, 0) : null;
}

/**
 * Pointer-driven reordering for touch screens. Press a `[data-reorder-handle]`
 * inside a `[data-reorder-item]` row, move, and release over the new slot.
 *
 * Mounted on a list of category groups it handles both scopes: group handles
 * reorder `[data-reorder-item="group"]` rows, category handles move a
 * category between every `[data-reorder-item="category"]` row under the
 * container, including across groups. A category slot is "before category X"
 * or "end of group G" (below G's last visible category, or on the lower half
 * of G's header when G is collapsed). A category belongs to the closest group
 * marker before it in DOM order, or to the container's
 * `data-reorder-group-id` for a list that holds a single group.
 */
export function useTouchReorder({
  isEnabled,
  onMoveCategory,
  onMoveGroup,
}: UseTouchReorderOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastPointerTypeRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const onMoveCategoryRef = useRef(onMoveCategory);
  const onMoveGroupRef = useRef(onMoveGroup);
  const isEnabledRef = useRef(isEnabled);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [indicatorTop, setIndicatorTop] = useState<number | null>(null);

  useEffect(() => {
    onMoveCategoryRef.current = onMoveCategory;
    onMoveGroupRef.current = onMoveGroup;
    isEnabledRef.current = isEnabled;
  });

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    lastPointerTypeRef.current = event.pointerType;
    if (!isEnabled || isDraggingRef.current) {
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    if (!(event.target instanceof Element)) {
      return;
    }
    const handle = event.target.closest<HTMLElement>('[data-reorder-handle]');
    const scope = handle?.dataset.reorderHandle;
    if (scope !== 'category' && scope !== 'group') {
      return;
    }
    const row = handle?.closest<HTMLElement>(`[data-reorder-item="${scope}"]`);
    const id = row?.dataset.reorderId;
    const container = containerRef.current;
    if (!handle || !row || !id || !container) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const { pointerId } = event;
    const scroller = getScrollParent(container);
    const allEntries = getEntries(container);
    const originalIndex = allEntries.findIndex(entry => entry.element === row);
    const originalEntry = allEntries[originalIndex];
    const nextSibling = allEntries
      .slice(originalIndex + 1)
      .find(entry => entry.scope === scope);
    const originalSlot: DropSlot = {
      groupId: originalEntry?.groupId ?? null,
      targetId:
        nextSibling && nextSibling.groupId === originalEntry?.groupId
          ? nextSibling.id
          : null,
      edgeTop: 0,
    };

    let dropSlot: DropSlot | null = null;
    const startClientY = event.clientY;
    let lastClientY = event.clientY;
    let isEdgeScrollArmed = false;
    let frameId: number | null = null;
    isDraggingRef.current = true;
    setDraggingId(id);

    const update = (clientY: number) => {
      lastClientY = clientY;
      if (Math.abs(clientY - startClientY) > EDGE_SCROLL_ARM_DISTANCE_PX) {
        isEdgeScrollArmed = true;
      }
      const entries = getEntries(container).filter(
        entry => entry.element !== row,
      );
      dropSlot =
        scope === 'group'
          ? resolveGroupSlot(entries, clientY)
          : resolveCategorySlot(entries, clientY);
      if (dropSlot == null) {
        setIndicatorTop(null);
        return;
      }
      const containerTop = container.getBoundingClientRect().top;
      setIndicatorTop(dropSlot.edgeTop - containerTop);
    };

    const onFrame = () => {
      const { top, bottom } = getScrollerEdges(scroller);
      const delta = isEdgeScrollArmed
        ? getEdgeScrollDelta(lastClientY, top, bottom)
        : 0;
      if (delta !== 0) {
        scroller.scrollTop += delta;
      }
      update(lastClientY);
      frameId = requestAnimationFrame(onFrame);
    };

    const removeListeners = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      if (frameId != null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      isDraggingRef.current = false;
      cleanupRef.current = null;
    };

    const finish = (shouldCommit: boolean) => {
      removeListeners();
      setDraggingId(null);
      setIndicatorTop(null);
      if (
        !shouldCommit ||
        !isEnabledRef.current ||
        dropSlot == null ||
        isSameSlot(dropSlot, originalSlot)
      ) {
        return;
      }
      if (scope === 'group') {
        onMoveGroupRef.current?.(id, dropSlot.targetId);
      } else if (dropSlot.groupId != null) {
        onMoveCategoryRef.current?.(id, {
          groupId: dropSlot.groupId,
          targetId: dropSlot.targetId,
        });
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId === pointerId) {
        e.preventDefault();
        update(e.clientY);
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === pointerId) {
        update(e.clientY);
        finish(true);
      }
    };
    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerId === pointerId) {
        finish(false);
      }
    };

    cleanupRef.current = removeListeners;
    update(event.clientY);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    frameId = requestAnimationFrame(onFrame);
  };

  const onDragStart = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isDraggingRef.current || lastPointerTypeRef.current === 'touch') {
      event.preventDefault();
    }
  };

  const onContextMenu = (event: SyntheticEvent) => {
    if (isDraggingRef.current) {
      event.preventDefault();
    }
  };

  return {
    containerProps: {
      ref: containerRef,
      onPointerDownCapture: onPointerDown,
      onDragStartCapture: onDragStart,
      onContextMenuCapture: onContextMenu,
    },
    draggingId,
    indicatorTop,
  };
}
