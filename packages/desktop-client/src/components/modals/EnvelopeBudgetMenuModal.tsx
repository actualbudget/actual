import React, { useState, useEffect, type CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgNotesPaper } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { t } from 'i18next';

import * as Platform from 'loot-core/shared/platform';
import { amountToInteger, integerToAmount } from 'loot-core/shared/util';

import { BudgetMenu } from '@desktop-client/components/budget/envelope/BudgetMenu';
import { useEnvelopeSheetValue } from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '@desktop-client/components/common/Modal';
import { FocusableAmountInput } from '@desktop-client/components/mobile/transactions/FocusableAmountInput';
import { Notes } from '@desktop-client/components/Notes';
import { useCategory } from '@desktop-client/hooks/useCategory';
import { useNotes } from '@desktop-client/hooks/useNotes';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

const buttonStyle: CSSProperties = {
  ...styles.mediumText,
  height: styles.mobileMinHeight,
  color: theme.formLabelText,
  // Adjust based on desired number of buttons per row.
  flexBasis: '100%',
};

type EnvelopeBudgetMenuModalProps = Extract<
  ModalType,
  { name: 'envelope-budget-menu' }
>['options'];

export function EnvelopeBudgetMenuModal({
  categoryId,
  onUpdateBudget,
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
  onEditNotes,
  month,
}: EnvelopeBudgetMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  const budgeted = useEnvelopeSheetValue(
    envelopeBudget.catBudgeted(categoryId),
  );
  const category = useCategory(categoryId);
  const [amountFocused, setAmountFocused] = useState(false);

  const notesId = category ? category.id + month : '';
  const originalNotes = useNotes(notesId) ?? '';
  const _onUpdateBudget = (amount: number) => {
    onUpdateBudget?.(amountToInteger(amount));
  };

  const _onEditNotes = () => {
    if (category && month) {
      onEditNotes?.(category.id + month, month);
    }
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
          <Notes
            notes={originalNotes.length > 0 ? originalNotes : t('No notes')}
            editable={false}
            focused={false}
            getStyle={() => ({
              borderRadius: 6,
              ...(originalNotes.length === 0 && {
                justifySelf: 'center',
                alignSelf: 'center',
                color: theme.pageTextSubdued,
              }),
            })}
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
              <Trans>Budgeted</Trans>
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
          <Button style={buttonStyle} onPress={_onEditNotes}>
            <SvgNotesPaper width={20} height={20} style={{ paddingRight: 5 }} />
            <Trans>Edit notes</Trans>
          </Button>
        </>
      )}
    </Modal>
  );
}
