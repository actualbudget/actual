import { useCallback, useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';
import { Popover as ReactAriaPopover } from 'react-aria-components';

import { css } from '@emotion/css';

import { styles } from './styles';

type PopoverProps = ComponentProps<typeof ReactAriaPopover>;

let safeAreaBoundary: HTMLElement | null = null;

/**
 * A hidden fixed element covering the part of the viewport outside the
 * device safe-area insets (e.g. the iOS status bar and home indicator).
 * Used as the popover boundary so react-aria keeps popovers clear of them.
 * On platforms without insets it simply matches the viewport.
 */
function getSafeAreaBoundary(): HTMLElement | undefined {
  if (typeof document === 'undefined' || !document.body) {
    return undefined;
  }
  if (!safeAreaBoundary?.isConnected) {
    safeAreaBoundary = document.createElement('div');
    safeAreaBoundary.setAttribute('aria-hidden', 'true');
    safeAreaBoundary.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;' +
      'top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom);' +
      'left:env(safe-area-inset-left);right:env(safe-area-inset-right);';
    document.body.appendChild(safeAreaBoundary);
  }
  return safeAreaBoundary;
}

export const Popover = ({
  style = {},
  shouldCloseOnInteractOutside,
  ...props
}: PopoverProps) => {
  const ref = useRef<HTMLElement>(null);

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

  return (
    <ReactAriaPopover
      data-popover
      ref={ref}
      placement="bottom end"
      offset={1}
      boundaryElement={getSafeAreaBoundary()}
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
