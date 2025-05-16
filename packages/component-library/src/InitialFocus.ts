import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  Ref,
  useEffect,
  useRef,
} from 'react';

type FocusableElement = HTMLElement;

type InitialFocusProps = {
  /**
   * The child element to focus when the component mounts. This can be either a single React element or a function that returns a React element.
   */
  children:
    | ReactElement<{ ref: Ref<HTMLElement> }>
    | ((node: Ref<HTMLElement>) => ReactElement);
};

/**
 * InitialFocus sets focus on its child element
 * when it mounts.
 * @param {Object} props - The component props.
 * @param {ReactElement | function} props.children - A single React element or a function that returns a React element.
 */
export function InitialFocus({ children }: InitialFocusProps) {
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
            node.current instanceof HTMLInputElement ||
            node.current instanceof HTMLTextAreaElement
          ) {
            node.current.setSelectionRange(0, 10000);
          }
        }
      }, 0);
    }
  }, []);

  if (typeof children === 'function') {
    return children(node);
  }

  const child = Children.only(children);
  if (isValidElement(child)) {
    return cloneElement(child, { ref: node });
  }
  throw new Error(
    'InitialFocus expects a single valid React element as its child.',
  );
}
