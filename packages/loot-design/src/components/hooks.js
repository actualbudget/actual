import { useEffect, useRef } from 'react';

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
