import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { useRefEventListener } from './useRefEventListener';

export function useCursorPosition(
  ref: RefObject<HTMLInputElement | null>,
): [number | null, (n: number | null) => void] {
  // this section serves to prevent losing cursor position from being
  // when alt tabbing to/from the application. Similar functionality exists
  // in the regular Autocomplete
  const win = useRef(window);
  const allowChangeRef = useRef(true);
  const enableChange = () => setTimeout(() => (allowChangeRef.current = true));
  const disableChange = () => (allowChangeRef.current = false);
  useRefEventListener(win, 'focus', enableChange, []);
  useRefEventListener(win, 'blur', disableChange, [], { capture: true }); // capture to get as early as possible in the focus chain

  const doc = useRef(document);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  const update = () => {
    if (!ref.current || !allowChangeRef.current) return;
    setCursorPosition(
      document.activeElement === ref.current
        ? ref.current.selectionStart
        : null,
    );
  };
  const deps = [ref, allowChangeRef, setCursorPosition];
  useRefEventListener(ref, 'focusin', update, deps);
  useRefEventListener(ref, 'keyup', update, deps);
  useRefEventListener(doc, 'selectionchange', update, deps);
  useEffect(update, [ref, allowChangeRef, setCursorPosition]); // sync on mount

  const clear = () => {
    if (!allowChangeRef.current) return;
    setCursorPosition(null);
  };
  useRefEventListener(ref, 'focusout', clear, [setCursorPosition]);

  return [
    cursorPosition,
    (n: number | null) =>
      setTimeout(() => {
        ref.current?.setSelectionRange(n, n);
        document.dispatchEvent(new Event('selectionchange'));
      }),
  ];
}
