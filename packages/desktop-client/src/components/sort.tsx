import React, {
  createContext,
  useEffect,
  useRef,
  useLayoutEffect,
  useMemo,
  useState,
  useContext,
  type RefCallback,
  type MutableRefObject,
  type Context,
  type Ref,
} from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { theme } from '../style';

import View from './common/View';

function useMergedRefs<T>(
  ref1: RefCallback<T> | MutableRefObject<T>,
  ref2: RefCallback<T> | MutableRefObject<T>,
): Ref<T> {
  return useMemo(() => {
    function ref(value) {
      [ref1, ref2].forEach(ref => {
        if (typeof ref === 'function') {
          ref(value);
        } else if (ref != null) {
          ref.current = value;
        }
      });
    }

    return ref;
  }, [ref1, ref2]);
}
type UseDraggableArgs = {
  item: unknown;
  type: string;
  canDrag: boolean;
  onDragChange: (drag: DragState) => void;
};
type DragState = {
  state: 'start-preview' | 'start' | 'end';
  type?: string;
  item?: unknown;
};
export function useDraggable({
  item,
  type,
  canDrag,
  onDragChange,
}: UseDraggableArgs) {
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
      _onDragChange.current({ state: 'end', type, item });
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
type DropPosition = 'top' | 'bottom';
type UseDroppableArgs = {
  types: string | string[];
  id: unknown;
  onDrop: (id: unknown, dropPos: DropPosition, targetId: unknown) => void;
  onLongHover?: () => void;
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
  pos: 'top' | 'bottom';
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
      style={[
        {
          position: 'absolute',
          left: 2,
          right: 2,
          borderRadius: 3,
          height: 3,
          background: theme.pageTextLink,
          zIndex: 10000,
          pointerEvents: 'none',
        },
        posStyle,
      ]}
    />
  );
}
