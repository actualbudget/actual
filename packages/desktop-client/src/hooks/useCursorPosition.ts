import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export function useCursorPosition(
  ref: RefObject<HTMLInputElement | null>,
): [number | null, (n: number | null) => void] {
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  function _setCursorPosition(n: number | null) {
    setTimeout(() => {
      ref.current?.setSelectionRange(n, n);
      document.dispatchEvent(new Event('selectionchange'));
    });
  }

  useEffect(() => {
    if (!ref.current) return;
    const input = ref.current;
    setCursorPosition(input.selectionStart);
    const update = () => setCursorPosition(input.selectionStart);
    const clear = () => setCursorPosition(null);
    function updatePosition() {
      if (document.activeElement === input) {
        update();
      }
    }
    document.addEventListener('selectionchange', updatePosition);
    input.addEventListener('focusin', update);
    input.addEventListener('focusout', clear);
    return () => {
      document.removeEventListener('selectionchange', updatePosition);
      input.removeEventListener('focusin', update);
      input.removeEventListener('focusout', clear);
    };
  }, [ref]);

  return [cursorPosition, _setCursorPosition];
}
