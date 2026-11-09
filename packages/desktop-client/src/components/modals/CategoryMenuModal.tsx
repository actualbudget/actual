import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import {
  addCurrencyLine,
  addCurrencyLines,
  addOtherCurrencyModal,
  listCurrencies,
  removeCurrencyModal,
} from '#components/budget/categoryCurrencyModals';
import { useConvertedSpendingNotes } from '#components/currency/ConvertedSpendingHint';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetDeleteConfirm } from '#components/mobile/MobileSheetDeleteConfirm';
import { MobileSheetNotes } from '#components/mobile/MobileSheetNotes';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useCategories } from '#hooks/useCategories';
import { useCategory } from '#hooks/useCategory';
import {
  useBudgetableCurrencies,
  useCategoryCurrencies,
} from '#hooks/useCategoryCurrencies';
import { useCategoryGroup } from '#hooks/useCategoryGroup';
import { useDeleteCategoryFlow } from '#hooks/useDeleteCategoryFlow';
import { useMultiCurrency } from '#hooks/useMultiCurrency';
import { useNotes } from '#hooks/useNotes';
import { pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type CategoryMenuModalProps = Extract<
  ModalType,
  { name: 'category-menu' }
>['options'];

export function CategoryMenuModal({
  categoryId,
  month,
  onSave,
  onEditNotes,
  onDelete,
  onEditAutomations,
  onClose,
}: CategoryMenuModalProps) {
  const { t, i18n } = useTranslation();
  const { data: category } = useCategory(categoryId);
  const { data: categoryGroup } = useCategoryGroup(category?.group);
  const {
    data: { grouped: categoryGroups, list: categories } = {
      grouped: [],
      list: [],
    },
  } = useCategories();
  const notes = useNotes(categoryId);
  const dispatch = useDispatch();
  const { getLines } = useCategoryCurrencies();
  const currencyLines = getLines(categoryId).filter(
    line => line.id !== categoryId,
  );
  // Spending converted from currencies the category has no line in
  const converted = useConvertedSpendingNotes(categoryId, month);
  const { isEnabled: isMultiCurrencyEnabled } = useMultiCurrency();
  const budgetableCurrencies = useBudgetableCurrencies(categoryId, month);
  const deleteFlow = useDeleteCategoryFlow({
    categoryIds: [categoryId],
    onDelete: transferCategoryId => onDelete(categoryId, transferCategoryId),
  });

  if (!category) {
    return null;
  }

  const isIncome = Boolean(category.is_income);
  const transferGroups = categoryGroups
    .filter(group => Boolean(group.is_income) === isIncome)
    .map(group => ({
      ...group,
      categories: (group.categories ?? []).filter(c => c.id !== categoryId),
    }));
  const transferName = categories.find(
    c => c.id === deleteFlow.transferId,
  )?.name;
  // Lines budgeted ahead start in the month shown
  const addLine = (currency: string) =>
    void addCurrencyLine(dispatch, t, category, currency, month);

  return (
    <MobileSheet
      name="category-menu"
      title={category.name}
      onTitleUpdate={newName => {
        onSave({ ...category, name: newName });
        return undefined;
      }}
      onClose={onClose}
    >
      {({ editTitle, isEditingTitle }) =>
        deleteFlow.step ? (
          <MobileSheetDeleteConfirm
            flow={deleteFlow}
            category={category}
            transferGroups={transferGroups}
            transferName={transferName}
          />
        ) : (
          <>
            {notes && <MobileSheetNotes notes={notes} />}

            {converted.notes.length > 0 && (
              <MobileSheetSection title={t('Converted spending')}>
                <View
                  style={{
                    gap: spacing.xs,
                    padding: `0 ${spacing.lg}px ${spacing.sm}px`,
                  }}
                >
                  {converted.notes.map(note => (
                    <Text key={note.key}>{note.text}</Text>
                  ))}
                </View>
                {/* Lines for this category from the month shown on, as on
                    a wide screen */}
                {converted.currencies.map(currency => (
                  <MobileSheetRow
                    key={currency}
                    label={t('Add a {{currency}} line', { currency })}
                    onPress={() => addLine(currency)}
                  />
                ))}
                {converted.currencies.length > 1 && (
                  <MobileSheetRow
                    label={t('Add {{currencies}} lines', {
                      currencies: listCurrencies(
                        converted.currencies,
                        i18n.language,
                      ),
                    })}
                    onPress={() =>
                      void addCurrencyLines(
                        dispatch,
                        t,
                        category,
                        converted.currencies,
                        month,
                      )
                    }
                  />
                )}
              </MobileSheetSection>
            )}

            <MobileSheetSection>
              {!isEditingTitle && (
                <MobileSheetRow label={t('Rename')} onPress={editTitle} />
              )}
              <MobileSheetRow
                label={t('Edit notes')}
                onPress={() => onEditNotes(category.id)}
              />
              {onEditAutomations && (
                <MobileSheetRow
                  label={t('Budget automations')}
                  onPress={() => onEditAutomations(category.id)}
                />
              )}
              {!categoryGroup?.hidden && (
                <MobileSheetRow
                  label={category.hidden ? t('Show') : t('Hide')}
                  onPress={() =>
                    onSave({ ...category, hidden: !category.hidden })
                  }
                />
              )}
              {/* Those with converted spending are offered above */}
              {budgetableCurrencies
                .filter(currency => !converted.currencies.includes(currency))
                .map(currency => (
                  <MobileSheetRow
                    key={currency}
                    label={t('Add a {{currency}} line', { currency })}
                    onPress={() => addLine(currency)}
                  />
                ))}
              {isMultiCurrencyEnabled && (
                <MobileSheetRow
                  label={t('Add currency…')}
                  onPress={() =>
                    dispatch(
                      pushModal({
                        modal: addOtherCurrencyModal(category, month),
                      }),
                    )
                  }
                />
              )}
              {currencyLines.map(line => (
                <MobileSheetRow
                  key={line.id}
                  label={t('Remove {{currency}}', {
                    currency: line.currencyCode,
                  })}
                  isDestructive
                  onPress={() =>
                    dispatch(
                      pushModal({
                        modal: removeCurrencyModal(t, category, line),
                      }),
                    )
                  }
                />
              ))}
              <MobileSheetRow
                label={t('Delete')}
                isDestructive
                onPress={() => void deleteFlow.start()}
              />
            </MobileSheetSection>
          </>
        )
      }
    </MobileSheet>
  );
}
