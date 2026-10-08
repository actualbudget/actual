import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { q } from '@actual-app/core/shared/query';
import type { TransactionEntity } from '@actual-app/core/types/models';
import { useQueryClient } from '@tanstack/react-query';

import { addNotification } from '#notifications/notificationsSlice';
import { aqlQuery } from '#queries/aqlQuery';
import { useDispatch, useStore } from '#redux';
import { openForeignEditDialog } from '#util/foreign-edit';

import { useAccounts } from './useAccounts';
import { usePayees } from './usePayees';

/** Read stored base/native pairs, even when the register displays native amounts. */
export function useOpenAmountDetails() {
  const dispatch = useDispatch();
  const store = useStore();
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useAccounts();
  const { data: payees = [] } = usePayees();

  return async (id: string) => {
    const generation = ++request.current;
    const budgetId = store.getState().prefs.local?.id;
    const isCurrent = () =>
      generation === request.current &&
      store.getState().prefs.local?.id === budgetId;
    try {
      const { data } = await aqlQuery(
        q('transactions').filter({ id }).select('*').options({ splits: 'all' }),
      );
      const row: TransactionEntity | undefined = data[0];
      if (!row || !isCurrent()) return;
      const parentId = row.is_parent ? row.id : row.parent_id;
      const rows: TransactionEntity[] = parentId
        ? (
            await aqlQuery(
              q('transactions')
                .filter({ parent_id: parentId })
                .select('*')
                .options({ splits: 'all' }),
            )
          ).data
        : [row];
      await openForeignEditDialog(dispatch, {
        row,
        rows,
        payees,
        accounts,
        isCurrent,
        onSaved: () => void queryClient.invalidateQueries(),
      });
    } catch {
      if (!isCurrent()) return;
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('The transaction could not be opened. Try again.'),
          },
        }),
      );
    }
  };
}
