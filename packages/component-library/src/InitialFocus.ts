import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  useEffect,
  useRef,
} from 'react';

type FocusableElement = HTMLElement;

type InitialFocusProps = {
  children: ReactElement;
  selectTextIfInput?: boolean;
};

export function InitialFocus({
  children,
  selectTextIfInput,
}: InitialFocusProps) {
  const node = useRef<FocusableElement>(null);

  useEffect(() => {
    if (node.current) {
      // This is needed to avoid a strange interaction with
      // `ScopeTab`, which doesn't allow it to be focused at first for
      // some reason. Need to look into it.
      setTimeout(() => {
        if (node.current) {
          node.current.focus();
          if (
            selectTextIfInput &&
            (node.current instanceof HTMLInputElement ||
              node.current instanceof HTMLTextAreaElement)
          ) {
            node.current.setSelectionRange(0, 10000);
          }
        }
      }, 0);
    }
  }, [selectTextIfInput]);

  const child = Children.only(children);
  if (isValidElement(child)) {
    // @ts-ignore `ref` is not a valid prop for the type that `cloneElement` expects, but this feature doesn't work without it.
    return cloneElement(child, { ref: node });
  }
  throw new Error(
    'InitialFocus expects a single valid React element as its child.',
  );
}
