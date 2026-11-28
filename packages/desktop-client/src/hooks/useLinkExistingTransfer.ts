import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { Diff } from '@actual-app/core/shared/util';
import type {
  PayeeEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { pushModal } from '#modals/modalsSlice';
import { aqlQuery } from '#queries/aqlQuery';
import { useDispatch } from '#redux';

import { usePayees } from './usePayees';

const MATCH_WINDOW_DAYS = 7;

type TransferLinkDiff = Diff<TransactionEntity> & {
  transferMatches?: Record<TransactionEntity['id'], TransactionEntity['id']>;
};

function daysApart(a: TransactionEntity, b: TransactionEntity) {
  return Math.abs(monthUtils.differenceInCalendarDays(a.date, b.date));
}

// Candidates come from a query that already limits them to the opposite
// amount in the other account, within the window and not yet linked. The
// closest date wins, then the earlier date, then the earlier entry.
export function pickTransferMatch(
  saved: TransactionEntity,
  candidates: TransactionEntity[],
): TransactionEntity | null {
  const matches = [...candidates].sort(
    (a, b) =>
      daysApart(saved, a) - daysApart(saved, b) ||
      a.date.localeCompare(b.date) ||
      (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  return matches[0] ?? null;
}

// The rows of a save that would create the other side of a transfer: added
// rows, or rows whose payee changed, that now have a transfer payee
export function getLinkCandidates(
  diff: Diff<TransactionEntity>,
  saved: TransactionEntity[],
  payees: PayeeEntity[],
): TransactionEntity[] {
  const rows = [
    ...diff.added,
    ...diff.updated
      .filter(changes => 'payee' in changes)
      .map(changes => saved.find(t => t.id === changes.id)),
  ];
  return rows.filter(
    (trans): trans is TransactionEntity =>
      trans != null &&
      trans.transfer_id == null &&
      !trans.is_parent &&
      payees.some(p => p.id === trans.payee && p.transfer_acct),
  );
}

export function useLinkExistingTransfer() {
  const dispatch = useDispatch();
  const { data: payees = [] } = usePayees();

  return async (
    diff: Diff<TransactionEntity>,
    saved: TransactionEntity[],
  ): Promise<TransferLinkDiff> => {
    const transferMatches: Record<string, string> = {};
    for (const trans of getLinkCandidates(diff, saved, payees)) {
      const transferAcct = payees.find(
        p => p.id === trans.payee,
      )?.transfer_acct;
      const { data: candidates } = await aqlQuery(
        q('transactions')
          .filter({
            account: transferAcct,
            transfer_id: null,
            amount: -trans.amount,
            date: {
              $gte: monthUtils.subDays(trans.date, MATCH_WINDOW_DAYS),
              $lte: monthUtils.addDays(trans.date, MATCH_WINDOW_DAYS),
            },
          })
          .select('*'),
      );
      const usedIds = new Set(Object.values(transferMatches));
      const match = pickTransferMatch(
        trans,
        candidates.filter((c: TransactionEntity) => !usedIds.has(c.id)),
      );
      if (!match) {
        continue;
      }

      const shouldLink = await new Promise<boolean>(resolve => {
        dispatch(
          pushModal({
            modal: {
              name: 'confirm-transfer-link',
              options: {
                fromAccount: trans.account,
                match,
                onLink: () => resolve(true),
                onCreateNew: () => resolve(false),
              },
            },
          }),
        );
      });
      if (shouldLink) {
        transferMatches[trans.id] = match.id;
      }
    }

    return Object.keys(transferMatches).length > 0
      ? { ...diff, transferMatches }
      : diff;
  };
}
