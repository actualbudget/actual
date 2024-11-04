import React, { type CSSProperties } from 'react';

import { envelopeBudget } from 'loot-core/client/queries';
import { amountToCurrency, integerToAmount } from 'loot-core/shared/util';
import type { CategoryGroupEntity } from 'loot-core/types/models';

import { theme, styles } from '../../style';
import { BudgetMenuGroup } from '../budget/envelope/BudgetMenuGroup';
import { useEnvelopeSheetValue } from '../budget/envelope/EnvelopeBudgetComponents';
import { makeAmountFullStyle } from '../budget/util';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';

type EnvelopeBudgetGroupMenuModalProps = {
  group: CategoryGroupEntity;
  onApplyGroupTemplate: () => void;
};

export function EnvelopeBudgetGroupMenuModal({
  group,
  onApplyGroupTemplate,
}: EnvelopeBudgetGroupMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };
  const budgeted = useEnvelopeSheetValue(
    envelopeBudget.groupBudgeted(group.id),
  );
  const value = integerToAmount(budgeted || 0);

  if (!group) {
    return null;
  }

  return (
    <Modal name="envelope-budget-group-menu">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={<ModalTitle title={group.name} shrinkOnOverflow />}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: 400,
              }}
            >
              Budgeted
            </Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderColor: '#e0e0e0',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  ...makeAmountFullStyle(value),
                  userSelect: 'none',
                  fontSize: 30,
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {amountToCurrency(Math.abs(value))}
              </Text>
            </View>
          </View>
          <BudgetMenuGroup
            getItemStyle={() => defaultMenuItemStyle}
            onApplyGroupTemplate={onApplyGroupTemplate}
          />
        </>
      )}
    </Modal>
  );
}
