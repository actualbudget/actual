import React, { useEffect, useRef, type ReactChild } from 'react';

import { type CSSProperties } from 'glamor';

import View from '../common/View';

type SimpleTableProps = {
  data: unknown;
  loadMore?: () => void;
  style?: CSSProperties;
  onHoverLeave?: () => void;
  children: ReactChild;
};

export default function SimpleTable({
  data,
  loadMore,
  style,
  onHoverLeave,
  children,
}: SimpleTableProps) {
  let contentRef = useRef<HTMLDivElement>();
  let contentHeight = useRef<number>();
  let scrollRef = useRef<HTMLDivElement>();

  function onScroll(e) {
    if (contentHeight.current != null) {
      if (loadMore && e.target.scrollTop > contentHeight.current - 750) {
        loadMore();
      }
    }
  }

  useEffect(() => {
    if (contentRef.current) {
      contentHeight.current = contentRef.current.getBoundingClientRect().height;
    } else {
      contentHeight.current = null;
    }
  }, [contentRef.current, data]);

  return (
    <View
      style={[
        {
          flex: 1,
          outline: 'none',
          '& .animated .animated-row': { transition: '.25s transform' },
        },
        style,
      ]}
      tabIndex={1}
      data-testid="table"
    >
      <View
        innerRef={scrollRef}
        style={{ maxWidth: '100%', overflow: 'auto' }}
        onScroll={onScroll}
      >
        <div ref={contentRef} onMouseLeave={onHoverLeave}>
          {children}
        </div>
      </View>
    </View>
  );
}
