import React from 'react';

import { Button } from '@actual-app/components/button';
import { type CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { integerToCurrency } from 'loot-core/shared/util';
import { type TransactionEntity } from 'loot-core/types/models';

type TransactionErrorProps = {
  error: NonNullable<TransactionEntity['error']>;
  isDeposit: boolean;
  onAddSplit: () => void;
  onDistributeRemainder: () => void;
  style?: CSSProperties;
  canDistributeRemainder: boolean;
};

export function TransactionError({
  error,
  isDeposit,
  onAddSplit,
  onDistributeRemainder,
  style,
  canDistributeRemainder,
}: TransactionErrorProps) {
  switch (error.type) {
    case 'SplitTransactionError':
      if (error.version === 1) {
        return (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: '0 5px',
              ...style,
            }}
            data-testid="transaction-error"
          >
            <Text>
              Amount left:{' '}
              <Text style={{ fontWeight: 500 }}>
                {integerToCurrency(
                  isDeposit ? error.difference : -error.difference,
                )}
              </Text>
            </Text>
            <View style={{ flex: 1 }} />
            <Button
              variant="normal"
              style={{ marginLeft: 15 }}
              onPress={onDistributeRemainder}
              data-testid="distribute-split-button"
              isDisabled={!canDistributeRemainder}
            >
              Distribute
            </Button>
            <Button
              variant="primary"
              style={{ marginLeft: 10, padding: '4px 10px' }}
              onPress={onAddSplit}
              data-testid="add-split-button"
            >
              Add Split
            </Button>
          </View>
        );
      }
      break;
    default:
      return null;
  }
}
