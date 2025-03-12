import React, { useRef, type ReactNode, type UIEvent } from 'react';

import { View } from '@actual-app/components/view';

type InfiniteScrollWrapperProps = {
  loadMore?: () => void;
  children: ReactNode;
};

/**
 * Wrapper around an infinitely loading list.
 * Calls the `loadMore` callback when the bottom of the list is reached
 * by scrolling to the bottom of the list.
 */
export function InfiniteScrollWrapper({
  loadMore,
  children,
}: InfiniteScrollWrapperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function onScroll(e: UIEvent<HTMLElement>) {
    if (
      loadMore &&
      Math.abs(
        e.currentTarget.scrollHeight -
          e.currentTarget.clientHeight -
          e.currentTarget.scrollTop,
      ) < 1
    ) {
      loadMore();
    }
  }

  return (
    <View
      style={{
        flex: 1,
        outline: 'none',
        '& .animated .animated-row': { transition: '.25s transform' },

        // Hide the last border of the item in the table
        marginBottom: -1,
      }}
      tabIndex={1}
      data-testid="table"
    >
      <View
        innerRef={scrollRef}
        style={{ maxWidth: '100%', overflow: 'auto' }}
        onScroll={onScroll}
      >
        <div>{children}</div>
      </View>
    </View>
  );
}
