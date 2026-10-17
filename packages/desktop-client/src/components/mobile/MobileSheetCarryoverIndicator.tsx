import type { CSSProperties } from '@actual-app/components/styles';

import { CarryoverIndicator } from '#components/budget/BalanceWithCarryover';

type MobileSheetCarryoverIndicatorProps = {
  style?: CSSProperties;
};

export function MobileSheetCarryoverIndicator({
  style,
}: MobileSheetCarryoverIndicatorProps) {
  return (
    <CarryoverIndicator
      style={{
        width: 15,
        height: 15,
        display: 'inline-flex',
        position: 'relative',
        // Reset the default indicator's absolute offsets so it flows inline
        // next to the balance instead of being nudged out of the row.
        top: 'auto',
        bottom: 'auto',
        right: 'auto',
        ...style,
      }}
    />
  );
}
