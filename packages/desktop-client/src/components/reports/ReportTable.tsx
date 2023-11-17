import React, { useLayoutEffect, useRef } from 'react';

import { type CSSProperties } from '../../style';
import View from '../common/View';

type ReportTableProps = {
  style?: CSSProperties;
  saveScrollWidth?;
  children;
};

export default function ReportTable({
  saveScrollWidth,
  style,
  children,
}: ReportTableProps) {
  let contentRef = useRef<HTMLDivElement>();

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
