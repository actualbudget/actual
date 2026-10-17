import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useRefEventListener<
  ElementType extends EventTarget,
  EventType extends keyof HTMLElementEventMap,
>(
  ref: RefObject<ElementType | null> | Document | Window,
  event: EventType,
  // oxlint-disable-next-line typescript/no-explicit-any
  callback: (this: ElementType, ev: HTMLElementEventMap[EventType]) => any,
) {
  // Keep the latest callback in a ref so the effect below doesn't need to
  // depend on it. Callers routinely pass a new inline function every render,
  // which would otherwise tear down and re-add the native listener on every
  // render instead of only when the target element or `event` change.
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // Mutating `ref.current` doesn't re-run effects, so the element can't go in
  // a dependency array. Re-resolve it after every render and rebind only
  // when it (or the event) actually changed. This deliberately avoids
  // mirroring the element into state: that would schedule an extra render
  // every time a component using this hook mounts, and a virtualized list
  // mounting many rows while scrolling can then trip React's "Maximum
  // update depth exceeded" guard (#9170).
  const boundRef = useRef<{
    target: EventTarget;
    event: EventType;
    listener: EventListener;
  } | null>(null);

  // oxlint-disable-next-line react-hooks/exhaustive-deps -- must run every render to notice a swapped element
  useEffect(() => {
    const target =
      ref instanceof Document || ref instanceof Window ? ref : ref.current;
    const bound = boundRef.current;
    if (bound?.target === target && bound?.event === event) return;

    unbind(boundRef);
    if (!target) return;

    const listener: EventListener = e =>
      callbackRef.current.call(
        target as ElementType,
        e as HTMLElementEventMap[EventType],
      );
    target.addEventListener(event, listener);
    boundRef.current = { target, event, listener };
  });

  useEffect(() => () => unbind(boundRef), []);
}

function unbind(
  boundRef: RefObject<{
    target: EventTarget;
    event: string;
    listener: EventListener;
  } | null>,
) {
  const bound = boundRef.current;
  if (!bound) return;
  bound.target.removeEventListener(bound.event, bound.listener);
  boundRef.current = null;
}
