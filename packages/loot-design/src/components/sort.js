import React, {
  useEffect,
  useRef,
  useLayoutEffect,
  useMemo,
  useState,
  useContext
} from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { colors } from '../style';

import { View } from './common';

export function useMergedRefs(ref1, ref2) {
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

export function useDraggable({
  item,
  type,
  makePreview,
  children,
  canDrag,
  onDragChange
}) {
  let _onDragChange = useRef(onDragChange);

  //eslint-disable-next-line
  const [{ isDragging }, dragRef] = useDrag({
    item: { type, item },
    collect: monitor => ({ isDragging: monitor.isDragging() }),

    begin(monitor) {
      _onDragChange.current({ state: 'start-preview', type, item });

      setTimeout(() => {
        _onDragChange.current({ state: 'start' });
      }, 0);
    },

    end(item, monitor) {
      _onDragChange.current({ state: 'end', type, item });
    },

    canDrag() {
      return canDrag;
    }
  });

  useLayoutEffect(() => {
    _onDragChange.current = onDragChange;
  });

  return { dragRef };
}

export function useDroppable({ types, id, onDrop, onLongHover }) {
  let ref = useRef(null);
  let [dropPos, setDropPos] = useState(null);

  // eslint-disable-next-line
  let [{ isOver }, dropRef] = useDrop({
    accept: types,
    drop({ item }, monitor) {
      onDrop(item.id, dropPos, id);
    },
    hover({ item, type }, monitor) {
      let hoverBoundingRect = ref.current.getBoundingClientRect();
      let hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      let clientOffset = monitor.getClientOffset();
      let hoverClientY = clientOffset.y - hoverBoundingRect.top;
      let pos = hoverClientY < hoverMiddleY ? 'top' : 'bottom';

      setDropPos(pos);
    },
    collect(monitor) {
      return { isOver: monitor.isOver() };
    }
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
    dropPos: isOver ? dropPos : null
  };
}

export const DropHighlightPosContext = React.createContext(null);

export function DropHighlight({ pos, offset = {} }) {
  if (pos == null) {
    return null;
  }

  let itemPos = useContext(DropHighlightPosContext);
  let topOffset = (itemPos === 'first' ? 2 : 0) + (offset.top || 0);
  let bottomOffset = (itemPos === 'last' ? 2 : 0) + (offset.bottom || 0);

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
          background: `linear-gradient(90deg, ${colors.b4} 0%, ${colors.b5} 100%)`,
          zIndex: 10000,
          pointerEvents: 'none'
        },
        posStyle
      ]}
    />
  );
}
