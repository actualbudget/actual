import React, { useRef } from 'react';
import type { ReactNode } from 'react';
import { GridListItem } from 'react-aria-components';
import type { GridListItemProps } from 'react-aria-components';
import { animated, config, useSpring } from 'react-spring';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import type { WithRequired } from '@actual-app/core/types/util';
import { useDrag } from '@use-gesture/react';

import { hapticThresholdCrossed } from '#util/haptics';

type ActionableGridListItemProps<T> = {
  actions?: ReactNode | ((params: { close: () => void }) => ReactNode);
  actionsBackgroundColor?: string;
  actionsWidth?: number;
  children?: ReactNode;
} & Omit<WithRequired<GridListItemProps<T>, 'value'>, 'children'>;

export function ActionableGridListItem<T extends object>({
  value,
  textValue,
  actions,
  actionsBackgroundColor = theme.errorBackground,
  actionsWidth = 100,
  children,
  onAction,
  ...props
}: ActionableGridListItemProps<T>) {
  const dragStartedRef = useRef(false);
  const isPastThresholdRef = useRef(false);
  const dragStartXRef = useRef(0);

  const hasActions = !!actions;

  // Spring animation for the swipe
  const [{ x }, api] = useSpring(
    () => ({
      from: { x: 0 },
      config: config.stiff,
    }),
    [],
  );

  // Handle drag gestures
  const bind = useDrag(
    ({ active, first, movement: [mx], velocity: [vx] }) => {
      // Start from where the item actually is, so a swipe that interrupts a
      // snap animation continues from the current position.
      if (first) {
        dragStartXRef.current = x.get();
      }
      const currentX = dragStartXRef.current + mx;

      // Tick when the drag crosses the point where letting go flips between
      // revealed and closed, like native swipe actions do.
      const isPastThreshold = currentX < -actionsWidth / 2;
      if (first) {
        isPastThresholdRef.current = isPastThreshold;
      } else if (active && isPastThreshold !== isPastThresholdRef.current) {
        isPastThresholdRef.current = isPastThreshold;
        hapticThresholdCrossed();
      }

      if (active) {
        dragStartedRef.current = true;
        void api.start({
          to: { x: Math.max(-actionsWidth, Math.min(0, currentX)) },
          onRest: () => {
            dragStartedRef.current = false;
          },
        });
        return;
      }

      // Snap to revealed (-actionsWidth) or closed (0) based on position and velocity
      const shouldReveal =
        currentX < -actionsWidth / 2 ||
        (vx < -0.5 && currentX < -actionsWidth / 5);

      void api.start({
        to: { x: shouldReveal ? -actionsWidth : 0 },
        onRest: () => {
          dragStartedRef.current = false;
        },
      });
    },
    {
      axis: 'x',
      enabled: hasActions,
    },
  );

  // Prevent onAction from firing when dragging or if a drag was started
  const handleAction = () => {
    // Only allow action if no drag was started
    if (!dragStartedRef.current) {
      onAction?.();
    }
  };

  return (
    <GridListItem
      {...props}
      value={value}
      textValue={textValue}
      style={{
        ...styles.mobileListItem,
        padding: 0,
        backgroundColor: hasActions
          ? actionsBackgroundColor
          : (styles.mobileListItem.backgroundColor ?? 'transparent'),
        overflow: 'hidden',
      }}
    >
      <animated.div
        {...(hasActions ? bind() : {})}
        style={{
          ...(hasActions
            ? { transform: x.to(v => `translate3d(${v}px,0,0)`) }
            : {}),
          display: 'flex',
          touchAction: hasActions ? 'pan-y' : 'auto',
          cursor: hasActions ? 'grab' : 'pointer',
        }}
      >
        {/* Main content */}
        <Button
          variant="bare"
          style={{
            flex: 1,
            backgroundColor: theme.tableBackground,
            minWidth: '100%',
            padding: 16,
            textAlign: 'left',
            borderRadius: 0,
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
          }}
          onPressStart={e => e.continuePropagation()}
          onClick={handleAction}
        >
          {children}
        </Button>

        {/* Actions that appear when swiped */}
        {hasActions && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: actionsBackgroundColor,
              minWidth: actionsWidth,
            }}
          >
            {typeof actions === 'function'
              ? actions({
                  close: () => {
                    void api.start({ to: { x: 0 } });
                  },
                })
              : actions}
          </div>
        )}
      </animated.div>
    </GridListItem>
  );
}
