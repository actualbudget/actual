// @ts-strict-ignore
import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactElement,
  type RefObject,
} from 'react';

function getFocusedKey(el: HTMLElement): string | null {
  let node: HTMLElement | ParentNode = el;
  // Search up to 10 parent nodes
  for (let i = 0; i < 10 && node; i++) {
    const key = 'dataset' in node ? node.dataset?.focusKey : undefined;
    if (key) {
      return key;
    }
    node = node.parentNode;
  }

  return null;
}

function focusElement(
  el: HTMLElement,
  refocusContext: AvoidRefocusScrollContextValue,
): void {
  if (refocusContext) {
    const key = getFocusedKey(el);
    el.focus({ preventScroll: key && key === refocusContext.keyRef.current });
    refocusContext.onKeyChange(key);
  } else {
    el.focus();
  }

  if (el instanceof HTMLInputElement) {
    el.setSelectionRange(0, 10000);
  }
}

type AvoidRefocusScrollContextValue = {
  keyRef: RefObject<string>;
  onKeyChange: (key: string) => void;
};

const AvoidRefocusScrollContext =
  createContext<AvoidRefocusScrollContextValue>(null);

type AvoidRefocusScrollProviderProps = {
  children: ReactElement;
};

export function AvoidRefocusScrollProvider({
  children,
}: AvoidRefocusScrollProviderProps) {
  const keyRef = useRef<string>(null);

  const value = useMemo<AvoidRefocusScrollContextValue>(
    () => ({
      keyRef,
      onKeyChange: key => {
        keyRef.current = key;
      },
    }),
    [keyRef],
  );

  return (
    <AvoidRefocusScrollContext.Provider value={value}>
      {children}
    </AvoidRefocusScrollContext.Provider>
  );
}

export function useProperFocus(
  ref: RefObject<HTMLElement | null>,
  shouldFocus = false,
): void {
  const context = useContext(AvoidRefocusScrollContext);
  const prevShouldFocus = useRef(null);

  useLayoutEffect(() => {
    const prev = prevShouldFocus.current;
    const view = ref.current;

    if (view && shouldFocus && (prev === null || prev === false)) {
      const selector = 'input,button,div[tabindex]';
      const focusEl = view.matches(selector)
        ? view
        : view.querySelector<HTMLElement>(selector);

      if (shouldFocus && focusEl) {
        focusElement(focusEl, context);
      }
    }

    prevShouldFocus.current = shouldFocus;
  }, [context, ref, shouldFocus]);
}
