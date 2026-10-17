import { theme } from '@actual-app/components/theme';
import { radius } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { ROW_PADDING_X } from './budgetTableStyles';

const INDICATOR_HEIGHT = 4;

type ReorderDropIndicatorProps = {
  top: number;
};

export function ReorderDropIndicator({ top }: ReorderDropIndicatorProps) {
  return (
    <View
      aria-hidden
      style={{
        position: 'absolute',
        left: ROW_PADDING_X,
        right: ROW_PADDING_X,
        top: top - INDICATOR_HEIGHT / 2,
        height: INDICATOR_HEIGHT,
        borderRadius: radius.sm,
        backgroundColor: theme.tableBorderSeparator,
        pointerEvents: 'none',
        zIndex: 3,
      }}
    />
  );
}
