import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { Warning } from '@desktop-client/components/alerts';

type RefillAutomationProps = {
  hasLimitAutomation: boolean;
  onAddLimitAutomation?: () => void;
};

export function RefillAutomation({
  hasLimitAutomation,
  onAddLimitAutomation,
}: RefillAutomationProps) {
  const { t } = useTranslation();

  return (
    <SpaceBetween direction="vertical" gap={10} style={{ marginTop: 10 }}>
      <Text>
        <Trans>Uses the balance limit automation for this category.</Trans>
      </Text>
      {!hasLimitAutomation && (
        <Warning>
          <SpaceBetween gap={10} align="center" style={{ flexWrap: 'wrap' }}>
            <View>
              <Trans>
                Add a balance limit automation to set the refill target.
              </Trans>
            </View>
            {onAddLimitAutomation && (
              <Button
                variant="bare"
                onPress={onAddLimitAutomation}
                aria-label={t('Add balance limit automation')}
              >
                <Trans>Add balance limit</Trans>
              </Button>
            )}
          </SpaceBetween>
        </Warning>
      )}
    </SpaceBetween>
  );
}
