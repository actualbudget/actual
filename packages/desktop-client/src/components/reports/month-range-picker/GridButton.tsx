import type { ReactNode } from 'react';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';

type GridButtonProps = {
  selected: boolean;
  disabled: boolean;
  /** Marks the current month/day so it stands out even when not selected. */
  isToday?: boolean;
  onSelect: () => void;
  children: ReactNode;
};

export function GridButton({
  selected,
  disabled,
  isToday = false,
  onSelect,
  children,
}: GridButtonProps) {
  return (
    <Button
      variant={selected ? 'primary' : 'bare'}
      isDisabled={disabled}
      onPress={onSelect}
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
      }}
    >
      {children}
    </Button>
  );
}
