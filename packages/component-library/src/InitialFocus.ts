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
  children: ReactElement | ((node: Ref<HTMLInputElement>) => ReactElement);
  /**
   * Whether to select the text in the input or textarea element when focused.
   */
  selectText?: boolean;
};

/**
 * InitialFocus sets focus on its child element
 * when it mounts. It can also optionally select the text within an
 * input or textarea element.
 * @param {Object} props - The component props.
 * @param {ReactElement | function} props.children - A single React element or a function that returns a React element.
 * @param {boolean} props.selectText=false - Whether to select the text in the input or textarea element.
 */
export function InitialFocus({ children, selectText }: InitialFocusProps) {
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
            selectText &&
            (node.current instanceof HTMLInputElement ||
              node.current instanceof HTMLTextAreaElement)
          ) {
            node.current.setSelectionRange(0, 10000);
          }
        }
      }, 0);
    }
  }, [selectText]);

  if (typeof children === 'function') {
    return children(node as Ref<HTMLInputElement>);
  }

  const child = Children.only(children);
  if (isValidElement(child)) {
    // @ts-ignore `ref` is not a valid prop for the type that `cloneElement` expects, but this feature doesn't work without it.
    return cloneElement(child, { ref: node });
  }
  throw new Error(
    'InitialFocus expects a single valid React element as its child.',
  );
}
