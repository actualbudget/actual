import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Context,
  type RefObject,
} from 'react';
import {
  useDrag as useReactAriaDrag,
  useDrop as useReactAriaDrop,
  type DragPreviewRenderer,
  type DropPosition,
  type TextDropItem,
} from 'react-aria';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

// ===========================================================================
// Migration Notes
// ===========================================================================
//
// This module provides low-level drag-and-drop hooks based on react-aria.
// These hooks are used for components that haven't yet migrated to
// react-aria-components (ListBox, GridList, Table).
//
// When components are migrated to use react-aria-components, they should
// use the higher-level `useDragAndDrop` hook from react-aria-components
// instead of these low-level hooks.
//
// Migration path for each feature:
//
// | Current                    | react-aria-components equivalent          |
// |----------------------------|-------------------------------------------|
// | useDrag + useDrop hooks    | useDragAndDrop hook                       |
// | preview ref (useDrag)      | renderDragPreview option                  |
// | DropHighlight component    | renderDropIndicator + <DropIndicator>     |
// | onDrop callback            | onReorder / onMove / onInsert callbacks   |
// | onLongHover callback       | onDropActivate option (built-in)          |
// | DragState (start-preview)  | onDragStart / onDragEnd callbacks         |
// | DropHighlightPosContext    | Not needed (DropIndicator handles this)   |
//
// ===========================================================================
// Components Already Migrated (using useDragAndDrop + GridList/ListBox)
// ===========================================================================
//
// Mobile:
// - ExpenseGroupList.tsx → GridList + useDragAndDrop
// - ExpenseCategoryList.tsx → GridList + useDragAndDrop
// - AccountsPage.tsx (AccountList) → ListBox + useDragAndDrop
//
// ===========================================================================
// Components Still Using react-dnd (To Migrate)
// ===========================================================================
//
// Desktop Budget (currently uses react-dnd, should migrate to GridList):
// - ExpenseCategory.tsx / SidebarCategory.tsx → react-dnd useDraggable/useDroppable
// - ExpenseGroup.tsx / SidebarGroup.tsx → react-dnd useDraggable/useDroppable
// - IncomeCategory.tsx → react-dnd useDraggable/useDroppable
// - BudgetCategories.tsx → Parent component with DndProvider
//
// Desktop Sidebar (currently uses react-dnd, should migrate to ListBox):
// - Account.tsx → react-dnd useDraggable/useDroppable
// - Accounts.tsx → Parent component with DndProvider
//
// ===========================================================================
// Components Using This Module (react-aria based)
// ===========================================================================
//
// Transactions:
// - TransactionsTable.tsx → Uses useDrag/useDrop from this module
// - TransactionList.tsx → Uses isValidBoundaryDrop for validation
//
// These hooks wrap react-aria's low-level useDrag/useDrop and add:
// - Two-phase drag start (preview then start) for UI coordination
// - Manual drop position calculation based on cursor position
// - Long hover detection via onDropActivate
//
// ===========================================================================

// ============================================================
// Types
// ============================================================

// Re-exported from react-aria for convenience
export type { DropPosition };

/**
 * Check if a drop at a date boundary is valid.
 * A boundary drop is valid when the adjacent transaction has the same date as the dragged transaction.
 *
 * MIGRATION: This validation logic is specific to transaction reordering and
 * should be moved into the `onReorder` callback when migrating to useDragAndDrop.
 * The callback receives the dragged keys and drop target, from which you can
 * access the transaction data and perform this validation before applying changes.
 *
 * @param dropPos - The drop position relative to the target ('before' or 'after')
 * @param targetDate - The date of the transaction being dropped onto
 * @param draggedDate - The date of the transaction being dragged
 * @param neighborDate - The date of the adjacent transaction in the drop direction, or null if none
 * @param isAscending - Whether the list is sorted in ascending order (oldest first)
 * @returns True if the drop is valid at this boundary position
 */
export function isValidBoundaryDrop(
  dropPos: DropPosition,
  targetDate: string,
  draggedDate: string,
  neighborDate: string | null,
  isAscending: boolean,
): boolean {
  if (!neighborDate || neighborDate !== draggedDate) {
    return false;
  }

  if (isAscending) {
    // Ascending: older at top, newer at bottom
    // Valid: drop 'before' later-dated, or 'after' earlier-dated
    return (
      (dropPos === 'before' && targetDate > draggedDate) ||
      (dropPos === 'after' && targetDate < draggedDate)
    );
  }
  // Descending (default): newer at top, older at bottom
  // Valid: drop 'before' earlier-dated, or 'after' later-dated
  return (
    (dropPos === 'before' && targetDate < draggedDate) ||
    (dropPos === 'after' && targetDate > draggedDate)
  );
}

/**
 * Represents the current state of a drag operation.
 *
 * MIGRATION: When using useDragAndDrop from react-aria-components,
 * use onDragStart/onDragEnd callbacks instead. The 'start-preview'
 * state is used to show a preview before the actual drag starts,
 * which can be replaced by renderDragPreview option.
 */
export type DragState<T> = {
  state: 'start-preview' | 'start' | 'end';
  type?: string;
  item?: T;
  preview?: boolean;
};

export type OnDragChangeCallback<T> = (
  drag: DragState<T>,
) => Promise<void> | void;

/**
 * MIGRATION: When using useDragAndDrop, use onReorder callback instead.
 * The signature changes to: (e: { keys: Set<Key>, target: DropTarget }) => void
 */
export type OnDropCallback = (
  id: string,
  dropPos: DropPosition,
  targetId: string,
) => Promise<void> | void;

/**
 * MIGRATION: Use onDropActivate option in useDragAndDrop instead.
 * react-aria calls this automatically after hovering for ~500ms.
 */
export type OnLongHoverCallback = () => Promise<void> | void;

// ============================================================
// useDrag
// ============================================================

/**
 * MIGRATION: When migrating to useDragAndDrop from react-aria-components:
 * - Remove `preview` ref - use `renderDragPreview` option instead
 * - Remove `onDragChange` - use `onDragStart`/`onDragEnd` options instead
 * - Remove `canDrag` - use `isDisabled` on the collection component
 * - The `type` becomes part of `getItems` return value
 */
export type UseDragArgs<T> = {
  item?: T;
  type: string;
  canDrag: boolean;
  onDragChange?: OnDragChangeCallback<T>;
  /** MIGRATION: Replace with renderDragPreview option in useDragAndDrop */
  preview?: RefObject<DragPreviewRenderer | null>;
};

/**
 * Low-level drag hook for custom components.
 *
 * MIGRATION: Replace with useDragAndDrop from react-aria-components
 * when the parent component uses ListBox, GridList, or Table.
 */
export function useDrag<T extends { id: string }>({
  item,
  type,
  canDrag,
  onDragChange,
  preview,
}: UseDragArgs<T>) {
  const _onDragChange = useRef(onDragChange);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useLayoutEffect(() => {
    _onDragChange.current = onDragChange;
  });

  useEffect(() => {
    return () => {
      if (dragStartTimeoutRef.current) {
        clearTimeout(dragStartTimeoutRef.current);
        dragStartTimeoutRef.current = null;
      }
    };
  }, []);

  const { dragProps, isDragging } = useReactAriaDrag({
    isDisabled: !canDrag,
    preview,
    getItems() {
      return [
        {
          [type]: JSON.stringify(item),
          'text/plain': item?.id ?? '',
        },
      ];
    },
    onDragStart() {
      _onDragChange.current?.({ state: 'start-preview', type, item });
      // Clear any pending timeout before scheduling a new one
      if (dragStartTimeoutRef.current) {
        clearTimeout(dragStartTimeoutRef.current);
      }
      // MIGRATION: This two-phase start (preview then start) pattern
      // is used to first show the drag preview, then update UI state.
      // With useDragAndDrop, use onDragStart for immediate feedback
      // and renderDragPreview for the preview element.
      dragStartTimeoutRef.current = setTimeout(() => {
        _onDragChange.current?.({ state: 'start' });
        dragStartTimeoutRef.current = null;
      }, 0);
    },
    onDragEnd() {
      // Clear pending timeout to prevent stale 'start' callback after 'end'
      if (dragStartTimeoutRef.current) {
        clearTimeout(dragStartTimeoutRef.current);
        dragStartTimeoutRef.current = null;
      }
      _onDragChange.current?.({ state: 'end', type, item });
    },
  });

  return { dragRef, dragProps, isDragging };
}

// ============================================================
// useDrop
// ============================================================

/**
 * MIGRATION: When migrating to useDragAndDrop from react-aria-components:
 * - Remove `types` - use `acceptedDragTypes` option instead
 * - Remove `id` - the collection handles item identification
 * - Replace `onDrop` with `onReorder`/`onMove`/`onInsert` options
 * - Replace `onLongHover` with `onDropActivate` option
 */
export type UseDropArgs = {
  types: string | string[];
  id: string;
  onDrop?: OnDropCallback;
  /** MIGRATION: Use onDropActivate option in useDragAndDrop instead */
  onLongHover?: OnLongHoverCallback;
};

/**
 * Low-level drop hook for custom components.
 *
 * MIGRATION: Replace with useDragAndDrop from react-aria-components
 * when the parent component uses ListBox, GridList, or Table.
 * The drop position calculation and cursor tracking will be handled
 * automatically by the collection component.
 */
export function useDrop<T extends { id: string }>({
  types,
  id,
  onDrop,
  onLongHover,
}: UseDropArgs) {
  const dropRef = useRef<HTMLDivElement>(null);
  const [dropPos, setDropPos] = useState<DropPosition | null>(null);
  // Track if cursor is actually within this element's bounds (not just drag preview overlap)
  const [isCursorOver, setIsCursorOver] = useState(false);
  const lastClientY = useRef<number | null>(null);
  // Track if react-aria thinks we're a drop target (needed to attach dragover listener)
  const [isDropActive, setIsDropActive] = useState(false);

  // Reset state when cursor leaves
  useEffect(() => {
    if (!isCursorOver) {
      setDropPos(null);
      lastClientY.current = null;
    }
  }, [isCursorOver]);

  const acceptedTypes = Array.isArray(types) ? types : [types];

  const { dropProps, isDropTarget } = useReactAriaDrop({
    ref: dropRef as RefObject<HTMLDivElement | null>,
    getDropOperation(dragTypes) {
      // Check if any of our accepted types are in the drag types
      const hasAcceptedType = acceptedTypes.some(t => dragTypes.has(t));
      return hasAcceptedType ? 'move' : 'cancel';
    },
    onDropEnter() {
      // Mark that a drag is active over this element (enables dragover listener)
      setIsDropActive(true);
    },
    onDropActivate() {
      // MIGRATION: This is already using react-aria's built-in long hover.
      // With useDragAndDrop, use the onDropActivate option directly.
      onLongHover?.();
    },
    onDropExit() {
      setIsDropActive(false);
      setIsCursorOver(false);
    },
    async onDrop(e) {
      if (!onDrop) return;
      if (!dropRef.current) return;

      // Find the first matching type
      const matchingType = acceptedTypes.find(t =>
        e.items.some(
          (item): item is TextDropItem =>
            item.kind === 'text' && item.types.has(t),
        ),
      );

      if (!matchingType) return;

      const textItem = e.items.find(
        (item): item is TextDropItem =>
          item.kind === 'text' && item.types.has(matchingType),
      );

      if (!textItem) return;

      const data = await textItem.getText(matchingType);
      if (typeof data !== 'string' || !data.trim()) return;

      let parsed: T;
      try {
        parsed = JSON.parse(data) as T;
      } catch {
        // Ignore malformed payloads
        return;
      }

      // Validate payload shape: must be an object with a non-empty string id
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        typeof parsed.id !== 'string' ||
        !parsed.id
      ) {
        return;
      }

      // MIGRATION: With useDragAndDrop, the drop position is provided
      // in the event object (e.target.dropPosition) - no manual
      // calculation needed.
      const rect = dropRef.current.getBoundingClientRect();
      const hoverMiddleY = (rect.bottom - rect.top) / 2;
      const hoverClientY =
        lastClientY.current != null
          ? lastClientY.current - rect.top
          : hoverMiddleY + 1;
      const pos: DropPosition =
        hoverClientY < hoverMiddleY ? 'before' : 'after';

      onDrop(parsed.id, pos, id);
    },
  });

  // MIGRATION: This manual dragover tracking is not needed with
  // useDragAndDrop - the collection component handles it automatically.
  useEffect(() => {
    if (!isDropActive) return;

    const handleDragOver = (e: DragEvent) => {
      if (!dropRef.current) return;

      const rect = dropRef.current.getBoundingClientRect();
      const { clientX, clientY } = e;

      // Check if cursor is actually within this element's bounds
      const cursorInBounds =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;

      if (!cursorInBounds) {
        setIsCursorOver(false);
        return;
      }

      setIsCursorOver(true);
      lastClientY.current = clientY;

      const hoverMiddleY = (rect.bottom - rect.top) / 2;
      const hoverClientY = clientY - rect.top;
      const newPos: DropPosition =
        hoverClientY < hoverMiddleY ? 'before' : 'after';

      setDropPos(newPos);
    };

    const element = dropRef.current;
    element?.addEventListener('dragover', handleDragOver);

    return () => {
      element?.removeEventListener('dragover', handleDragOver);
    };
  }, [isDropActive, dropRef]);

  return {
    dropRef,
    dropProps,
    dropPos: isCursorOver ? dropPos : null,
    isDropTarget,
  };
}

// ============================================================
// DropHighlight
// ============================================================

/**
 * MIGRATION: Replace with renderDropIndicator option and <DropIndicator>
 * component from react-aria-components. See ExpenseGroupList.tsx for example:
 *
 * ```tsx
 * renderDropIndicator: target => (
 *   <DropIndicator
 *     target={target}
 *     className={css({
 *       '&[data-drop-target]': {
 *         height: 4,
 *         backgroundColor: theme.tableBorderSeparator,
 *       },
 *     })}
 *   />
 * )
 * ```
 */
type ItemPosition = 'first' | 'last' | null;

/**
 * MIGRATION: Not needed with useDragAndDrop - DropIndicator handles
 * positioning automatically based on the collection structure.
 */
export const DropHighlightPosContext: Context<ItemPosition> =
  createContext<ItemPosition>(null);

type DropHighlightProps = {
  pos: DropPosition | null;
  offset?: {
    top?: number;
    bottom?: number;
  };
};

/**
 * Visual indicator showing where a dragged item will be dropped.
 *
 * MIGRATION: Replace with <DropIndicator> from react-aria-components
 * when using useDragAndDrop. The DropIndicator component automatically
 * positions itself between items based on the drop target.
 */
export function DropHighlight({ pos, offset }: DropHighlightProps) {
  const itemPos = useContext(DropHighlightPosContext);

  // 'on' position is not supported for highlight (used for dropping onto items, not between)
  if (pos == null || pos === 'on') {
    return null;
  }

  const topOffset = (itemPos === 'first' ? 2 : 0) + (offset?.top ?? 0);
  const bottomOffset = (itemPos === 'last' ? 2 : 0) + (offset?.bottom ?? 0);

  const posStyle =
    pos === 'before' ? { top: topOffset } : { bottom: bottomOffset };

  return (
    <View
      style={{
        position: 'absolute',
        left: 2,
        right: 2,
        borderRadius: 3,
        height: 3,
        background: theme.pageTextLink,
        zIndex: 10000,
        pointerEvents: 'none',
        ...posStyle,
      }}
    />
  );
}
