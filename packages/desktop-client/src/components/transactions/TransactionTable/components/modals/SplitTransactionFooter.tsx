import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useFormat } from '@desktop-client/hooks/useFormat';

type SplitTransactionFooterProps = {
  isValid: boolean;
  remainingAmount: number;
  hasUncategorizedSplit: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export function SplitTransactionFooter({
  isValid,
  remainingAmount,
  hasUncategorizedSplit,
  onCancel,
  onSave,
}: SplitTransactionFooterProps) {
  const format = useFormat();

  return (
    <>
      {!isValid && (
        <View
          style={{
            padding: 12,
            backgroundColor: theme.warningBackground,
            borderRadius: 4,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 13, color: theme.warningText }}>
            {remainingAmount !== 0 && (
              <Trans>
                Splits must add up to the transaction amount.{' '}
                {format(Math.abs(remainingAmount), 'financial')} remaining.
              </Trans>
            )}
            {remainingAmount === 0 && hasUncategorizedSplit && (
              <Trans>All splits must have a category assigned.</Trans>
            )}
          </Text>
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: 12,
        }}
      >
        <Button variant="normal" onPress={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
        <Button variant="primary" onPress={onSave} isDisabled={!isValid}>
          <Trans>Save Splits</Trans>
        </Button>
      </View>
    </>
  );
}
