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

  const bindingRef = useRef<{
    el: EventTarget;
    event: EventType;
    listener: EventListener;
  } | null>(null);

  // A ref object keeps its identity for the lifetime of the component and
  // mutating `current` doesn't re-run effects, so the element can't go in a
  // dependency array. Re-resolve it after every render instead and only touch
  // the native listener when it has actually moved. Elements do move: a
  // conditionally rendered trigger unmounts and remounts as a brand new node,
  // and a listener left on the detached original stops delivering events.
  useEffect(() => {
    const el =
      ref instanceof Document || ref instanceof Window ? ref : ref.current;
    const binding = bindingRef.current;

    if (binding && binding.el === el && binding.event === event) {
      return;
    }

    if (binding) {
      binding.el.removeEventListener(binding.event, binding.listener);
      bindingRef.current = null;
    }

    if (!el) {
      return;
    }

    const listener: EventListener = e =>
      callbackRef.current.call(
        el as ElementType,
        e as HTMLElementEventMap[EventType],
      );
    el.addEventListener(event, listener);
    bindingRef.current = { el, event, listener };
  });

  // The effect above deliberately registers no cleanup, so that re-running it
  // on every render doesn't unbind and rebind. Unbinding on unmount lives here.
  useEffect(
    () => () => {
      const binding = bindingRef.current;
      if (binding) {
        binding.el.removeEventListener(binding.event, binding.listener);
        bindingRef.current = null;
      }
    },
    [],
  );
}
