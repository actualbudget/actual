import type { ReactNode } from 'react';

import { Button } from '#Button';
import { theme } from '#theme';

import type { RangePosition } from './util';

type GridButtonProps = {
  selected: boolean;
  disabled: boolean;
  /** Marks the current month/day so it stands out even when not selected. */
  isToday?: boolean;
  /** Where the cell falls in the range band (or the hover preview). */
  position?: RangePosition;
  /** Full accessible name (e.g. the complete localized date). */
  label: string;
  onSelect: () => void;
  /** Called on pointer-enter to preview the range band. */
  onHover?: () => void;
  children: ReactNode;
};

export function GridButton({
  selected,
  disabled,
  isToday = false,
  position = null,
  label,
  onSelect,
  onHover,
  children,
}: GridButtonProps) {
  const inRange = position != null;
  const rangeEdge = position === 'middle' || position == null ? null : position;
  return (
    <Button
      variant={selected ? 'primary' : 'bare'}
      isDisabled={disabled}
      aria-label={label}
      aria-pressed={selected}
      onPress={onSelect}
      onHoverStart={onHover}
      style={{
        padding: '8px 4px',
        fontSize: 12,
        minWidth: 0,
        // Match the selected (primary) variant's 1px border so selecting a
        // cell doesn't resize the grid.
        ...(!selected && { border: '1px solid transparent' }),
        ...(isToday && {
          fontWeight: 'bold',
          // Inset ring marks the current period without shifting layout.
          boxShadow: `inset 0 0 0 1px ${theme.pageTextPositive}`,
          ...(!selected && { color: theme.pageTextPositive }),
        }),
        ...(inRange &&
          !selected && {
            backgroundColor: theme.datePickerRangeBackground,
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
