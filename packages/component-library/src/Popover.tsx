import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ComponentProps } from 'react';
import { Popover as ReactAriaPopover } from 'react-aria-components';

import { css } from '@emotion/css';

import { styles } from './styles';

type PopoverProps = ComponentProps<typeof ReactAriaPopover>;

// react-aria's default padding between the popover and the viewport edge
const DEFAULT_CONTAINER_PADDING = 12;

/**
 * Reads the device safe-area insets (e.g. the iOS status bar / notch and the
 * home indicator). react-aria positions popovers against the raw viewport and
 * doesn't know about these insets, so a long list could otherwise end up
 * underneath the status bar. Returns 0 on platforms without insets.
 */
function getSafeAreaInset(): number {
  if (typeof document === 'undefined' || !document.body) {
    return 0;
  }
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top);' +
    'padding-bottom:env(safe-area-inset-bottom);';
  document.body.appendChild(probe);
  const style = window.getComputedStyle(probe);
  const inset = Math.max(
    parseFloat(style.paddingTop) || 0,
    parseFloat(style.paddingBottom) || 0,
  );
  probe.remove();
  return inset;
}

export const Popover = ({
  style = {},
  shouldCloseOnInteractOutside,
  ...props
}: PopoverProps) => {
  const ref = useRef<HTMLElement>(null);

  // Re-measure whenever the popover opens, so device rotation is picked up.
  // `isOpen` is undefined when the popover is driven by a DialogTrigger.
  const containerPadding = useMemo(
    () =>
      DEFAULT_CONTAINER_PADDING +
      (props.isOpen === false ? 0 : getSafeAreaInset()),
    [props.isOpen],
  );

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
      containerPadding={containerPadding}
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
