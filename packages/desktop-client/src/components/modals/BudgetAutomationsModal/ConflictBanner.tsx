import { SvgAlertTriangle } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  GlobalConflictDetail,
  GlobalConflictTitle,
} from '#components/budget/goals/automationMessages';
import type { GlobalConflictKind } from '#components/budget/goals/validateAutomation';

type ConflictBannerProps = {
  conflict: GlobalConflictKind;
};

export function ConflictBanner({ conflict }: ConflictBannerProps) {
  return (
    <View
      style={{
        padding: '8px 22px',
        backgroundColor: theme.errorBackground,
        borderBottom: `1px solid ${theme.errorBorder}`,
        color: theme.errorText,
        fontSize: 12,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <SvgAlertTriangle width={14} height={14} style={{ color: 'inherit' }} />
      <Text style={{ color: 'inherit' }}>
        <strong>
          <GlobalConflictTitle conflict={conflict} />.
        </strong>{' '}
        <GlobalConflictDetail conflict={conflict} />
      </Text>
    </View>
  );
}
