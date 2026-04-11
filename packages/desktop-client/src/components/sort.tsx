import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { DropPosition as AriaDropPosition } from 'react-aria';
import { useDrag, useDrop } from 'react-dnd';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useDragRef } from '#hooks/useDragRef';
import { useMergedRefs } from '#hooks/useMergedRefs';

export type DragState<T> = {
  state: 'start-preview' | 'start' | 'end';
  type?: string;
  item?: T;
  preview?: boolean;
};

export type DropPosition = 'top' | 'bottom';

export type OnDragChangeCallback<T> = (
  drag: DragState<T>,
) => Promise<void> | void;

type UseDraggableArgs<T> = {
  item?: T;
  type: string;
  canDrag: boolean;
  onDragChange: OnDragChangeCallback<T>;
};

export function useDraggable<T>({
  item,
  type,
  canDrag,
  onDragChange,
}: UseDraggableArgs<T>) {
  const _onDragChange = useRef(onDragChange);

  const [, dragRef] = useDrag({
    type,
    item: () => {
      void _onDragChange.current({ state: 'start-preview', type, item });

      setTimeout(() => {
        void _onDragChange.current({ state: 'start' });
      }, 0);

      return { type, item };
    },
    collect: monitor => ({ isDragging: monitor.isDragging() }),

    end(dragState) {
      void _onDragChange.current({ state: 'end', type, item: dragState.item });
    },

    canDrag() {
      return canDrag;
    },
  });

  useLayoutEffect(() => {
    _onDragChange.current = onDragChange;
  }, [onDragChange]);

  return { dragRef };
}

export type OnDropCallback = (
  id: string,
  dropPos: DropPosition | null,
  targetId: string,
) => Promise<void> | void;

type OnLongHoverCallback = () => Promise<void> | void;

type UseDroppableArgs = {
  types: string | string[];
  id: string;
  onDrop: OnDropCallback;
  onLongHover?: OnLongHoverCallback;
};

export function useDroppable<T extends { id: string }>({
  types,
  id,
  onDrop,
  onLongHover,
}: UseDroppableArgs) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onLongHoverRef = useRef(onLongHover);
  const [dropPos, setDropPos] = useState<DropPosition | null>(null);

  const [{ isOver }, dropRef] = useDrop<
    { item: T },
    unknown,
    { isOver: boolean }
  >({
    accept: types,
    drop({ item }) {
      void onDrop(item.id, dropPos, id);
    },
    hover(_, monitor) {
      if (!ref.current) return;
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      const pos: DropPosition = hoverClientY < hoverMiddleY ? 'top' : 'bottom';

      setDropPos(pos);
    },
    collect(monitor) {
      return { isOver: monitor.isOver() };
    },
  });
  const handleDropRef = useDragRef(dropRef);

  useEffect(() => {
    onLongHoverRef.current = onLongHover;
  }, [onLongHover]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    if (onLongHoverRef.current && isOver) {
      timeout = setTimeout(() => onLongHoverRef.current?.(), 700);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isOver]);

  return {
    dropRef: useMergedRefs(handleDropRef, ref),
    dropPos: isOver ? dropPos : null,
  };
}

type ItemPosition = 'first' | 'last' | null;
export const DropHighlightPosContext = createContext<ItemPosition>(null);

type DropHighlightProps = {
  // Supports legacy ('top'/'bottom') and react-aria ('before'/'after'/'on') positions
  // 'on' is not used in our UI but is included for type compatibility
  pos: DropPosition | AriaDropPosition | null;
  offset?: {
    top?: number;
    bottom?: number;
  };
};
export function DropHighlight({ pos, offset }: DropHighlightProps) {
  const itemPos = useContext(DropHighlightPosContext);

  // 'on' position is not supported for highlight (used for dropping onto items, not between)
  if (pos == null || pos === 'on') {
    return null;
  }

  const topOffset = (itemPos === 'first' ? 2 : 0) + (offset?.top || 0);
  const bottomOffset = (itemPos === 'last' ? 2 : 0) + (offset?.bottom || 0);

  // Support both legacy ('top'/'bottom') and aria ('before'/'after') position names
  const isTop = pos === 'top' || pos === 'before';
  const posStyle = isTop ? { top: topOffset } : { bottom: bottomOffset };

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
