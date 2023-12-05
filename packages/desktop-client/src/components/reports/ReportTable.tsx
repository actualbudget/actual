import React, { useLayoutEffect, useRef } from 'react';

import View from '../common/View';

export default function ReportTable({ saveScrollWidth, style, children }) {
  const contentRef = useRef<HTMLDivElement>();

  useLayoutEffect(() => {
    if (contentRef.current && saveScrollWidth) {
      saveScrollWidth(
        contentRef.current.offsetParent
          ? contentRef.current.parentElement.offsetWidth
          : 0,
        contentRef.current ? contentRef.current.offsetWidth : 0,
      );
    }
  });

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
      <View>
        <div ref={contentRef}>{children}</div>
      </View>
    </View>
  );
}
