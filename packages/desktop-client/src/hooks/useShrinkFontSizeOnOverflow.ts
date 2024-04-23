import { useEffect, useState, type RefObject } from 'react';

export function useShrinkFontSizeOnOverflow<T extends HTMLElement>({
  containerRef,
  initialFontSize,
  disabled,
}: {
  containerRef: RefObject<T>;
  initialFontSize: number;
  disabled?: boolean;
}) {
  const [fontSize, setFontSize] = useState(initialFontSize);
  useEffect(() => {
    if (!!disabled) {
      return;
    }

    const containerWidth = containerRef.current?.offsetWidth || 0;
    const textWidth = containerRef.current?.scrollWidth || 0;

    if (textWidth > containerWidth) {
      const newFontSize = Math.floor((containerWidth / textWidth) * fontSize);
      setFontSize(newFontSize);
    }
  }, [disabled, fontSize, containerRef]);

  return fontSize;
}
