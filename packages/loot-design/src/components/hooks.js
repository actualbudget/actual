import { useEffect, useRef } from 'react';

import { setThemeColor } from '../util/withThemeColor';

export function useScrollFlasher() {
  let scrollRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.flashScrollIndicators();
      }
    }, 1000);
  }, []);

  return scrollRef;
}

export function useSetThemeColor(color) {
  useEffect(() => {
    setThemeColor(color);
  }, [color, setThemeColor]);
}
