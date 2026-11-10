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
  // a dependency array. Re-resolve it after every render and only rebind the
  // native listener when the element or `event` has actually changed.
  const bindingRef = useRef<{
    target: EventTarget;
    event: EventType;
    listener: EventListener;
  } | null>(null);

  useEffect(() => {
    const target =
      ref instanceof Document || ref instanceof Window ? ref : ref.current;
    const binding = bindingRef.current;
    if (binding && binding.target === target && binding.event === event) {
      return;
    }

    if (binding) {
      binding.target.removeEventListener(binding.event, binding.listener);
      bindingRef.current = null;
    }
    if (!target) return;

    const listener: EventListener = e =>
      callbackRef.current.call(
        target as ElementType,
        e as HTMLElementEventMap[EventType],
      );
    target.addEventListener(event, listener);
    bindingRef.current = { target, event, listener };
  });

  useEffect(() => {
    return () => {
      const binding = bindingRef.current;
      if (binding) {
        binding.target.removeEventListener(binding.event, binding.listener);
        bindingRef.current = null;
      }
    };
  }, []);
}
