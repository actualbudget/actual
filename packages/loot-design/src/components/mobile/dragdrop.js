import React, {
  useMemo,
  useEffect,
  useState,
  useRef,
  useCallback,
  useContext
} from 'react';
import { View, findNodeHandle } from 'react-native';
import { State, LongPressGestureHandler } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { colors } from '../../style';

export const DragDropContext = React.createContext(null);
let A = Animated;

function Preview({ draggable, x, y, pending }) {
  if (draggable) {
    let { bounds, preview } = draggable;
    return preview({
      pending,
      style: {
        position: 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        zIndex: 1000,
        transform: [{ translateY: y }]
      }
    });
  }
  return null;
}

export function Draggable({ id, type, preview, gestures, children }) {
  let context = useContext(DragDropContext);
  let container = useRef(null);

  let _onTapHandlerStateChange = e => {
    if (e.nativeEvent.state === State.ACTIVE) {
      context.onDragStart(id, type, container.current, preview);
    } else if (e.nativeEvent.oldState === State.ACTIVE) {
      context.onDragEnd();
    }
  };

  return (
    <LongPressGestureHandler
      minDurationMs={250}
      onHandlerStateChange={_onTapHandlerStateChange}
      simultaneousHandlers={gestures.pan}
    >
      <Animated.View ref={container} style={{ flex: 1 }}>
        {children}
      </Animated.View>
    </LongPressGestureHandler>
  );
}

export function Droppable({ type, onDrop, getActiveStatus, children }) {
  let context = useContext(DragDropContext);
  let element = useRef(null);
  let id = useState(Math.random().toString());

  // TODO: This effect is missing deps, need to figure out how to
  // optimize
  useEffect(() => {
    let unregister = context.registerDroppable(id, {
      acceptedTypes: Array.isArray(type) ? type : [type],
      onDrop: onDrop,
      onMeasure: measure,
      getActiveStatus
    });

    return unregister;
  }, []);

  function measure() {
    if (element.current) {
      let el = element.current.getNode
        ? element.current.getNode()
        : element.current;
      el.measureLayout(
        findNodeHandle(context.container.current),
        (x, y, width, height) => {
          context.updateDroppable(id, {
            layout: { x, y, width, height }
          });
        }
      );
    }
  }

  let { currentDropping } = context;

  return (
    <View onLayout={measure} ref={element}>
      {children({
        activeStatus:
          currentDropping &&
          currentDropping.droppable.id === id &&
          currentDropping.status
      })}
    </View>
  );
}

export function DragDrop({ makeHighlight, children, style }) {
  let x = useMemo(() => new Animated.Value(0), []);
  let y = useMemo(() => new Animated.Value(0), []);
  let ax = useMemo(() => new Animated.Value(0), []);
  let ay = useMemo(() => new Animated.Value(0), []);
  let scrollRef = useRef(null);
  let container = useRef(null);
  let containerBounds = useRef(null);
  let [currentDropping, setCurrentDropping] = useState(null);
  let [dragState, setDragState] = useState(null);
  let draggable = useRef(null);
  let scrollY = useRef(0);

  let lastDragArgs = useRef(null);

  let onDragMove = useCallback(([x, y]) => {
    if (draggable.current) {
      lastDragArgs.current = [x, y];

      let { droppable, status } = getDroppableInArea(
        [x, y],
        draggable.current.type
      );
      if (
        droppable &&
        (!currentDropping ||
          droppable.id !== currentDropping.droppable.id ||
          status !== currentDropping.status)
      ) {
        setCurrentDropping({ droppable, status });
      }

      let relY = y - containerBounds.current.y;
      let { height } = containerBounds.current;

      if (relY < 100) {
        requestAnimationFrame(() => {
          scrollRef.current
            .getNode()
            .scrollTo({ y: scrollY.current - 4, animated: false });
        });
      } else if (relY > height - 100) {
        requestAnimationFrame(() => {
          scrollRef.current
            .getNode()
            .scrollTo({ y: scrollY.current + 4, animated: false });
        });
      }
    }
  }, []);

  let onGestureEvent = Animated.event([
    {
      nativeEvent: ({
        absoluteX,
        absoluteY,
        translationX: tx,
        translationY: ty,
        state
      }) =>
        A.block([
          A.cond(A.eq(state, State.ACTIVE), [
            A.set(x, tx),
            A.set(y, ty),
            A.set(ax, absoluteX),
            A.set(ay, absoluteY),

            A.call([ax, ay], onDragMove)
          ])
        ])
    }
  ]);

  function onContainerLayout() {
    container.current.measureInWindow((x, y, width, height) => {
      containerBounds.current = { x, y, width, height };
    });
  }

  let onHandlerStateChange = useCallback(e => {
    if (e.nativeEvent.state === State.ACTIVE) {
      setDragState('dragging');
    }
  }, []);

  // Managing drag state
  let onDrag = useCallback((id, type, el, preview) => {
    if (container && preview) {
      el = el.getNode ? el.getNode() : el;
      el.measureLayout(
        findNodeHandle(container.current),
        (x, y, width, height) => {
          draggable.current = {
            id,
            type,
            bounds: { x, y: y - scrollY.current, width, height },
            preview
          };
          setDragState('pending');
        }
      );

      droppables.current.forEach(d => d.onMeasure());
    }
  }, []);
  let onDragStart = (id, type, container, preview) => {
    onDrag(id, type, container, preview);
  };
  let onDragEnd = () => {
    if (draggable.current && currentDropping) {
      let { droppable, status } = currentDropping;
      droppable.onDrop(
        draggable.current.id,
        draggable.current.type,
        droppable,
        status
      );
    }

    draggable.current = null;
    setDragState(null);
    setCurrentDropping(null);
    x.setValue(0);
    y.setValue(0);
  };

  // Handle scrolling
  function onScroll(e) {
    scrollY.current = e.nativeEvent.contentOffset.y;

    if (dragState === 'dragging' && lastDragArgs.current) {
      onDragMove(lastDragArgs.current);
    }
  }

  // Droppables
  let droppables = useRef([]);

  function getDroppableInArea([x, y], type) {
    if (!containerBounds.current) {
      return null;
    }

    x -= containerBounds.current.x;
    y -= containerBounds.current.y - scrollY.current;

    let droppable = droppables.current.find(({ acceptedTypes, layout }) => {
      return (
        acceptedTypes.indexOf(type) !== -1 &&
        layout &&
        x >= layout.x &&
        y >= layout.y &&
        x <= layout.x + layout.width &&
        y <= layout.y + layout.height
      );
    });

    if (droppable) {
      let { layout, getActiveStatus } = droppable;

      if (getActiveStatus) {
        let status = getActiveStatus(x, y, droppable, draggable.current || {});
        if (status) {
          return { droppable, status, position: { x, y } };
        }
      } else {
        return { droppable, status: true, position: { x, y } };
      }
    }
    return {};
  }

  function registerDroppable(id, events) {
    droppables.current = [
      ...droppables.current,
      {
        id,
        ...events,
        layout: { x: 0, y: 0, width: 0, height: 0 }
      }
    ];

    return () => {
      unregisterDroppable(id);
    };
  }

  function unregisterDroppable(id) {
    droppables.current = droppables.current.filter(d => d.id !== id);
  }

  function updateDroppable(id, data) {
    droppables.current = droppables.current.map(d => {
      if (d.id === id) {
        return { ...d, ...data };
      }
      return d;
    });
  }

  return (
    <DragDropContext.Provider
      value={{
        onDragStart,
        onDragEnd,
        container,
        dragging: dragState === 'dragging',

        registerDroppable,
        updateDroppable,
        unregisterDroppable,
        currentDropping
      }}
    >
      <View ref={container} onLayout={onContainerLayout} style={{ flex: 1 }}>
        {children({
          dragState,
          scrollRef,
          onScroll,
          onGestureEvent,
          onHandlerStateChange
        })}

        <Preview
          draggable={draggable.current}
          x={x}
          y={y}
          pending={dragState === 'pending'}
        />
      </View>
    </DragDropContext.Provider>
  );
}

export function DragDropHighlight() {
  let context = useContext(DragDropContext);
  if (!context.currentDropping) {
    return null;
  }

  let { droppable, status } = context.currentDropping;
  let { layout } = droppable;

  return (
    <View
      style={[
        {
          position: 'absolute',
          left: layout.x,
          width: layout.width,
          backgroundColor: colors.b6,
          height: 4
        },
        status === 'top' && {
          top: layout.y - 2
        },
        status === 'bottom' && {
          top: layout.y + layout.height - 2
        }
      ]}
    />
  );
}
