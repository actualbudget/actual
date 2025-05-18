import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  Ref,
  useEffect,
  useRef,
} from 'react';

type InitialFocusProps<T extends HTMLElement> = {
  /**
   * The child element to focus when the component mounts. This can be either a single React element or a function that returns a React element.
   */
  children: ReactElement<{ ref: Ref<T> }> | ((ref: Ref<T>) => ReactElement);
};

/**
 * InitialFocus sets focus on its child element
 * when it mounts.
 * @param {Object} props - The component props.
 * @param {ReactElement | function} props.children - A single React element or a function that returns a React element.
 */
export function InitialFocus<T extends HTMLElement = HTMLElement>({
  children,
}: InitialFocusProps<T>) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (ref.current) {
      // This is needed to avoid a strange interaction with
      // `ScopeTab`, which doesn't allow it to be focused at first for
      // some reason. Need to look into it.
      setTimeout(() => {
        if (ref.current) {
          ref.current.focus();
          if (
            ref.current instanceof HTMLInputElement ||
            ref.current instanceof HTMLTextAreaElement
          ) {
            ref.current.setSelectionRange(0, 10000);
          }
        }
      }, 0);
    }
  }, []);

  if (typeof children === 'function') {
    return children(ref);
  }

  const child = Children.only(children);
  if (isValidElement(child)) {
    return cloneElement(child, { ref });
  }
  throw new Error(
    'InitialFocus expects a single valid React element as its child.',
  );
}
