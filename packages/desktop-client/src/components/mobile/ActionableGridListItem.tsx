import React, { type ReactNode, useRef, useState } from 'react';
import { GridListItem, type GridListItemProps } from 'react-aria-components';
import { useSpring, animated, config } from 'react-spring';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { useDrag } from '@use-gesture/react';

import { type WithRequired } from 'loot-core/types/util';

type ActionableGridListItemProps<T> = {
  actions?: ReactNode;
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
  const [isRevealed, setIsRevealed] = useState(false);

  const hasActions = !!actions;

  // Spring animation for the swipe
  const [{ x }, api] = useSpring(() => ({
    x: 0,
    config: config.stiff,
  }));

  // Handle drag gestures
  const bind = useDrag(
    ({ active, movement: [mx], velocity: [vx] }) => {
      const startPos = isRevealed ? -actionsWidth : 0;
      const currentX = startPos + mx;

      if (active) {
        dragStartedRef.current = true;
        api.start({ x: Math.max(-actionsWidth, Math.min(0, currentX)) });
        return;
      }

      // Snap to revealed (-actionsWidth) or closed (0) based on position and velocity
      const shouldReveal =
        currentX < -actionsWidth / 2 ||
        (vx < -0.5 && currentX < -actionsWidth / 5);

      api.start({
        x: shouldReveal ? -actionsWidth : 0,
        onRest: () => {
          dragStartedRef.current = false;
          setIsRevealed(shouldReveal);
        },
      });
    },
    {
      axis: 'x',
      from: () => [isRevealed ? -actionsWidth : 0, 0],
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
      value={value}
      textValue={textValue}
      style={{
        ...styles.mobileListItem,
        padding: 0,
        backgroundColor: hasActions ? actionsBackgroundColor : 'transparent',
      }}
      {...props}
    >
      <animated.div
        {...(hasActions ? bind() : {})}
        style={{
          ...(hasActions ? { x } : {}),
          display: 'flex',
          touchAction: hasActions ? 'none' : 'auto',
          cursor: hasActions ? 'grab' : 'pointer',
        }}
      >
        {/* Main content */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            backgroundColor: theme.tableBackground,
            minWidth: '100%',
            padding: 16,
          }}
          onClick={handleAction}
        >
          {children}
        </div>

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
            {actions}
          </div>
        )}
      </animated.div>
    </GridListItem>
  );
}
