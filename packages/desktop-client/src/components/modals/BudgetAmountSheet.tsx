import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { amountToInteger, integerToAmount } from '@actual-app/core/shared/util';

import { useBudgetActions } from '#budget';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetNotes } from '#components/mobile/MobileSheetNotes';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { AmountInput } from '#components/mobile/transactions/AmountInput';
import { CALCULATOR_KEYBOARD_HEIGHT } from '#components/mobile/transactions/CalculatorKeyboard';
import { useBudgetBindings } from '#hooks/useBudgetBindings';
import { useCategory } from '#hooks/useCategory';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useNotes } from '#hooks/useNotes';
import { useSheetValue } from '#hooks/useSheetValue';
import { useUndo } from '#hooks/useUndo';
import { collapseModals, pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type BudgetAmountSheetProps = Extract<
  ModalType,
  { name: 'budget-amount' }
>['options'];

const SHEET_NAME = 'budget-amount';

export function BudgetAmountSheet({
  categoryId,
  month,
}: BudgetAmountSheetProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const locale = useLocale();
  const dispatch = useDispatch();
  const { data: category } = useCategory(categoryId);
  const bindings = useBudgetBindings();
  const applyBudgetAction = useBudgetActions();
  const { showUndoNotification } = useUndo();
  const isMobileCalculatorEnabled = useFeatureFlag('mobileCalculator');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const notesId = `${categoryId}-${month}`;
  const notes = useNotes(notesId);

  const budgeted = useSheetValue<
    'envelope-budget' | 'tracking-budget',
    'budget'
  >(bindings.catBudgeted(categoryId));

  if (!category) {
    return null;
  }

  const onEditNotes = () => {
    dispatch(collapseModals({ rootModalName: SHEET_NAME }));
    dispatch(
      pushModal({
        modal: {
          name: 'notes',
          options: {
            id: notesId,
            name: `${category.name} - ${monthUtils.format(month, "MMMM ''yy", locale)}`,
            onSave: (id, note) => void send('notes-save', { id, note }),
          },
        },
      }),
    );
  };

  const onUpdateBudget = (amount: number) => {
    const integerAmount = amountToInteger(
      amount,
      format.currency.decimalPlaces,
    );
    applyBudgetAction.mutate({
      month,
      type: 'budget-amount',
      args: { category: categoryId, amount: integerAmount },
    });
    showUndoNotification({
      message: t('{{categoryName}} budget has been updated to {{amount}}.', {
        categoryName: category.name,
        amount: format(integerAmount, 'financial'),
      }),
    });
  };

  return (
    <MobileSheet
      name={SHEET_NAME}
      title={category.name}
      wrapperStyle={{
        paddingBottom: isCalculatorOpen ? CALCULATOR_KEYBOARD_HEIGHT : 0,
      }}
    >
      {({ close }) => (
        <>
          <View
            style={{
              alignItems: 'center',
              padding: `${spacing.xs}px ${spacing.md}px ${spacing.md}px`,
            }}
          >
            <Text
              style={{
                ...styles.smallText,
                color: theme.pageTextLight,
                marginBottom: spacing.xxs,
              }}
            >
              <Trans>Budgeted</Trans>
            </Text>
            <AmountInput
              value={integerToAmount(
                budgeted || 0,
                format.currency.decimalPlaces,
              )}
              onEnter={close}
              onChange={onUpdateBudget}
              onFocus={() => setIsCalculatorOpen(isMobileCalculatorEnabled)}
              onBlur={() => setIsCalculatorOpen(false)}
              data-testid="budget-amount"
              autoFocus
              disableNativeAutoFocusOnIOS
              variant="large"
            />
          </View>
          {notes && <MobileSheetNotes notes={notes} />}

          <MobileSheetSection>
            <MobileSheetRow label={t('Edit notes')} onPress={onEditNotes} />
          </MobileSheetSection>
        </>
      )}
    </MobileSheet>
  );
}
