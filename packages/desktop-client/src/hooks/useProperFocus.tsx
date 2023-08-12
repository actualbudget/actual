import React, {
  createContext,
  useRef,
  useLayoutEffect,
  useContext,
  useMemo,
  type RefObject,
  type ReactElement,
  type MutableRefObject,
} from 'react';

function getFocusedKey(el: HTMLElement): string | null {
  let node: HTMLElement | ParentNode = el;
  // Search up to 10 parent nodes
  for (let i = 0; i < 10 && node; i++) {
    let key = 'dataset' in node ? node.dataset?.focusKey : undefined;
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
    let key = getFocusedKey(el);
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
  keyRef: MutableRefObject<string>;
  onKeyChange: (key: string) => void;
};

let AvoidRefocusScrollContext =
  createContext<AvoidRefocusScrollContextValue>(null);

type AvoidRefocusScrollProviderProps = {
  children: ReactElement;
};

export function AvoidRefocusScrollProvider({
  children,
}: AvoidRefocusScrollProviderProps) {
  let keyRef = useRef<string>(null);

  let value = useMemo<AvoidRefocusScrollContextValue>(
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
  ref: RefObject<HTMLElement>,
  shouldFocus: boolean,
): void {
  let context = useContext(AvoidRefocusScrollContext);
  let prevShouldFocus = useRef(null);

  useLayoutEffect(() => {
    let prev = prevShouldFocus.current;
    let view = ref.current;

    if (view && shouldFocus && (prev === null || prev === false)) {
      let selector = 'input,button,div[tabindex]';
      let focusEl = view.matches(selector)
        ? view
        : view.querySelector<HTMLElement>(selector);

      if (shouldFocus && focusEl) {
        focusElement(focusEl, context);
      }
    }

    prevShouldFocus.current = shouldFocus;
  }, [shouldFocus]);
}
