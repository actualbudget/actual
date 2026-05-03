import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { useRefEventListener } from './useRefEventListener';

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
  const update = () => {
    const input = ref.current;
    if (!input) return;
    setCursorPosition(
      document.activeElement === input ? input.selectionStart : null,
    );
  };
  const clear = () => setCursorPosition(null);

  useRefEventListener(ref, 'focusin', update, [ref, setCursorPosition]);
  useRefEventListener(ref, 'input', update, [ref, setCursorPosition]);
  useRefEventListener(ref, 'keyup', update, [ref, setCursorPosition]);
  useRefEventListener(ref, 'focusout', clear, [setCursorPosition]);

  // sync on mount
  useEffect(update, [ref, setCursorPosition]);

  // listen for selectionchange which only gets fired on document
  const doc = useRef(document);
  useRefEventListener(doc, 'selectionchange', update, [ref, setCursorPosition]);

  return [cursorPosition, _setCursorPosition];
}
