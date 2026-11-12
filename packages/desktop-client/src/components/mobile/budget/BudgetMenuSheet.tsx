import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import type { MenuItemObject } from '@actual-app/components/menu';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { amountToInteger, integerToAmount } from '@actual-app/core/shared/util';
import type { CategoryEntity, NoteEntity } from '@actual-app/core/types/models';

import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetMenuRows } from '#components/mobile/MobileSheetMenuRows';
import { MobileSheetNotes } from '#components/mobile/MobileSheetNotes';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { AmountInput } from '#components/mobile/transactions/AmountInput';
import { CALCULATOR_KEYBOARD_HEIGHT } from '#components/mobile/transactions/CalculatorKeyboard';
import { useCategory } from '#hooks/useCategory';
import { useBudgetLine } from '#hooks/useCategoryCurrencies';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useNotes } from '#hooks/useNotes';
import type { Modal as ModalType } from '#modals/modalsSlice';

type BudgetMenuSheetProps = {
  name: Extract<
    ModalType['name'],
    'envelope-budget-menu' | 'tracking-budget-menu'
  >;
  categoryId: CategoryEntity['id'];
  month: string;
  budgeted: number;
  items: MenuItemObject<string>[];
  onMenuSelect: (name: string) => void;
  onUpdateBudget: (amount: number) => void;
  onEditNotes: (id: NoteEntity['id'], month: string) => void;
};

export function BudgetMenuSheet({
  name,
  categoryId,
  month,
  budgeted,
  items,
  onMenuSelect,
  onUpdateBudget,
  onEditNotes,
}: BudgetMenuSheetProps) {
  const { t } = useTranslation();
  const { categoryId: ownerId, currencyCode } = useBudgetLine(categoryId);
  const { data: category } = useCategory(ownerId);
  const isMobileCalculatorEnabled = useFeatureFlag('mobileCalculator');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const notesId = `${categoryId}-${month}`;
  const notes = useNotes(notesId);

  if (!category) {
    return null;
  }

  return (
    <MobileSheet
      name={name}
      title={
        currencyCode ? `${category.name} (${currencyCode})` : category.name
      }
      wrapperStyle={{
        paddingBottom: isCalculatorOpen ? CALCULATOR_KEYBOARD_HEIGHT : 0,
      }}
    >
      {({ close }) => (
        <>
          <View
            style={{
              justifyContent: 'center',
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
              value={integerToAmount(budgeted)}
              currencyCode={currencyCode}
              onEnter={close}
              onChange={amount => onUpdateBudget(amountToInteger(amount))}
              onFocus={() => setIsCalculatorOpen(isMobileCalculatorEnabled)}
              onBlur={() => setIsCalculatorOpen(false)}
              data-testid="budget-amount"
              variant="large"
            />
          </View>
          {!currencyCode && notes && <MobileSheetNotes notes={notes} />}

          <MobileSheetSection>
            {!currencyCode && (
              <MobileSheetRow
                label={t('Edit notes')}
                onPress={() => onEditNotes(notesId, month)}
              />
            )}
            <MobileSheetMenuRows
              items={items}
              onSelect={itemName => {
                onMenuSelect(itemName);
                close();
              }}
            />
          </MobileSheetSection>
        </>
      )}
    </MobileSheet>
  );
}
