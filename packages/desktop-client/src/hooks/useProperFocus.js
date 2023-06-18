import React, {
  createContext,
  useRef,
  useLayoutEffect,
  useContext,
  useMemo,
} from 'react';

function getFocusedKey(el) {
  let node = el;
  // Search up to 10 parent nodes
  for (let i = 0; i < 10 && node; i++) {
    let key = node.dataset && node.dataset.focusKey;
    if (key) {
      return key;
    }
    node = node.parentNode;
  }

  return null;
}

function focusElement(el, refocusContext) {
  if (refocusContext) {
    let key = getFocusedKey(el);
    el.focus({ preventScroll: key && key === refocusContext.keyRef.current });
    refocusContext.onKeyChange(key);
  } else {
    el.focus();
  }

  if (el.tagName === 'INPUT') {
    el.setSelectionRange(0, 10000);
  }
}

let AvoidRefocusScrollContext = createContext(null);

export function AvoidRefocusScrollProvider({ children }) {
  let keyRef = useRef(null);

  let value = useMemo(
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

export function useProperFocus(ref, shouldFocus) {
  let context = useContext(AvoidRefocusScrollContext);
  let prevShouldFocus = useRef(null);

  useLayoutEffect(() => {
    let prev = prevShouldFocus.current;
    let view = ref.current;

    if (view && shouldFocus && (prev === null || prev === false)) {
      let selector = 'input,button,div[tabindex]';
      let focusEl = view.matches(selector)
        ? view
        : view.querySelector(selector);

      if (shouldFocus && focusEl) {
        focusElement(focusEl, context);
      }
    }

    prevShouldFocus.current = shouldFocus;
  }, [shouldFocus]);
}
