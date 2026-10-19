import { SvgMenu } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import type { ReorderScope } from '#hooks/useTouchReorder';

const HANDLE_WIDTH = 28;

type ReorderHandleProps = {
  scope: ReorderScope;
};

export function ReorderHandle({ scope }: ReorderHandleProps) {
  return (
    <View
      aria-hidden
      data-reorder-handle={scope}
      data-testid="reorder-handle"
      style={{
        width: HANDLE_WIDTH,
        alignSelf: 'stretch',
        minHeight: HANDLE_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginLeft: -spacing.xs,
        color: theme.pageTextLight,
        touchAction: 'none',
        cursor: 'grab',
      }}
    >
      <SvgMenu width={14} height={14} />
    </View>
  );
}
