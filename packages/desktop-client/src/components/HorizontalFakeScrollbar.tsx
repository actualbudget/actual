import React, { useState, useRef, type MouseEvent } from 'react';
import { useMove } from 'react-aria';

import { useColumnWidth } from './ColumnWidthContext';
import { useScroll } from './ScrollProvider';

export function HorizontalFakeScrollbar() {
  const { scrollX, scrollToX } = useScroll();
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startScroll, setStartScroll] = useState(0);
  const { totalWidth, clientWidth } = useColumnWidth();
  const [maxPosition, setMaxPosition] = useState(
    clientWidth - (clientWidth / totalWidth()) * clientWidth,
  );
  const [scrollbarPosition, setScrollbarPosition] = useState(0);

  const sliderWidth =
    (totalWidth() > clientWidth
      ? clientWidth - (totalWidth() - clientWidth)
      : 0) - 12;

  const handleMouseMove = (deltaX: number) => {
    const newLeft = Math.min(
      Math.max(startScroll + deltaX, 0),
      maxPosition - 12,
    );

    setStartScroll(newLeft);
    scrollToX(newLeft, false);

    if (scrollbarRef.current) {
      setScrollbarPosition(newLeft);
    }
  };

  const handleContainerClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!scrollbarRef.current) return;

    const clickX = event.clientX;
    const container = event.currentTarget;
    const containerRect = container.getBoundingClientRect();

    const clickPercent = (clickX - containerRect.left) / containerRect.width;
    let newLeft = Math.trunc(clickPercent * (totalWidth() - clientWidth));

    if (newLeft < 10) newLeft = 0;

    if (newLeft > clickX - containerRect.left - 10) {
      newLeft = clickX - containerRect.left;
    }

    scrollToX(newLeft, true);

    if (scrollbarRef.current) {
      setScrollbarPosition(newLeft);
    }
  };

  const { moveProps } = useMove({
    onMoveStart: () => {
      if (!scrollbarRef.current) return;

      setIsDragging(true);
      const rect = scrollbarRef.current.getBoundingClientRect();
      const currentLeft = rect.left || 0;
      setStartScroll(currentLeft);
      const maxPos = clientWidth - sliderWidth;
      setMaxPosition(maxPos);
    },
    onMove: e => {
      handleMouseMove(e.deltaX);
    },
    onMoveEnd: () => {
      if (!scrollX) return;

      setIsDragging(false);

      const maxPos = clientWidth - sliderWidth;
      const sliderPosition = (scrollX / totalWidth()) * maxPos;

      if (scrollbarRef.current) {
        setScrollbarPosition(sliderPosition);
      }

      setMaxPosition(maxPos);
    },
  });

  return (
    totalWidth() > clientWidth && (
      <div
        style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: 'calc(100% - 11px)',
          height: '12px',
          zIndex: 5000,
          backgroundColor: 'rgba(200, 200, 200, 0.2)',
          display: 'flex',
          alignItems: 'center',
          padding: 2,
          cursor: 'pointer',
        }}
        onClick={handleContainerClick}
      >
        <div
          ref={scrollbarRef}
          style={{
            width: `${sliderWidth}px`,
            marginTop: '2px',
            marginBottom: '2px',
            borderRadius: 10,
            height: '8px',
            backgroundColor: 'rgba(200, 200, 200, 1)',
            position: 'absolute',
            left: '0px',
            transform: `translateX(${scrollbarPosition}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s',
          }}
          {...moveProps}
        />
      </div>
    )
  );
}
