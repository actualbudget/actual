import { useMemo } from 'react';

import { UNREVIEWED_TAG } from '@actual-app/core/shared/tags';

import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useNavigate } from '#hooks/useNavigate';
import { useTransactions } from '#hooks/useTransactions';
import { unreviewedTransactions } from '#queries';

/**
 * Transactions bank sync tagged for review, for the mobile budget banner and
 * the desktop title bar. `count` is 0 while the `reviewNewTransactions`
 * experiment is off (the query doesn't run then) or still loading, and is
 * capped at 1000 like the uncategorized banner. `openUnreviewed` shows them
 * in the all-accounts view with a tag filter, where they can be searched.
 */
export function useUnreviewedTransactions() {
  const navigate = useNavigate();
  const isReviewTagEnabled = useFeatureFlag('reviewNewTransactions');

  const query = useMemo(
    () => unreviewedTransactions().options({ splits: 'grouped' }).select('id'),
    [],
  );

  const { transactions, isPending } = useTransactions({
    query: isReviewTagEnabled ? query : undefined,
    options: { pageSize: 1000 },
  });

  const count = isReviewTagEnabled && !isPending ? transactions.length : 0;

  const openUnreviewed = () => {
    void navigate('/accounts', {
      state: {
        goBack: true,
        filterConditions: [
          {
            field: 'notes',
            op: 'hasTags',
            value: `#${UNREVIEWED_TAG}`,
            type: 'string',
          },
        ],
      },
    });
  };

  return { count, openUnreviewed };
}
