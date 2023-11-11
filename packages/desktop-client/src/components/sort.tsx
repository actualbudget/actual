import React, {
  createContext,
  useEffect,
  useRef,
  useLayoutEffect,
  useState,
  useContext,
  type Context,
} from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { useMergedRefs } from '../hooks/useMergedRefs';
import { theme } from '../style';

import View from './common/View';

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
  let _onDragChange = useRef(onDragChange);

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

    end(item) {
      _onDragChange.current({ state: 'end', type, item: item as T });
    },

    canDrag() {
      return canDrag;
    },
  });

  useLayoutEffect(() => {
    _onDragChange.current = onDragChange;
  });

  return { dragRef };
}

export type OnDropCallback = (
  id: unknown,
  dropPos: DropPosition,
  targetId: unknown,
) => Promise<void> | void;

type OnLongHoverCallback = () => Promise<void> | void;

type UseDroppableArgs = {
  types: string | string[];
  id: unknown;
  onDrop: OnDropCallback;
  onLongHover?: OnLongHoverCallback;
};

export function useDroppable({
  types,
  id,
  onDrop,
  onLongHover,
}: UseDroppableArgs) {
  let ref = useRef(null);
  let [dropPos, setDropPos] = useState<DropPosition>(null);

  let [{ isOver }, dropRef] = useDrop({
    accept: types,
    drop({ item }) {
      onDrop(item.id, dropPos, id);
    },
    hover(_, monitor) {
      let hoverBoundingRect = ref.current.getBoundingClientRect();
      let hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      let clientOffset = monitor.getClientOffset();
      let hoverClientY = clientOffset.y - hoverBoundingRect.top;
      let pos: DropPosition = hoverClientY < hoverMiddleY ? 'top' : 'bottom';

      setDropPos(pos);
    },
    collect(monitor) {
      return { isOver: monitor.isOver() };
    },
  });

  useEffect(() => {
    let timeout;
    if (onLongHover && isOver) {
      timeout = setTimeout(onLongHover, 700);
    }

    return () => timeout && clearTimeout(timeout);
  }, [isOver]);

  return {
    dropRef: useMergedRefs(dropRef, ref),
    dropPos: isOver ? dropPos : null,
  };
}

type ItemPosition = 'first' | 'last';
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
  let itemPos = useContext(DropHighlightPosContext);

  if (pos == null) {
    return null;
  }

  let topOffset = (itemPos === 'first' ? 2 : 0) + (offset?.top || 0);
  let bottomOffset = (itemPos === 'last' ? 2 : 0) + (offset?.bottom || 0);

  let posStyle =
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
