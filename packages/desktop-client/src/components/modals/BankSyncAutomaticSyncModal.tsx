import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { AutomaticSyncSettings } from '#components/banksync/AutomaticSyncSettings';
import { MobileSheet } from '#components/mobile/MobileSheet';

export function BankSyncAutomaticSyncModal() {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  return (
    <MobileSheet
      name="bank-sync-automatic-sync"
      title={t('Automatic syncing')}
      hasWideDialogLabel
    >
      <View
        style={{
          maxWidth: isNarrowWidth ? undefined : 520,
          padding: isNarrowWidth
            ? `0 ${spacing.lg}px ${spacing.lg}px`
            : spacing.sm,
        }}
      >
        <AutomaticSyncSettings />
      </View>
    </MobileSheet>
  );
}
