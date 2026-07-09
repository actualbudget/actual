import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { useRefEventListener } from './useRefEventListener';

export function useCursorPosition(
  ref: RefObject<HTMLInputElement | null>,
): [number | null, (n: number | null) => void] {
  const doc = useRef(document);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  const update = () => {
    if (!ref.current || !document.hasFocus()) return;
    setCursorPosition(
      document.activeElement === ref.current
        ? ref.current.selectionStart
        : null,
    );
  };
  useRefEventListener(ref, 'focusin', update);
  useRefEventListener(ref, 'keyup', update);
  useRefEventListener(doc, 'selectionchange', update);
  useEffect(update, [ref, setCursorPosition]); // sync on mount

  const clear = () => {
    if (document.hasFocus()) {
      setCursorPosition(null);
    }
  };
  useRefEventListener(ref, 'focusout', clear);

  return [
    cursorPosition,
    (n: number | null) =>
      setTimeout(() => {
        ref.current?.setSelectionRange(n, n);
        document.dispatchEvent(new Event('selectionchange'));
      }),
  ];
}
