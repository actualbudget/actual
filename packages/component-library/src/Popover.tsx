import { useCallback, useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';
import { Popover as ReactAriaPopover } from 'react-aria-components';

import { css } from '@emotion/css';

import { styles } from './styles';

type PopoverProps = ComponentProps<typeof ReactAriaPopover>;

export const Popover = ({
  style = {},
  shouldCloseOnInteractOutside,
  onOpenChange,
  triggerRef,
  ...props
}: PopoverProps) => {
  const ref = useRef<HTMLElement>(null);

  const shouldCloseForTarget = useCallback(
    (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      if (element && ref.current?.contains(element)) {
        return false;
      }

      // Don't close when interacting with the trigger element
      if (
        element &&
        triggerRef?.current &&
        (triggerRef.current === element || triggerRef.current.contains(element))
      ) {
        return false;
      }

      if (shouldCloseOnInteractOutside) {
        return element ? shouldCloseOnInteractOutside(element) : true;
      }

      return true;
    },
    [shouldCloseOnInteractOutside, triggerRef],
  );

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      if (!ref.current?.contains(e.relatedTarget as Node)) {
        onOpenChange?.(false);
      }
    },
    [onOpenChange],
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (shouldCloseForTarget(e.target)) {
        onOpenChange?.(false);
      }
    },
    [onOpenChange, shouldCloseForTarget],
  );

  // Custom listener needed: React Aria's built-in outside-click handling
  // may not fire for non-modal popovers when focus is outside the popover.
  useEffect(() => {
    if (!props.isNonModal) return;
    const element = ref.current;
    if (props.isOpen) {
      element?.addEventListener('focusout', handleFocus);
      window.addEventListener('pointerdown', handlePointerDown, true);
    } else {
      element?.removeEventListener('focusout', handleFocus);
      window.removeEventListener('pointerdown', handlePointerDown, true);
    }
    return () => {
      element?.removeEventListener('focusout', handleFocus);
      window.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [handleFocus, handlePointerDown, props.isNonModal, props.isOpen]);

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
      triggerRef={triggerRef}
      shouldCloseOnInteractOutside={element => {
        return shouldCloseForTarget(element);
      }}
      onOpenChange={onOpenChange}
      {...props}
    />
  );
};
