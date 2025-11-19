import { useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';

import { q } from 'loot-core/shared/query';
import {
  scheduleIsRecurring,
  extractScheduleConds,
} from 'loot-core/shared/schedules';
import { isPreviewId } from 'loot-core/shared/transactions';
import { validForTransfer } from 'loot-core/shared/transfer';
import { type TransactionEntity } from 'loot-core/types/models';

import { SelectedItemsButton } from '@desktop-client/components/table';
import { useSchedules } from '@desktop-client/hooks/useSchedules';
import { useSelectedItems } from '@desktop-client/hooks/useSelected';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type SelectedTransactionsButtonProps = {
  getTransaction: (id: string) => TransactionEntity | undefined;
  onShow: (selectedIds: string[]) => void;
  onDuplicate: (selectedIds: string[]) => void;
  onDelete: (selectedIds: string[]) => void;
  onEdit: (
    type:
      | 'date'
      | 'amount'
      | 'account'
      | 'payee'
      | 'notes'
      | 'category'
      | 'cleared',
    selectedIds: string[],
  ) => void;
  onLinkSchedule: (selectedIds: string[]) => void;
  onUnlinkSchedule: (selectedIds: string[]) => void;
  onCreateRule: (selectedIds: string[]) => void;
  onRunRules: (selectedIds: string[]) => void;
  onSetTransfer: (selectedIds: string[]) => void;
  onScheduleAction: (
    action: 'post-transaction' | 'post-transaction-today' | 'skip' | 'complete',
    selectedIds: TransactionEntity['id'][],
  ) => void;
  showMakeTransfer: boolean;
  onMakeAsSplitTransaction: (selectedIds: string[]) => void;
  onMakeAsNonSplitTransactions: (selectedIds: string[]) => void;
  onMergeTransactions: (selectedIds: string[]) => void;
};

export function SelectedTransactionsButton({
  getTransaction,
  onShow,
  onDuplicate,
  onDelete,
  onEdit,
  onLinkSchedule,
  onUnlinkSchedule,
  onCreateRule,
  onRunRules,
  onSetTransfer,
  onScheduleAction,
  showMakeTransfer,
  onMakeAsSplitTransaction,
  onMakeAsNonSplitTransactions,
  onMergeTransactions,
}: SelectedTransactionsButtonProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const selectedItems = useSelectedItems();
  const selectedIds = useMemo(() => [...selectedItems], [selectedItems]);

  const scheduleIds = useMemo(() => {
    return selectedIds
      .filter(id => isPreviewId(id))
      .map(id => id.split('/')[1]);
  }, [selectedIds]);

  const scheduleQuery = useMemo(() => {
    return q('schedules')
      .filter({ id: { $oneof: scheduleIds } })
      .select('*');
  }, [scheduleIds]);

  const { schedules: selectedSchedules } = useSchedules({
    query: scheduleQuery,
  });

  const types = useMemo(() => {
    const items = selectedIds;
    return {
      preview: !!items.find(id => isPreviewId(id)),
      trans: !!items.find(id => !isPreviewId(id)),
    };
  }, [selectedIds]);

  const ambiguousDuplication = useMemo(() => {
    const transactions = selectedIds.map(id => getTransaction(id));

    return transactions.some(tx => tx && tx.is_child);
  }, [selectedIds, getTransaction]);

  const linked = useMemo(() => {
    return (
      !types.preview &&
      selectedIds.every(id => {
        const t = getTransaction(id);
        return t && t.schedule;
      })
    );
  }, [types.preview, selectedIds, getTransaction]);

  const twoTransactions: [TransactionEntity, TransactionEntity] | undefined =
    useMemo(() => {
      if (selectedIds?.length !== 2) {
        return undefined;
      }
      const [t0, t1] = selectedIds.map(getTransaction);
      // previously selected transactions aren't always present in current transaction list
      if (!t0 || !t1) {
        return undefined;
      }

      return [t0, t1];
    }, [selectedIds, getTransaction]);

  const canBeTransfer = useMemo(() => {
    // only two selected
    if (!twoTransactions) {
      return false;
    }
    const [fromTrans, toTrans] = twoTransactions;
    return validForTransfer(fromTrans, toTrans);
  }, [twoTransactions]);

  const canMerge = useMemo(() => {
    return Boolean(
      twoTransactions &&
        twoTransactions[0].amount === twoTransactions[1].amount,
    );
  }, [twoTransactions]);

  const canBeSkipped = useMemo(() => {
    const recurringSchedules = selectedSchedules.filter(s => {
      const { date: dateCond } = extractScheduleConds(s._conditions);
      return scheduleIsRecurring(dateCond);
    });

    return recurringSchedules.length === selectedSchedules.length;
  }, [selectedSchedules]);

  const canBeCompleted = useMemo(() => {
    const singleSchedules = selectedSchedules.filter(s => {
      const { date: dateCond } = extractScheduleConds(s._conditions);
      return !scheduleIsRecurring(dateCond);
    });

    return singleSchedules.length === selectedSchedules.length;
  }, [selectedSchedules]);

  const canMakeAsSplitTransaction = useMemo(() => {
    if (selectedIds.length <= 1 || types.preview) {
      return false;
    }

    const transactions = selectedIds.map(id => getTransaction(id));
    const [firstTransaction] = transactions;

    const areAllSameDateAndAccount = transactions.every(
      tx =>
        tx &&
        tx.date === firstTransaction?.date &&
        tx.account === firstTransaction?.account,
    );
    const areNoSplitTransactions = transactions.every(
      tx => tx && !tx.is_parent && !tx.is_child,
    );
    const areNoReconciledTransactions = transactions.every(
      tx => tx && !tx.reconciled,
    );

    return (
      areAllSameDateAndAccount &&
      areNoSplitTransactions &&
      areNoReconciledTransactions
    );
  }, [selectedIds, types, getTransaction]);

  const canUnsplitTransactions = useMemo(() => {
    if (selectedIds.length === 0 || types.preview) {
      return false;
    }

    const transactions = selectedIds.map(id => getTransaction(id));

    const areNoReconciledTransactions = transactions.every(
      tx => tx && !tx.reconciled,
    );
    const areAllSplitTransactions = transactions.every(
      tx => tx && (tx.is_parent || tx.is_child),
    );
    return areNoReconciledTransactions && areAllSplitTransactions;
  }, [selectedIds, types, getTransaction]);

  function onViewSchedule() {
    const firstId = selectedIds[0];
    let scheduleId;
    if (isPreviewId(firstId)) {
      const parts = firstId.split('/');
      scheduleId = parts[1];
    } else {
      const trans = getTransaction(firstId);
      scheduleId = trans && trans.schedule;
    }

    if (scheduleId) {
      dispatch(
        pushModal({
          modal: { name: 'schedule-edit', options: { id: scheduleId } },
        }),
      );
    }
  }

  const hotKeyOptions = {
    enabled: types.trans,
    scopes: ['app'],
  };
  useHotkeys('f', () => onShow(selectedIds), hotKeyOptions, [
    onShow,
    selectedIds,
  ]);
  useHotkeys('u', () => onDuplicate(selectedIds), hotKeyOptions, [
    onDuplicate,
    selectedIds,
  ]);
  useHotkeys('d', () => onDelete(selectedIds), hotKeyOptions, [
    onDelete,
    selectedIds,
  ]);
  useHotkeys('t', () => onEdit('date', selectedIds), hotKeyOptions, [
    onEdit,
    selectedIds,
  ]);
  useHotkeys('a', () => onEdit('account', selectedIds), hotKeyOptions, [
    onEdit,
    selectedIds,
  ]);
  useHotkeys('p', () => onEdit('payee', selectedIds), hotKeyOptions, [
    onEdit,
    selectedIds,
  ]);
  useHotkeys('n', () => onEdit('notes', selectedIds), hotKeyOptions, [
    onEdit,
    selectedIds,
  ]);
  useHotkeys('c', () => onEdit('category', selectedIds), hotKeyOptions, [
    onEdit,
    selectedIds,
  ]);
  useHotkeys('l', () => onEdit('cleared', selectedIds), hotKeyOptions, [
    onEdit,
    selectedIds,
  ]);
  useHotkeys(
    's',
    () =>
      !types.trans || linked ? onViewSchedule() : onLinkSchedule(selectedIds),
    {
      scopes: ['app'],
    },
    [onLinkSchedule, onViewSchedule, linked, selectedIds],
  );
  // edit amount (only if we're not in a merge context)
  useHotkeys(
    'm',
    () => !canMerge && onEdit('amount', selectedIds),
    hotKeyOptions,
    [onEdit, selectedIds],
  );
  // merge
  useHotkeys(
    'g',
    () => canMerge && onMergeTransactions(selectedIds),
    hotKeyOptions,
    [onMergeTransactions, selectedIds],
  );

  return (
    <SelectedItemsButton
      id="transactions"
      name={count => t('{{count}} transactions', { count })}
      // @ts-expect-error fix me
      items={[
        ...(!types.trans
          ? [
              {
                name: 'view-schedule',
                text: t('View schedule'),
                key: 'S',
              } as const,
              {
                name: 'post-transaction',
                text: t('Post transaction'),
              } as const,
              {
                name: 'post-transaction-today',
                text: t('Post transaction today'),
              } as const,
              canBeSkipped &&
                ({
                  name: 'skip',
                  text: t('Skip next scheduled date'),
                } as const),
              canBeCompleted &&
                ({ name: 'complete', text: t('Mark as completed') } as const),
            ]
          : [
              { name: 'show', text: t('Show'), key: 'F' } as const,
              {
                name: 'duplicate',
                text: t('Duplicate'),
                key: 'U',
                disabled: ambiguousDuplication,
              } as const,
              { name: 'delete', text: t('Delete'), key: 'D' } as const,
              ...(linked
                ? [
                    {
                      name: 'view-schedule',
                      text: t('View schedule'),
                      key: 'S',
                      disabled: selectedIds.length > 1,
                    } as const,
                    {
                      name: 'unlink-schedule',
                      text: t('Unlink schedule'),
                    } as const,
                  ]
                : [
                    {
                      name: 'link-schedule',
                      text: t('Link schedule'),
                      key: 'S',
                    } as const,
                    {
                      name: 'create-rule',
                      text: t('Create rule'),
                    } as const,
                    {
                      name: 'run-rules',
                      text: t('Run Rules'),
                    } as const,
                  ]),

              ...(showMakeTransfer
                ? [
                    {
                      name: 'set-transfer',
                      text: t('Make transfer'),
                      disabled: !canBeTransfer,
                    } as const,
                  ]
                : []),
              ...(canMakeAsSplitTransaction
                ? [
                    {
                      name: 'make-as-split-transaction',
                      text: t('Make as split transaction'),
                    } as const,
                  ]
                : []),
              ...(canUnsplitTransactions
                ? [
                    {
                      name: 'unsplit-transactions',
                      text: t('Unsplit {{count}} transactions', {
                        count: selectedIds.length,
                      }),
                    } as const,
                  ]
                : []),
              ...(canMerge
                ? [
                    {
                      name: 'merge-transactions',
                      text: t('Merge'),
                      key: 'G',
                    } as const,
                  ]
                : []),
              Menu.line,
              { type: Menu.label, name: t('Edit field'), text: '' } as const,
              { name: 'date', text: t('Date'), key: 'T' } as const,
              { name: 'account', text: t('Account'), key: 'A' } as const,
              { name: 'payee', text: t('Payee'), key: 'P' } as const,
              { name: 'notes', text: t('Notes'), key: 'N' } as const,
              { name: 'category', text: t('Category'), key: 'C' } as const,
              { name: 'amount', text: t('Amount'), key: 'M' } as const,
              { name: 'cleared', text: t('Cleared'), key: 'L' } as const,
            ]),
      ]}
      onSelect={name => {
        switch (name) {
          case 'show':
            onShow(selectedIds);
            break;
          case 'duplicate':
            onDuplicate(selectedIds);
            break;
          case 'delete':
            onDelete(selectedIds);
            break;
          case 'make-as-split-transaction':
            onMakeAsSplitTransaction(selectedIds);
            break;
          case 'unsplit-transactions':
            onMakeAsNonSplitTransactions(selectedIds);
            break;
          case 'merge-transactions':
            onMergeTransactions(selectedIds);
            break;
          case 'post-transaction':
          case 'post-transaction-today':
          case 'skip':
          case 'complete':
            onScheduleAction(name, selectedIds);
            break;
          case 'view-schedule':
            onViewSchedule();
            break;
          case 'link-schedule':
            onLinkSchedule(selectedIds);
            break;
          case 'unlink-schedule':
            onUnlinkSchedule(selectedIds);
            break;
          case 'create-rule':
            onCreateRule(selectedIds);
            break;
          case 'run-rules':
            onRunRules(selectedIds);
            break;
          case 'set-transfer':
            onSetTransfer(selectedIds);
            break;
          default:
            // @ts-expect-error fix me
            onEdit(name, selectedIds);
        }
      }}
    />
  );
}
