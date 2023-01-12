import React from 'react';

import memoizeOne from 'memoize-one';

import { View } from './common';
import useResizeObserver from './useResizeObserver';

const IS_SCROLLING_DEBOUNCE_INTERVAL = 150;

const defaultItemKey = (index, data) => index;

function ResizeObserver({ onResize, children }) {
  let ref = useResizeObserver(onResize);
  return children(ref);
}

export class FixedSizeList extends React.PureComponent {
  _outerRef;
  _resetIsScrollingTimeoutId = null;

  static defaultProps = {
    direction: 'ltr',
    renderRow: undefined,
    layout: 'vertical',
    overscanCount: 2,
    useIsScrolling: false,
    headerHeight: 0
  };

  constructor(props) {
    super(props);

    this.lastPositions = React.createRef();
    this.lastPositions.current = new Map();
    this.needsAnimationRerender = React.createRef();
    this.needsAnimationRerender.current = false;
    this.animationEnabled = false;

    this.state = {
      instance: this,
      isScrolling: false,
      scrollDirection: 'forward',
      scrollOffset:
        typeof this.props.initialScrollOffset === 'number'
          ? this.props.initialScrollOffset
          : 0,
      scrollUpdateWasRequested: false
    };
  }

  scrollTo(scrollOffset) {
    scrollOffset = Math.max(0, scrollOffset);

    this.setState(prevState => {
      if (prevState.scrollOffset === scrollOffset) {
        return null;
      }

      this.requestScrollUpdateHandled = false;
      return {
        scrollDirection:
          prevState.scrollOffset < scrollOffset ? 'forward' : 'backward',
        scrollOffset: scrollOffset,
        scrollUpdateWasRequested: true
      };
    }, this._resetIsScrollingDebounced);
  }

  scrollToItem(index, align = 'auto') {
    const { itemCount } = this.props;
    const { scrollOffset } = this.state;

    index = Math.max(0, Math.min(index, itemCount - 1));

    this.scrollTo(
      this.getOffsetForIndexAndAlignment(index, align, scrollOffset)
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
      let index = this.props.indexForKey(this.anchored.key);
      let baseOffset = this.getOffsetForIndexAndAlignment(index, 'start');
      return baseOffset + this.anchored.offset;
    }
    return null;
  }

  componentDidUpdate() {
    const { scrollOffset, scrollUpdateWasRequested } = this.state;

    let anchoredPos = this.getAnchoredScrollPos();
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
      innerElementType,
      innerTagName,
      itemCount,
      renderRow,
      itemKey = defaultItemKey,
      outerElementType,
      outerTagName,
      style,
      useIsScrolling,
      width
    } = this.props;
    const { isScrolling } = this.state;

    const [startIndex, stopIndex] = this._getRangeToRender();
    const positions = new Map();

    const items = [];
    if (itemCount > 0) {
      for (let index = startIndex; index <= stopIndex; index++) {
        let key = itemKey(index);
        let style = this._getItemStyle(index);
        let lastPosition = this.lastPositions.current.get(key);
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
            isAnimating: animating
          })
        );
      }
    }

    this.lastPositions.current = positions;

    // Read this value AFTER items have been created,
    // So their actual sizes (if variable) are taken into consideration.
    let estimatedTotalSize = this.getEstimatedTotalSize();

    let OuterElement = outerElementType || outerTagName || 'div';
    let InnerElement = innerElementType || innerTagName || 'div';

    return (
      <ResizeObserver onResize={this.onHeaderResize}>
        {headerRef => (
          <OuterElement
            className={className}
            onScroll={this._onScrollVertical}
            ref={this._outerRefSetter}
            style={{
              height,
              width,
              overflow: 'auto',
              ...style
            }}
          >
            <View innerRef={headerRef}>{header}</View>
            <InnerElement
              ref={innerRef}
              style={{
                position: 'relative',
                height: estimatedTotalSize,
                width: '100%',
                pointerEvents: isScrolling ? 'none' : undefined
              }}
            >
              {items}
            </InnerElement>
          </OuterElement>
        )}
      </ResizeObserver>
    );
  }

  setRowAnimation = flag => {
    this.animationEnabled = flag;

    let outerRef = this._outerRef;
    if (outerRef) {
      if (this.animationEnabled) {
        outerRef.classList.add('animated');
      } else {
        outerRef.classList.remove('animated');
      }
    }
  };

  onHeaderResize = rect => {
    // this.setState({ headerHeight: rect.height });
  };

  anchor() {
    let itemKey = this.props.itemKey || defaultItemKey;

    let outerRef = this._outerRef;
    let scrollOffset = outerRef ? outerRef.scrollTop : 0;
    let index = this.getStartIndexForOffset(scrollOffset);
    let key = itemKey(index);

    this.anchored = {
      key,
      offset: scrollOffset - this.getItemOffset(index)
    };
  }

  unanchor() {
    this.anchored = null;
  }

  isAnchored() {
    return this.anchored != null;
  }

  getItemOffset = index => index * this.props.itemSize;
  getItemSize = index => this.props.itemSize;
  getEstimatedTotalSize = () => this.props.itemSize * this.props.itemCount;

  getOffsetForIndexAndAlignment = (index, align, scrollOffset) => {
    const size = this.props.height;
    const lastItemOffset = Math.max(
      0,
      this.props.itemCount * this.props.itemSize - size
    );
    const maxOffset = Math.min(lastItemOffset, index * this.props.itemSize);
    const minOffset = Math.max(
      0,
      index * this.props.itemSize - size + this.props.itemSize
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
          minOffset + (maxOffset - minOffset) / 2
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

  getStartIndexForOffset = offset =>
    Math.max(
      0,
      Math.min(
        this.props.itemCount - 1,
        Math.floor(offset / this.props.itemSize)
      )
    );

  getStopIndexForStartIndex = (startIndex, scrollOffset) => {
    const offset = startIndex * this.props.itemSize;
    const size = this.props.width;
    const numVisibleItems = Math.ceil(
      (size + scrollOffset - offset) / this.props.itemSize
    );
    return Math.max(
      0,
      Math.min(
        this.props.itemCount - 1,
        startIndex + numVisibleItems - 1 // -1 is because stop index is inclusive
      )
    );
  };

  _callOnItemsRendered = memoizeOne(
    (
      overscanStartIndex,
      overscanStopIndex,
      visibleStartIndex,
      visibleStopIndex
    ) =>
      this.props.onItemsRendered({
        overscanStartIndex,
        overscanStopIndex,
        visibleStartIndex,
        visibleStopIndex
      })
  );

  _callOnScroll = memoizeOne(
    (scrollDirection, scrollOffset, scrollUpdateWasRequested) =>
      this.props.onScroll({
        scrollDirection,
        scrollOffset,
        scrollUpdateWasRequested
      })
  );

  _callPropsCallbacks() {
    if (typeof this.props.onItemsRendered === 'function') {
      const { itemCount } = this.props;
      if (itemCount > 0) {
        const [
          overscanStartIndex,
          overscanStopIndex,
          visibleStartIndex,
          visibleStopIndex
        ] = this._getRangeToRender();
        this._callOnItemsRendered(
          overscanStartIndex,
          overscanStopIndex,
          visibleStartIndex,
          visibleStopIndex
        );
      }
    }

    if (typeof this.props.onScroll === 'function') {
      const { scrollDirection, scrollOffset, scrollUpdateWasRequested } =
        this.state;
      this._callOnScroll(
        scrollDirection,
        scrollOffset,
        scrollUpdateWasRequested
      );
    }
  }

  // Lazily create and cache item styles while scrolling,
  // So that pure component sCU will prevent re-renders.
  // We maintain this cache, and pass a style prop rather than index,
  // So that List can clear cached styles and force item re-render if necessary.
  _getItemStyle = index => {
    const { direction, itemSize, layout } = this.props;

    const itemStyleCache = this._getItemStyleCache(itemSize, layout, direction);

    let style;
    if (itemStyleCache.hasOwnProperty(index)) {
      style = itemStyleCache[index];
    } else {
      const offset = this.getItemOffset(index);
      const size = this.getItemSize(index);

      itemStyleCache[index] = style = {
        position: 'absolute',
        left: 0,
        top: offset,
        height: size,
        width: '100%'
      };
    }

    return style;
  };

  _getItemStyleCache = memoizeOne((_, __, ___) => ({}));

  _getRangeToRender() {
    let { itemCount, overscanCount } = this.props;
    let { isScrolling, scrollDirection, scrollOffset } = this.state;

    let anchoredPos = this.getAnchoredScrollPos();
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
      stopIndex
    ];
  }

  _onScrollVertical = event => {
    let { scrollTop } = event.currentTarget;

    this.setState(prevState => {
      if (prevState.scrollOffset === scrollTop) {
        // Scroll position may have been updated by cDM/cDU,
        // In which case we don't need to trigger another render,
        // And we don't want to update state.isScrolling.
        return null;
      }

      let scrollOffset = scrollTop;

      return {
        isScrolling: true,
        scrollDirection:
          prevState.scrollOffset < scrollOffset ? 'forward' : 'backward',
        scrollOffset,
        scrollUpdateWasRequested: false
      };
    }, this._resetIsScrollingDebounced);
  };

  _outerRefSetter = ref => {
    const { outerRef } = this.props;

    this._outerRef = ref;

    if (typeof outerRef === 'function') {
      outerRef(ref);
    } else if (
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
      IS_SCROLLING_DEBOUNCE_INTERVAL
    );
  };

  _resetIsScrolling = () => {
    this._resetIsScrollingTimeoutId = null;

    this.setState({ isScrolling: false }, () => {
      // Clear style cache after state update has been committed.
      // This way we don't break pure sCU for items that don't use isScrolling param.
      this._getItemStyleCache(-1, null);
    });
  };
}
