import React, { useState, useEffect, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as Platform from 'loot-core/shared/platform';
import { amountToInteger, integerToAmount } from 'loot-core/shared/util';

import { type Modal as ModalType } from '../../modals/modalsSlice';
import { BudgetMenu } from '../budget/envelope/BudgetMenu';
import { useEnvelopeSheetValue } from '../budget/envelope/EnvelopeBudgetComponents';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';
import { FocusableAmountInput } from '../mobile/transactions/FocusableAmountInput';

import { useCategory } from '@desktop-client/hooks/useCategory';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type EnvelopeBudgetMenuModalProps = Omit<
  Extract<ModalType, { name: 'envelope-budget-menu' }>['options'],
  'month'
>;

export function EnvelopeBudgetMenuModal({
  categoryId,
  onUpdateBudget,
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
}: EnvelopeBudgetMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  const { t } = useTranslation();
  const budgeted = useEnvelopeSheetValue(
    envelopeBudget.catBudgeted(categoryId),
  );
  const category = useCategory(categoryId);
  const [amountFocused, setAmountFocused] = useState(false);

  const _onUpdateBudget = (amount: number) => {
    onUpdateBudget?.(amountToInteger(amount));
  };

  useEffect(() => {
    // iOS does not support automatically opening up the keyboard for the
    // total amount field. Hence we should not focus on it on page render.
    if (!Platform.isIOSAgent) {
      setAmountFocused(true);
    }
  }, []);

  if (!category) {
    return null;
  }

  return (
    <Modal name="envelope-budget-menu">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={<ModalTitle title={category.name} shrinkOnOverflow />}
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
              {t('Budgeted')}
            </Text>
            <FocusableAmountInput
              value={integerToAmount(budgeted || 0)}
              focused={amountFocused}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              onEnter={close}
              zeroSign="+"
              focusedStyle={{
                width: 'auto',
                padding: '5px',
                paddingLeft: '20px',
                paddingRight: '20px',
                minWidth: '100%',
              }}
              textStyle={{ ...styles.veryLargeText, textAlign: 'center' }}
              onUpdateAmount={_onUpdateBudget}
              data-testid="budget-amount"
            />
          </View>
          <BudgetMenu
            getItemStyle={() => defaultMenuItemStyle}
            onCopyLastMonthAverage={onCopyLastMonthAverage}
            onSetMonthsAverage={onSetMonthsAverage}
            onApplyBudgetTemplate={onApplyBudgetTemplate}
          />
        </>
      )}
    </Modal>
  );
}
