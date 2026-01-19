// @ts-strict-ignore
import {
  createRef,
  PureComponent,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefObject,
  type UIEvent,
} from 'react';

import { View } from '@actual-app/components/view';
import memoizeOne from 'memoize-one';

const IS_SCROLLING_DEBOUNCE_INTERVAL = 150;

const defaultItemKey: FixedSizeListProps['itemKey'] = (index: number) => index;

type FixedSizeListProps = {
  className?: string;
  direction?: 'rtl' | 'ltr';
  renderRow: (props: {
    index: number;
    key: string | number;
    style: CSSProperties;
    isScrolling?: boolean;
    isAnimating: boolean;
  }) => ReactNode;
  layout?: 'vertical' | 'horizontal';
  overscanCount?: number;
  useIsScrolling?: boolean;
  headerHeight?: number;
  initialScrollOffset?: number;
  itemCount?: number;
  outerRef?: RefObject<HTMLDivElement>;
  itemSize?: number;
  onItemsRendered?: (config: {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex?: number;
    visibleStopIndex?: number;
  }) => void;
  onScroll?: (config: {
    scrollDirection: FixedSizeListState['scrollDirection'];
    scrollOffset: FixedSizeListState['scrollOffset'];
    scrollUpdateWasRequested: FixedSizeListState['scrollUpdateWasRequested'];
  }) => void;
  indexForKey?: (key: string | number) => number;
  height?: number;
  width?: number;
  header?: ReactNode;
  innerRef?: Ref<HTMLDivElement>;
  itemKey?: (index: number) => string | number;
};

type FixedSizeListState = {
  isScrolling: boolean;
  scrollDirection: 'forward' | 'backward';
  scrollOffset: number;
  scrollUpdateWasRequested: boolean;
};

export class FixedSizeList extends PureComponent<
  FixedSizeListProps,
  FixedSizeListState
> {
  _outerRef: HTMLDivElement;
  _resetIsScrollingTimeoutId = null;
  lastPositions: RefObject<Map<string | number, number>>;
  needsAnimationRerender: RefObject<boolean>;
  animationEnabled: boolean;
  requestScrollUpdateHandled: boolean;
  anchored: null | {
    key: string | number;
    offset: number;
  } = null;
  rerenderTimeout: ReturnType<typeof setTimeout>;

  static defaultProps: Partial<FixedSizeListProps> = {
    direction: 'ltr',
    renderRow: undefined,
    layout: 'vertical',
    overscanCount: 2,
    useIsScrolling: false,
    headerHeight: 0,
  };

  constructor(props: FixedSizeListProps) {
    super(props);

    this.lastPositions = createRef();
    this.lastPositions.current = new Map();
    this.needsAnimationRerender = createRef();
    this.needsAnimationRerender.current = false;
    this.animationEnabled = false;

    this.state = {
      isScrolling: false,
      scrollDirection: 'forward',
      scrollOffset:
        typeof this.props.initialScrollOffset === 'number'
          ? this.props.initialScrollOffset
          : 0,
      scrollUpdateWasRequested: false,
    };
  }

  scrollTo(scrollOffset: number) {
    scrollOffset = Math.max(0, scrollOffset);

    this.setState(prevState => {
      if (prevState.scrollOffset === scrollOffset) {
        return null;
      }

      this.requestScrollUpdateHandled = false;
      return {
        scrollDirection:
          prevState.scrollOffset < scrollOffset ? 'forward' : 'backward',
        scrollOffset,
        scrollUpdateWasRequested: true,
      };
    }, this._resetIsScrollingDebounced);
  }

  scrollToItem(
    index: number,
    align: 'start' | 'end' | 'smart' | 'auto' | 'center' = 'auto',
  ) {
    const { itemCount } = this.props;
    const { scrollOffset } = this.state;

    index = Math.max(0, Math.min(index, itemCount - 1));

    this.scrollTo(
      this.getOffsetForIndexAndAlignment(index, align, scrollOffset),
    );
  }

  componentDidMount() {
    const { initialScrollOffset } = this.props;

    if (typeof initialScrollOffset === 'number' && this._outerRef != null) {
      let outerRef = this._outerRef;
      outerRef = this._outerRef;
      outerRef.scrollTop = initialScrollOffset;
    }

    this._callPropsCallbacks();
  }

  getAnchoredScrollPos() {
    if (this.anchored && this.props.indexForKey && this._outerRef != null) {
      const index = this.props.indexForKey(this.anchored.key);
      const baseOffset = this.getOffsetForIndexAndAlignment(index, 'start');
      return baseOffset + this.anchored.offset;
    }
    return null;
  }

  componentDidUpdate() {
    const { scrollOffset, scrollUpdateWasRequested } = this.state;

    const anchoredPos = this.getAnchoredScrollPos();
    if (anchoredPos != null) {
      const outerRef = this._outerRef;
      outerRef.scrollTop = anchoredPos;
    } else if (
      scrollUpdateWasRequested &&
      !this.requestScrollUpdateHandled &&
      this._outerRef != null
    ) {
      this.requestScrollUpdateHandled = true;
      const outerRef = this._outerRef;
      outerRef.scrollTop = scrollOffset;
    }

    if (this.needsAnimationRerender.current) {
      this.needsAnimationRerender.current = false;
      this.rerenderTimeout = setTimeout(() => {
        this.forceUpdate();
      }, 10);
    }

    this._callPropsCallbacks();
  }

  componentWillUnmount() {
    if (this._resetIsScrollingTimeoutId !== null) {
      clearTimeout(this._resetIsScrollingTimeoutId);
    }
  }

  render() {
    const {
      className,
      height,
      header,
      innerRef,
      itemCount,
      renderRow,
      itemKey = defaultItemKey,
      useIsScrolling,
      width,
    } = this.props;
    const { isScrolling } = this.state;

    const [startIndex, stopIndex] = this._getRangeToRender();
    const positions = new Map();

    const items = [];
    if (itemCount > 0) {
      for (let index = startIndex; index <= stopIndex; index++) {
        const key = itemKey(index);
        let style = this._getItemStyle(index);
        const lastPosition = this.lastPositions.current.get(key);
        let animating = false;
        positions.set(key, style.top);

        if (
          this.animationEnabled &&
          lastPosition != null &&
          lastPosition !== style.top
        ) {
          // A reorder has happened. Render it in the old place, then
          // animate it to the new one
          style = { ...style, top: lastPosition };
          this.needsAnimationRerender.current = true;
          animating = true;
        }

        items.push(
          renderRow({
            index,
            key,
            style,
            isScrolling: useIsScrolling ? isScrolling : undefined,
            isAnimating: animating,
          }),
        );
      }
    }

    this.lastPositions.current = positions;

    // Read this value AFTER items have been created,
    // So their actual sizes (if variable) are taken into consideration.
    const estimatedTotalSize = this.getEstimatedTotalSize();

    return (
      <div
        className={className}
        onScroll={this._onScrollVertical}
        ref={this._outerRefSetter}
        style={{
          height,
          width,
          overflow: 'hidden auto',
        }}
      >
        <View>{header}</View>
        <div
          ref={innerRef}
          style={{
            position: 'relative',
            height: estimatedTotalSize,
            width: '100%',
            pointerEvents: isScrolling ? 'none' : undefined,
          }}
        >
          {items}
        </div>
      </div>
    );
  }

  setRowAnimation = (flag: boolean) => {
    this.animationEnabled = flag;

    const outerRef = this._outerRef;
    if (outerRef) {
      if (this.animationEnabled) {
        outerRef.classList.add('animated');
      } else {
        outerRef.classList.remove('animated');
      }
    }
  };

  anchor() {
    const itemKey = this.props.itemKey || defaultItemKey;

    const outerRef = this._outerRef;
    const scrollOffset = outerRef ? outerRef.scrollTop : 0;
    const index = this.getStartIndexForOffset(scrollOffset);
    const key = itemKey(index);

    this.anchored = {
      key,
      offset: scrollOffset - this.getItemOffset(index),
    };
  }

  unanchor() {
    this.anchored = null;
  }

  isAnchored() {
    return this.anchored != null;
  }

  getItemOffset = (index: number) => index * this.props.itemSize;
  getItemSize = () => this.props.itemSize;
  getEstimatedTotalSize = () => this.props.itemSize * this.props.itemCount;

  getOffsetForIndexAndAlignment = (
    index: number,
    align: 'start' | 'end' | 'smart' | 'auto' | 'center',
    scrollOffset?: number,
  ) => {
    const size = this.props.height;
    const lastItemOffset = Math.max(
      0,
      this.props.itemCount * this.props.itemSize - size,
    );
    const maxOffset = Math.min(lastItemOffset, index * this.props.itemSize);
    const minOffset = Math.max(
      0,
      index * this.props.itemSize - size + this.props.itemSize,
    );

    if (align === 'smart') {
      if (
        scrollOffset >= minOffset - size &&
        scrollOffset <= maxOffset + size
      ) {
        align = 'auto';
      } else {
        align = 'center';
      }
    }

    switch (align) {
      case 'start':
        return maxOffset;
      case 'end':
        return minOffset;
      case 'center': {
        // "Centered" offset is usually the average of the min and max.
        // But near the edges of the list, this doesn't hold true.
        const middleOffset = Math.round(
          minOffset + (maxOffset - minOffset) / 2,
        );
        if (middleOffset < Math.ceil(size / 2)) {
          return 0; // near the beginning
        } else if (middleOffset > lastItemOffset + Math.floor(size / 2)) {
          return lastItemOffset; // near the end
        } else {
          return middleOffset;
        }
      }
      case 'auto':
      default:
        if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
          return scrollOffset;
        } else if (scrollOffset < minOffset) {
          return minOffset;
        } else {
          return maxOffset;
        }
    }
  };

  getStartIndexForOffset = (offset: number) =>
    Math.max(
      0,
      Math.min(
        this.props.itemCount - 1,
        Math.floor(offset / this.props.itemSize),
      ),
    );

  getStopIndexForStartIndex = (startIndex: number, scrollOffset: number) => {
    const offset = startIndex * this.props.itemSize;
    const size = this.props.height;
    const numVisibleItems = Math.ceil(
      (size + scrollOffset - offset) / this.props.itemSize,
    );
    return Math.max(
      0,
      Math.min(
        this.props.itemCount - 1,
        startIndex + numVisibleItems - 1, // -1 is because stop index is inclusive
      ),
    );
  };

  _callOnItemsRendered = memoizeOne(
    (
      overscanStartIndex,
      overscanStopIndex,
      visibleStartIndex,
      visibleStopIndex,
    ) =>
      this.props.onItemsRendered({
        overscanStartIndex,
        overscanStopIndex,
        visibleStartIndex,
        visibleStopIndex,
      }),
  );

  _callOnScroll = memoizeOne(
    (scrollDirection, scrollOffset, scrollUpdateWasRequested) =>
      this.props.onScroll({
        scrollDirection,
        scrollOffset,
        scrollUpdateWasRequested,
      }),
  );

  _callPropsCallbacks() {
    if (typeof this.props.onItemsRendered === 'function') {
      const { itemCount } = this.props;
      if (itemCount > 0) {
        const [
          overscanStartIndex,
          overscanStopIndex,
          visibleStartIndex,
          visibleStopIndex,
        ] = this._getRangeToRender();
        this._callOnItemsRendered(
          overscanStartIndex,
          overscanStopIndex,
          visibleStartIndex,
          visibleStopIndex,
        );
      }
    }

    if (typeof this.props.onScroll === 'function') {
      const { scrollDirection, scrollOffset, scrollUpdateWasRequested } =
        this.state;
      this._callOnScroll(
        scrollDirection,
        scrollOffset,
        scrollUpdateWasRequested,
      );
    }
  }

  // Lazily create and cache item styles while scrolling,
  // So that pure component sCU will prevent re-renders.
  // We maintain this cache, and pass a style prop rather than index,
  // So that List can clear cached styles and force item re-render if necessary.
  _getItemStyle = (index: number) => {
    const { direction, itemSize, layout } = this.props;

    const itemStyleCache = this._getItemStyleCache(itemSize, layout, direction);

    let style: CSSProperties;
    if (itemStyleCache.hasOwnProperty(index)) {
      style = itemStyleCache[index];
    } else {
      const offset = this.getItemOffset(index);
      const size = this.getItemSize();

      itemStyleCache[index] = style = {
        position: 'absolute',
        left: 0,
        top: offset,
        height: size,
        width: '100%',
      };
    }

    return style;
  };

  _getItemStyleCache = memoizeOne((_, __, ___) => ({}));

  _getRangeToRender() {
    const { itemCount, overscanCount } = this.props;
    const {
      isScrolling,
      scrollDirection,
      scrollOffset: originalScrollOffset,
    } = this.state;

    const anchoredPos = this.getAnchoredScrollPos();
    let scrollOffset = originalScrollOffset;
    if (anchoredPos != null) {
      scrollOffset = anchoredPos;
    }

    if (itemCount === 0) {
      return [0, 0, 0, 0];
    }

    const startIndex = this.getStartIndexForOffset(scrollOffset);
    const stopIndex = this.getStopIndexForStartIndex(startIndex, scrollOffset);

    // Overscan by one item in each direction so that tab/focus works.
    // If there isn't at least one extra item, tab loops back around.
    const overscanBackward =
      !isScrolling || scrollDirection === 'backward'
        ? Math.max(1, overscanCount)
        : 1;
    const overscanForward =
      !isScrolling || scrollDirection === 'forward'
        ? Math.max(1, overscanCount)
        : 1;

    return [
      Math.max(0, startIndex - overscanBackward),
      Math.max(0, Math.min(itemCount - 1, stopIndex + overscanForward)),
      startIndex,
      stopIndex,
    ];
  }

  _onScrollVertical = (event: UIEvent<HTMLDivElement>) => {
    const { scrollTop } = event.currentTarget;

    this.setState(prevState => {
      if (prevState.scrollOffset === scrollTop) {
        // Scroll position may have been updated by cDM/cDU,
        // In which case we don't need to trigger another render,
        // And we don't want to update state.isScrolling.
        return null;
      }

      const scrollOffset = scrollTop;

      return {
        isScrolling: true,
        scrollDirection:
          prevState.scrollOffset < scrollOffset ? 'forward' : 'backward',
        scrollOffset,
        scrollUpdateWasRequested: false,
      };
    }, this._resetIsScrollingDebounced);
  };

  _outerRefSetter = (ref: HTMLDivElement) => {
    const { outerRef } = this.props;

    this._outerRef = ref;

    if (
      outerRef != null &&
      typeof outerRef === 'object' &&
      outerRef.hasOwnProperty('current')
    ) {
      outerRef.current = ref;
    }
  };

  _resetIsScrollingDebounced = () => {
    if (this._resetIsScrollingTimeoutId !== null) {
      clearTimeout(this._resetIsScrollingTimeoutId);
    }

    this._resetIsScrollingTimeoutId = setTimeout(
      this._resetIsScrolling,
      IS_SCROLLING_DEBOUNCE_INTERVAL,
    );
  };

  _resetIsScrolling = () => {
    this._resetIsScrollingTimeoutId = null;

    this.setState({ isScrolling: false }, () => {
      // Clear style cache after state update has been committed.
      // This way we don't break pure sCU for items that don't use isScrolling param.
      // @ts-expect-error fix me
      this._getItemStyleCache(-1, null);
    });
  };
}
