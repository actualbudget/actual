import { useEffect, useState, type RefObject } from 'react';

export function useShrinkFontSizeOnOverflow({
  textRef,
  initialFontSize,
  disabled,
}: {
  textRef: RefObject<HTMLSpanElement>;
  initialFontSize: number;
  disabled?: boolean;
}) {
  const [fontSize, setFontSize] = useState(initialFontSize);
  useEffect(() => {
    if (!!disabled) {
      return;
    }

    const containerWidth = textRef.current?.offsetWidth || 0;
    const textWidth = textRef.current?.scrollWidth || 0;

    if (textWidth > containerWidth) {
      const newFontSize = Math.floor((containerWidth / textWidth) * fontSize);
      setFontSize(newFontSize);
    }
  }, [disabled, fontSize, textRef]);

  return fontSize;
}
