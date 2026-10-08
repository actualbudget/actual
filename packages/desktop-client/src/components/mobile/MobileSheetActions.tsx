import type { ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

type MobileSheetActionsProps = {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: ReactNode;
  isDestructive?: boolean;
};

export function MobileSheetActions({
  onCancel,
  onConfirm,
  confirmLabel,
  isDestructive = false,
}: MobileSheetActionsProps) {
  const { isNarrowWidth } = useResponsive();
  const touchButtonStyle = isNarrowWidth
    ? { flex: 1, height: styles.mobileMinHeight, borderRadius: radius.sm }
    : {};

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: isNarrowWidth ? 'stretch' : 'flex-end',
        gap: spacing.sm,
        padding: isNarrowWidth ? spacing.lg : `${spacing.lg}px 0 0`,
        flexShrink: 0,
      }}
    >
      <Button variant="normal" onPress={onCancel} style={touchButtonStyle}>
        <Trans>Cancel</Trans>
      </Button>
      <Button
        variant="primary"
        onPress={onConfirm}
        style={{
          ...touchButtonStyle,
          ...(isNarrowWidth && { flex: 1.4 }),
          ...(isDestructive && {
            backgroundColor: theme.errorText,
            borderColor: theme.errorText,
          }),
        }}
      >
        {confirmLabel}
      </Button>
    </View>
  );
}
