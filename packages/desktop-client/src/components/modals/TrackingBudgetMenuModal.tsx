import React, {
  useState,
  type ComponentPropsWithoutRef,
  useEffect,
  type CSSProperties,
} from 'react';

import { trackingBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import { amountToInteger, integerToAmount } from 'loot-core/shared/util';

import { useCategory } from '../../hooks/useCategory';
import { theme, styles } from '../../style';
import { BudgetMenu } from '../budget/tracking/BudgetMenu';
import { useTrackingSheetValue } from '../budget/tracking/TrackingBudgetComponents';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FocusableAmountInput } from '../mobile/transactions/FocusableAmountInput';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

const MODAL_NAME = 'tracking-budget-menu' as const;

type TrackingBudgetMenuModalProps = ComponentPropsWithoutRef<
  typeof BudgetMenu
> & {
  name: typeof MODAL_NAME;
  month: string;
  categoryId: string;
  onUpdateBudget: (amount: number) => void;
};

export function TrackingBudgetMenuModal({
  name = MODAL_NAME,
  month,
  categoryId,
  onUpdateBudget,
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
}: TrackingBudgetMenuModalProps) {
  return (
    <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
      <TrackingBudgetMenuModalInner
        name={name}
        categoryId={categoryId}
        onUpdateBudget={onUpdateBudget}
        onCopyLastMonthAverage={onCopyLastMonthAverage}
        onSetMonthsAverage={onSetMonthsAverage}
        onApplyBudgetTemplate={onApplyBudgetTemplate}
      />
    </NamespaceContext.Provider>
  );
}
TrackingBudgetMenuModal.modalName = MODAL_NAME;

function TrackingBudgetMenuModalInner({
  name = MODAL_NAME,
  categoryId,
  onUpdateBudget,
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
}: Omit<TrackingBudgetMenuModalProps, 'month'>) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  const budgeted = useTrackingSheetValue(
    trackingBudget.catBudgeted(categoryId),
  );
  const category = useCategory(categoryId);
  const [amountFocused, setAmountFocused] = useState(false);

  const _onUpdateBudget = (amount: number) => {
    onUpdateBudget?.(amountToInteger(amount));
  };

  useEffect(() => {
    setAmountFocused(true);
  }, []);

  if (!category) {
    return null;
  }

  return (
    <Modal name={name}>
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
              Budgeted
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
