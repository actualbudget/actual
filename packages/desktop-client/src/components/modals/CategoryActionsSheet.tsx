import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';

import {
  useBudgetActions,
  useDeleteCategoryMutation,
  useSaveCategoryMutation,
} from '#budget';
import type { ApplyBudgetActionPayload } from '#budget';
import { useBudgetMenu as useEnvelopeBudgetMenu } from '#components/budget/envelope/BudgetMenu';
import { useBudgetMenu as useTrackingBudgetMenu } from '#components/budget/tracking/BudgetMenu';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetDeleteConfirm } from '#components/mobile/MobileSheetDeleteConfirm';
import { MobileSheetMenuRows } from '#components/mobile/MobileSheetMenuRows';
import { MobileSheetNotes } from '#components/mobile/MobileSheetNotes';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useBudgetBindings } from '#hooks/useBudgetBindings';
import { useCategories } from '#hooks/useCategories';
import { useCategory } from '#hooks/useCategory';
import { useCategoryGroup } from '#hooks/useCategoryGroup';
import { useDeleteCategoryFlow } from '#hooks/useDeleteCategoryFlow';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useFormat } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';
import { useNotes } from '#hooks/useNotes';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useUndo } from '#hooks/useUndo';
import { collapseModals, pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type CategoryActionsSheetProps = Extract<
  ModalType,
  { name: 'category-actions' }
>['options'];

const SHEET_NAME = 'category-actions';

export function CategoryActionsSheet({
  categoryId,
  month,
}: CategoryActionsSheetProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: category } = useCategory(categoryId);
  const { data: categoryGroup } = useCategoryGroup(category?.group);
  const {
    data: { grouped: categoryGroups, list: categories } = {
      grouped: [],
      list: [],
    },
  } = useCategories();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const isTracking = budgetType === 'tracking';
  const bindings = useBudgetBindings();
  const goalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const goalTemplatesUIEnabled = useFeatureFlag('goalTemplatesUIEnabled');
  const applyBudgetAction = useBudgetActions();
  const saveCategory = useSaveCategoryMutation();
  const deleteCategory = useDeleteCategoryMutation();
  const { showUndoNotification } = useUndo();
  const notes = useNotes(categoryId);

  const budgeted =
    useSheetValue<'envelope-budget' | 'tracking-budget', 'budget'>(
      bindings.catBudgeted(categoryId),
    ) ?? 0;
  const balance =
    useSheetValue<'envelope-budget' | 'tracking-budget', 'leftover'>(
      bindings.catBalance(categoryId),
    ) ?? 0;
  const carryover = useSheetValue<
    'envelope-budget' | 'tracking-budget',
    'carryover'
  >(bindings.catCarryover(categoryId));

  const categoryName = category?.name ?? '';

  const closeSheet = () => {
    dispatch(collapseModals({ rootModalName: SHEET_NAME }));
  };

  const openModal = (modal: ModalType) => {
    closeSheet();
    dispatch(pushModal({ modal }));
  };

  const runBudgetAction = (
    payload: ApplyBudgetActionPayload,
    message: string,
    pre?: string,
  ) => {
    applyBudgetAction.mutate(payload);
    showUndoNotification({ message, pre });
    closeSheet();
  };

  const budgetMenuActions = {
    onCopyLastMonthAverage: () =>
      runBudgetAction(
        { type: 'copy-single-last', month, args: { category: categoryId } },
        t(
          "{{categoryName}} budget has been set to last month's budgeted amount.",
          { categoryName },
        ),
      ),
    onSetMonthsAverage: (numberOfMonths: number) =>
      runBudgetAction(
        {
          type:
            numberOfMonths === 3
              ? 'set-single-3-avg'
              : numberOfMonths === 6
                ? 'set-single-6-avg'
                : 'set-single-12-avg',
          month,
          args: { category: categoryId },
        },
        numberOfMonths === 12
          ? t('{{categoryName}} budget has been set to yearly average.', {
              categoryName,
            })
          : t(
              '{{categoryName}} budget has been set to {{months}} month average.',
              { categoryName, months: numberOfMonths },
            ),
      ),
    onApplyBudgetTemplate: () =>
      runBudgetAction(
        {
          type: 'apply-single-category-template',
          month,
          args: { category: categoryId },
        },
        t('{{categoryName}} budget templates have been applied.', {
          categoryName,
        }),
        notes ?? undefined,
      ),
    onCopyUntilYearEnd: () =>
      runBudgetAction(
        { type: 'copy-until-year-end', month, args: { category: categoryId } },
        t('{{categoryName}} budget copied until year end.', { categoryName }),
      ),
  };
  const envelopeBudgetMenu = useEnvelopeBudgetMenu(budgetMenuActions);
  const trackingBudgetMenu = useTrackingBudgetMenu(budgetMenuActions);
  const budgetMenu = isTracking ? trackingBudgetMenu : envelopeBudgetMenu;

  const deleteFlow = useDeleteCategoryFlow({
    categoryIds: [categoryId],
    onDelete: transferCategoryId => {
      closeSheet();
      deleteCategory.mutate({ id: categoryId, transferId: transferCategoryId });
    },
  });

  if (!category) {
    return null;
  }

  const isIncome = Boolean(category.is_income);
  const isEnvelopeExpense = !isTracking && !isIncome;
  const isEnvelopeIncome = !isTracking && isIncome;
  const canBudget = isTracking || !isIncome;
  const canEditAutomations =
    goalTemplatesEnabled && goalTemplatesUIEnabled && canBudget;
  const transferGroups = categoryGroups
    .filter(group => Boolean(group.is_income) === isIncome)
    .map(group => ({
      ...group,
      categories: (group.categories ?? []).filter(c => c.id !== categoryId),
    }));
  const transferName = categories.find(
    c => c.id === deleteFlow.transferId,
  )?.name;
  const getCategoryName = (id: string) =>
    categories.find(c => c.id === id)?.name;

  const onToggleCarryover = () => {
    applyBudgetAction.mutate({
      month,
      type: 'carryover',
      args: { category: categoryId, flag: !carryover },
    });
  };

  const onTransfer = () => {
    openModal({
      name: 'transfer',
      options: {
        title: category.name,
        categoryId,
        month,
        amount: balance,
        showToBeBudgeted: true,
        onSubmit: (amount, toCategoryId) => {
          applyBudgetAction.mutate({
            month,
            type: 'transfer-category',
            args: {
              amount,
              from: categoryId,
              to: toCategoryId,
              currencyCode: format.currency.code,
            },
          });
          dispatch(collapseModals({ rootModalName: 'transfer' }));
          showUndoNotification({
            message: t(
              'Transferred {{amount}} from {{fromCategoryName}} to {{toCategoryName}}.',
              {
                amount: format(amount, 'financial'),
                fromCategoryName: category.name,
                toCategoryName:
                  toCategoryId === 'to-budget'
                    ? t('To be budgeted')
                    : getCategoryName(toCategoryId),
              },
            ),
          });
        },
      },
    });
  };

  const onCover = () => {
    openModal({
      name: 'cover',
      options: {
        title: category.name,
        categoryId,
        month,
        amount: balance,
        onSubmit: (amount, fromCategoryId) => {
          applyBudgetAction.mutate({
            month,
            type: 'cover-overspending',
            args: {
              to: categoryId,
              from: fromCategoryId,
              amount,
              currencyCode: format.currency.code,
            },
          });
          dispatch(collapseModals({ rootModalName: 'cover' }));
          showUndoNotification({
            message: t(
              'Covered {{amount}} {{toCategoryName}} overspending from {{fromCategoryName}}.',
              {
                amount: format(amount, 'financial'),
                toCategoryName: category.name,
                fromCategoryName: getCategoryName(fromCategoryId),
              },
            ),
          });
        },
      },
    });
  };

  const onEditNotes = () => {
    openModal({
      name: 'notes',
      options: {
        id: categoryId,
        name: category.name,
        onSave: (id, note) => void send('notes-save', { id, note }),
      },
    });
  };

  const onAddTransaction = () => {
    closeSheet();
    void navigate('/transactions/new', { state: { categoryId } });
  };

  return (
    <MobileSheet
      name={SHEET_NAME}
      title={category.name}
      onTitleUpdate={newName => {
        saveCategory.mutate({ category: { ...category, name: newName } });
        return undefined;
      }}
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

            <MobileSheetSection title={t('Budget')}>
              {canBudget && (
                <MobileSheetRow
                  label={t('Edit budgeted amount')}
                  value={format(budgeted, 'financial')}
                  onPress={() =>
                    openModal({
                      name: 'budget-amount',
                      options: { categoryId, month },
                    })
                  }
                />
              )}
              {!isIncome && (
                <MobileSheetRow
                  label={t('Rollover overspending')}
                  value={carryover ? t('On') : t('Off')}
                  isPressed={Boolean(carryover)}
                  onPress={onToggleCarryover}
                />
              )}
              {isEnvelopeIncome && (
                <MobileSheetRow
                  label={t('Auto hold')}
                  value={carryover ? t('On') : t('Off')}
                  isPressed={Boolean(carryover)}
                  onPress={onToggleCarryover}
                />
              )}
              {isEnvelopeExpense && balance > 0 && (
                <MobileSheetRow
                  label={t('Transfer to another category')}
                  onPress={onTransfer}
                />
              )}
              {isEnvelopeExpense && balance < 0 && (
                <MobileSheetRow
                  label={t('Cover overspending')}
                  onPress={onCover}
                />
              )}
              {canBudget && (
                <MobileSheetMenuRows
                  items={budgetMenu.items}
                  onSelect={budgetMenu.onMenuSelect}
                />
              )}
              {canEditAutomations && (
                <MobileSheetRow
                  label={t('Budget automations')}
                  onPress={() =>
                    openModal({
                      name: 'category-automations-edit',
                      options: { categoryId, month },
                    })
                  }
                />
              )}
            </MobileSheetSection>

            <MobileSheetSection title={t('Category')}>
              {!isEditingTitle && (
                <MobileSheetRow label={t('Rename')} onPress={editTitle} />
              )}
              <MobileSheetRow label={t('Edit notes')} onPress={onEditNotes} />
              <MobileSheetRow
                label={t('Add transaction')}
                onPress={onAddTransaction}
              />
              {!categoryGroup?.hidden && (
                <MobileSheetRow
                  label={category.hidden ? t('Show') : t('Hide')}
                  onPress={() =>
                    saveCategory.mutate({
                      category: { ...category, hidden: !category.hidden },
                    })
                  }
                />
              )}
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
