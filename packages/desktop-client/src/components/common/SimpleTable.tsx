// @ts-strict-ignore
import React, { type ReactNode, type UIEvent, useRef } from 'react';

import { type CSSProperties } from '../../style';

import { View } from './View';

type SimpleTableProps = {
  loadMore?: () => void;
  style?: CSSProperties;
  onHoverLeave?: () => void;
  children: ReactNode;
};

export function SimpleTable({
  loadMore,
  style,
  onHoverLeave,
  children,
}: SimpleTableProps) {
  const contentRef = useRef<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>();

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
        ...style,
      }}
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
