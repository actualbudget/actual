import React, { useLayoutEffect, useRef, type ReactNode } from 'react';
import { type RefProp } from 'react-spring';

import { type CSSProperties } from '../../style';
import View from '../common/View';

type ReportTableProps = {
  saveScrollWidth?: (value: number) => void;
  listScrollRef?: RefProp<HTMLDivElement>;
  style?: CSSProperties;
  children?: ReactNode;
};

export default function ReportTable({
  saveScrollWidth,
  listScrollRef,
  style,
  children,
}: ReportTableProps) {
  let contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (contentRef.current && saveScrollWidth) {
      saveScrollWidth(contentRef.current ? contentRef.current.offsetWidth : 0);
    }
  });

  return (
    <View
      innerRef={listScrollRef}
      style={{
        overflowY: 'auto',
        scrollbarWidth: 'none',
        '::-webkit-scrollbar': { display: 'none' },
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
