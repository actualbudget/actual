import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export function useCursorPosition(
  ref: RefObject<HTMLInputElement | null>,
): [number | null, (n: number | null) => void] {
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  function _setCursorPosition(n: number | null) {
    setTimeout(() => ref.current?.setSelectionRange(n, n));
  }

  useEffect(() => {
    if (!ref.current) return;
    const input = ref.current;
    setCursorPosition(input.selectionStart);
    function updatePosition() {
      if (document.activeElement === input) {
        setCursorPosition(input.selectionStart);
      }
    }
    document.addEventListener('selectionchange', updatePosition);
    return () => {
      document.removeEventListener('selectionchange', updatePosition);
    };
  }, [ref]);

  return [cursorPosition, _setCursorPosition];
}
