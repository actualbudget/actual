import { useCallback, useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';
import { Popover as ReactAriaPopover } from 'react-aria-components';

import { css } from '@emotion/css';

import { styles } from './styles';

type PopoverProps = ComponentProps<typeof ReactAriaPopover>;

export const Popover = ({
  style = {},
  shouldCloseOnInteractOutside,
  ...props
}: PopoverProps) => {
  const ref = useRef<HTMLElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isNonModal, isOpen, onOpenChange } = props;

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      if (ref.current?.contains(e.relatedTarget as Node | null)) {
        return;
      }

      closeTimeoutRef.current = setTimeout(() => {
        if (!ref.current?.contains(document.activeElement)) {
          onOpenChange?.(false);
        }
      }, 0);
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (!isNonModal) return;
    if (isOpen) {
      ref.current?.addEventListener('focusout', handleFocus);
    } else {
      ref.current?.removeEventListener('focusout', handleFocus);
    }

    return () => {
      ref.current?.removeEventListener('focusout', handleFocus);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [handleFocus, isNonModal, isOpen]);

  return (
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
  );
};
