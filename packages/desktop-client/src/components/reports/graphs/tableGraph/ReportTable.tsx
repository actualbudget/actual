import React, {
  type UIEventHandler,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from 'react';
import { type RefProp } from 'react-spring';

import { type CSSProperties } from '../../../../style';
import View from '../../../common/View';

type ReportTableProps = {
  saveScrollWidth?: (value: number) => void;
  listScrollRef?: RefProp<HTMLDivElement>;
  style?: CSSProperties;
  children?: ReactNode;
  handleScroll?: UIEventHandler<HTMLDivElement>;
};

export default function ReportTable({
  saveScrollWidth,
  listScrollRef,
  style,
  children,
  handleScroll,
}: ReportTableProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (contentRef.current && saveScrollWidth) {
      saveScrollWidth(contentRef.current ? contentRef.current.offsetWidth : 0);
    }
  });

  return (
    <View
      innerRef={listScrollRef}
      onScroll={handleScroll}
      id="list"
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
    >
      <View>
        <div ref={contentRef}>{children}</div>
      </View>
    </View>
  );
}
