import {
  type ReactElement,
  type Ref,
  cloneElement,
  useEffect,
  useRef,
} from 'react';

type InitialFocusProps = {
  children?: ReactElement | ((node: Ref<HTMLInputElement>) => ReactElement);
};

export default function InitialFocus({ children }: InitialFocusProps) {
  let node = useRef(null);

  useEffect(() => {
    if (node.current && !global.IS_DESIGN_MODE) {
      // This is needed to avoid a strange interaction with
      // `ScopeTab`, which doesn't allow it to be focused at first for
      // some reason. Need to look into it.
      setTimeout(() => {
        if (node.current) {
          node.current.focus();
          node.current.setSelectionRange(0, 10000);
        }
      }, 0);
    }
  }, []);

  if (typeof children === 'function') {
    return children(node);
  }
  return cloneElement(children, { inputRef: node });
}
