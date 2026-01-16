// @ts-strict-ignore
import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Context,
} from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useDragRef } from '@desktop-client/hooks/useDragRef';
import { useMergedRefs } from '@desktop-client/hooks/useMergedRefs';

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
      _onDragChange.current({ state: 'start-preview', type, item });

      setTimeout(() => {
        _onDragChange.current({ state: 'start' });
      }, 0);

      return { type, item };
    },
    collect: monitor => ({ isDragging: monitor.isDragging() }),

    end(dragState) {
      _onDragChange.current({ state: 'end', type, item: dragState.item });
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
  dropPos: DropPosition,
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
  const ref = useRef(null);
  const onLongHoverRef = useRef(onLongHover);
  const [dropPos, setDropPos] = useState<DropPosition | null>(null);

  const [{ isOver }, dropRef] = useDrop<
    { item: T },
    unknown,
    { isOver: boolean }
  >({
    accept: types,
    drop({ item }) {
      onDrop(item.id, dropPos, id);
    },
    hover(_, monitor) {
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
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
export const DropHighlightPosContext: Context<ItemPosition> =
  createContext(null);

type DropHighlightProps = {
  pos: DropPosition;
  offset?: {
    top?: number;
    bottom?: number;
  };
};
export function DropHighlight({ pos, offset }: DropHighlightProps) {
  const itemPos = useContext(DropHighlightPosContext);

  if (pos == null) {
    return null;
  }

  const topOffset = (itemPos === 'first' ? 2 : 0) + (offset?.top || 0);
  const bottomOffset = (itemPos === 'last' ? 2 : 0) + (offset?.bottom || 0);

  const posStyle =
    pos === 'top' ? { top: -2 + topOffset } : { bottom: -1 + bottomOffset };

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
