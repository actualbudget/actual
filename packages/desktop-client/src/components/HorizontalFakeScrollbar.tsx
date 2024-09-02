import React, { useState, useRef, type MouseEvent } from 'react';
import { useMove } from 'react-aria';

import { useScroll } from './ScrollProvider';

type HorizontalFakeScrollbarProps = {
  maxScroll: number;
  clientWidth: number;
};

export function HorizontalFakeScrollbar({
  maxScroll,
  clientWidth,
}: HorizontalFakeScrollbarProps) {
  const { scrollX, scrollToX } = useScroll();
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startScroll, setStartScroll] = useState(0); // State to hold the initial position of the slider
  const [maxPosition, setMaxPosition] = useState(
    clientWidth - (clientWidth / maxScroll) * clientWidth,
  ); // Initialize maxPosition

  const sliderWidth = (clientWidth / maxScroll) * clientWidth;

  const handleMouseMove = (deltaX: number) => {
    const newLeft = Math.min(Math.max(startScroll + deltaX, 0), maxPosition);

    if (isNaN(newLeft)) return;

    setStartScroll(newLeft);
    scrollToX(newLeft, false); // Scroll the content

    if (scrollbarRef.current) {
      scrollbarRef.current.style.transform = `translateX(${newLeft}px)`;
    }
  };

  const handleContainerClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!scrollbarRef.current) return;

    const container = event.currentTarget;
    const containerRect = container.getBoundingClientRect();
    const clickX = event.clientX - containerRect.left;
    const sliderWidth = (clientWidth / maxScroll) * clientWidth;
    const rect = scrollbarRef.current.getBoundingClientRect();
    const currentLeft = rect.left || 0;

    const newLeft =
      clickX > currentLeft
        ? Math.min(Math.max(clickX - sliderWidth, 0), maxPosition)
        : Math.min(Math.max(clickX, 0), maxPosition);

    scrollToX(newLeft, true);

    if (scrollbarRef.current) {
      scrollbarRef.current.style.transform = `translateX(${newLeft}px)`;
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
      const sliderPosition = (scrollX / maxScroll) * maxPos;

      if (scrollbarRef.current) {
        scrollbarRef.current.style.transform = `translateX(${sliderPosition}px)`;
      }

      setMaxPosition(maxPos);
    },
  });

  return (
    sliderWidth < clientWidth && (
      <div
        style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '100%',
          height: '11px',
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
            margin: '2px',
            borderRadius: 10,
            height: '100%',
            backgroundColor: 'rgba(200, 200, 200, 1)',
            position: 'absolute',
            left: '0px',
            transition: isDragging ? 'none' : 'transform 0.2s',
          }}
          {...moveProps}
        />
      </div>
    )
  );
}
