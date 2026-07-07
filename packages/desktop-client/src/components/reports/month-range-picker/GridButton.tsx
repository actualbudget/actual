import type { ReactNode } from 'react';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';

type GridButtonProps = {
  selected: boolean;
  disabled: boolean;
  /** Marks the current month/day so it stands out even when not selected. */
  isToday?: boolean;
  /** Cell falls strictly between the range endpoints (or the live hover
   * preview while picking the second endpoint). Painted with a flat band
   * background that visually joins the two selected endpoints. */
  inRange?: boolean;
  /** This cell is the start (`'start'`) or end (`'end'`) of the range band,
   * so its outer corner should stay rounded while the inner one joins the
   * band. Omitted for a single-day/-month range (no band to join). */
  rangeEdge?: 'start' | 'end';
  onSelect: () => void;
  /** Notified when the pointer enters this cell, to preview the range band
   * while picking the second endpoint. */
  onHover?: () => void;
  children: ReactNode;
};

export function GridButton({
  selected,
  disabled,
  isToday = false,
  inRange = false,
  rangeEdge,
  onSelect,
  onHover,
  children,
}: GridButtonProps) {
  return (
    <Button
      variant={selected ? 'primary' : 'bare'}
      isDisabled={disabled}
      onPress={onSelect}
      onHoverStart={onHover}
      style={{
        padding: '8px 4px',
        fontSize: 12,
        minWidth: 0,
        ...(isToday && {
          fontWeight: 'bold',
          // Ring the current period without shifting layout; when it's also
          // the selected (primary) cell the inset ring stays visible.
          boxShadow: `inset 0 0 0 1px ${theme.pageTextLink}`,
          ...(!selected && { color: theme.pageTextLink }),
        }),
        ...(inRange &&
          !selected && {
            backgroundColor: theme.pillBackgroundSelected,
            borderRadius:
              rangeEdge === 'start'
                ? '4px 0 0 4px'
                : rangeEdge === 'end'
                  ? '0 4px 4px 0'
                  : 0,
          }),
      }}
    >
      {children}
    </Button>
  );
}
