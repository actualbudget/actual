import { type Ref, useEffect, useState } from 'react';

import { type CSSProperties } from '../style';

export function useShrinkFontOnOverflow({
  textRef,
  initialFontSize,
  disabled,
}: {
  textRef: Ref<HTMLSpanElement>;
  initialFontSize: CSSProperties['fontSize'];
  disabled?: boolean;
}) {
  const [fontSize, setFontSize] = useState(initialFontSize);
  useEffect(() => {
    if (!!disabled) {
      return;
    }

    const containerWidth = textRef.current?.offsetWidth;
    const textWidth = textRef.current?.scrollWidth;

    if (textWidth > containerWidth) {
      const newFontSize = Math.floor((containerWidth / textWidth) * fontSize);
      setFontSize(newFontSize);
    }
  }, [disabled, fontSize, textRef]);

  return fontSize;
}
