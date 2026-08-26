import { useEffect, useRef, useState } from 'react';
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
  // render instead of only when `ref`/`event` change.
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const isStaticTarget = ref instanceof Document || ref instanceof Window;

  // `ref.current` can change without a re-render of this hook (e.g. a
  // caller conditionally unmounts the element the ref is attached to and
  // mounts a different one in its place, reusing the same RefObject). The
  // effect below needs to know when that happens so it can rebind to the
  // new element instead of staying attached to the detached one.
  const [target, setTarget] = useState<ElementType | null>(
    isStaticTarget ? null : ref.current,
  );
  // Deliberately runs every render (no deps) to notice when `ref.current`
  // points at a different element than last time, since ref mutations don't
  // themselves trigger a re-render. React bails out of the update when
  // `setTarget` is called with the same value, so this doesn't loop.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- must run every render, see comment above
  useEffect(() => {
    if (!isStaticTarget) setTarget(ref.current);
  });

  useEffect(() => {
    const el = isStaticTarget ? ref : target;
    if (!el) return;

    const listener: EventListener = e =>
      callbackRef.current.call(
        el as ElementType,
        e as HTMLElementEventMap[EventType],
      );
    el.addEventListener(event, listener);
    return () => {
      el.removeEventListener(event, listener);
    };
  }, [isStaticTarget, ref, event, target]);
}
