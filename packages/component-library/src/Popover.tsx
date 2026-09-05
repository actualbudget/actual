import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import type { ComponentProps, RefObject } from 'react';
import { Popover as ReactAriaPopover } from 'react-aria-components';

import { css } from '@emotion/css';

import { styles } from './styles';

type PopoverProps = ComponentProps<typeof ReactAriaPopover> & {
  shouldCloseParentOnInteractOutside?: boolean;
};

type PopoverContextValue = {
  ref: RefObject<HTMLElement | null>;
  closeOnInteractOutside: (element: Element) => void;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

export const Popover = ({
  style = {},
  shouldCloseOnInteractOutside,
  shouldCloseParentOnInteractOutside = false,
  ...props
}: PopoverProps) => {
  const ref = useRef<HTMLElement>(null);
  const parentPopover = useContext(PopoverContext);

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      if (!ref.current?.contains(e.relatedTarget as Node)) {
        props.onOpenChange?.(false);
      }
    },
    [props],
  );

  useEffect(() => {
    if (!props.isNonModal) return;
    if (props.isOpen) {
      ref.current?.addEventListener('focusout', handleFocus);
    } else {
      ref.current?.removeEventListener('focusout', handleFocus);
    }
  }, [handleFocus, props.isNonModal, props.isOpen]);

  useEffect(() => {
    if (
      !shouldCloseParentOnInteractOutside ||
      !props.isOpen ||
      !parentPopover
    ) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        !ref.current?.contains(event.target)
      ) {
        parentPopover.closeOnInteractOutside(event.target);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [parentPopover, props.isOpen, shouldCloseParentOnInteractOutside]);

  const contextValue = {
    ref,
    closeOnInteractOutside: (element: Element) => {
      if (!ref.current?.contains(element)) {
        props.onOpenChange?.(false);
      }
    },
  };

  return (
    <PopoverContext.Provider value={contextValue}>
      <ReactAriaPopover
        data-popover
        ref={ref}
        placement="bottom end"
        offset={1}
        className={css({
          ...styles.tooltip,
          ...styles.lightScrollbar,
          padding: 0,
          userSelect: 'none',
          ...style,
        })}
        shouldCloseOnInteractOutside={element => {
          if (shouldCloseOnInteractOutside) {
            return shouldCloseOnInteractOutside(element);
          }

          return true;
        }}
        {...props}
      />
    </PopoverContext.Provider>
  );
};
