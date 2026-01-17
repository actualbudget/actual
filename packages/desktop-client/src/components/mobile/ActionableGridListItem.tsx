import React, { useRef, useState, type ReactNode } from 'react';
import { GridListItem, type GridListItemProps } from 'react-aria-components';
import { animated, config, useSpring } from 'react-spring';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { useDrag } from '@use-gesture/react';

import { type WithRequired } from 'loot-core/types/util';

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
        api.start({
          x: Math.max(-actionsWidth, Math.min(0, currentX)),
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
          }}
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
                    api.start({
                      x: 0,
                      onRest: () => {
                        setIsRevealed(false);
                      },
                    });
                  },
                })
              : actions}
          </div>
        )}
      </animated.div>
    </GridListItem>
  );
}
