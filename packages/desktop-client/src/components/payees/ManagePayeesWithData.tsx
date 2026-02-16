import React, { useCallback, useEffect, useState } from 'react';

import { listen, send } from 'loot-core/platform/client/connection';
import * as undo from 'loot-core/platform/client/undo';
import type { UndoState } from 'loot-core/server/undo';
import { applyChanges } from 'loot-core/shared/util';
import type { Diff } from 'loot-core/shared/util';
import type { NewRuleEntity, PayeeEntity } from 'loot-core/types/models';

import { ManagePayees } from './ManagePayees';

import { usePayeeRuleCounts } from '@desktop-client/hooks/usePayeeRuleCounts';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { getPayees, reloadPayees } from '@desktop-client/payees/payeesSlice';
import { useDispatch } from '@desktop-client/redux';

type ManagePayeesWithDataProps = {
  initialSelectedIds: string[];
};

export function ManagePayeesWithData({
  initialSelectedIds,
}: ManagePayeesWithDataProps) {
  const payees = usePayees();
  const dispatch = useDispatch();
  const { ruleCounts, refetch: refetchRuleCounts } = usePayeeRuleCounts();

  const [orphans, setOrphans] = useState<Array<Pick<PayeeEntity, 'id'>>>([]);

  const refetchOrphanedPayees = useCallback(async () => {
    const orphs = await send('payees-get-orphaned');
    setOrphans(orphs);
  }, []);

  useEffect(() => {
    async function loadData() {
      await dispatch(getPayees());
      await refetchOrphanedPayees();
    }
    loadData();

    const unlisten = listen('sync-event', async event => {
      if (event.type === 'applied') {
        if (event.tables.includes('rules')) {
          await refetchRuleCounts();
        }
      }
    });

    return () => {
      unlisten();
    };
  }, [dispatch, refetchRuleCounts, refetchOrphanedPayees]);

  useEffect(() => {
    async function onUndo({ tables, messages, meta }: UndoState) {
      if (!tables.includes('payees') && !tables.includes('payee_mapping')) {
        return;
      }

      await refetchOrphanedPayees();

      const targetId =
        meta && typeof meta === 'object' && 'targetId' in meta
          ? meta.targetId
          : null;

      if (targetId || messages.find(msg => msg.dataset === 'rules')) {
        await refetchRuleCounts();
      }

      undo.setUndoState('undoEvent', null);
    }

    const lastUndoEvent = undo.getUndoState('undoEvent');
    if (lastUndoEvent) {
      onUndo(lastUndoEvent);
    }

    return listen('undo-event', onUndo);
  }, [dispatch, refetchRuleCounts, refetchOrphanedPayees]);

  function onViewRules(id: PayeeEntity['id']) {
    dispatch(
      pushModal({ modal: { name: 'manage-rules', options: { payeeId: id } } }),
    );
  }

  function onCreateRule(id: PayeeEntity['id']) {
    const rule: NewRuleEntity = {
      stage: null,
      conditionsOp: 'and',
      conditions: [
        {
          field: 'payee',
          op: 'is',
          value: id,
          type: 'id',
        },
      ],
      actions: [
        {
          op: 'set',
          field: 'category',
          value: null,
          type: 'id',
        },
      ],
    };
    dispatch(pushModal({ modal: { name: 'edit-rule', options: { rule } } }));
  }

  return (
    <ManagePayees
      payees={payees}
      ruleCounts={ruleCounts}
      orphanedPayees={orphans}
      initialSelectedIds={initialSelectedIds}
      onBatchChange={async (changes: Diff<PayeeEntity>) => {
        await send('payees-batch-change', changes);
        setOrphans(applyChanges(changes, orphans));
      }}
      onMerge={async ([targetId, ...mergeIds]) => {
        await send('payees-merge', { targetId, mergeIds });

        const targetIdIsOrphan = orphans.map(o => o.id).includes(targetId);
        const mergeIdsOrphans = mergeIds.filter(m =>
          orphans.map(o => o.id).includes(m),
        );

        let filtedOrphans = orphans;
        if (targetIdIsOrphan && mergeIdsOrphans.length !== mergeIds.length) {
          // there is a non-orphan in mergeIds, target can be removed from orphan arr
          filtedOrphans = filtedOrphans.filter(o => o.id !== targetId);
        }
        filtedOrphans = filtedOrphans.filter(o => !mergeIds.includes(o.id));

        // Refetch rule counts after merging
        await refetchRuleCounts();

        await dispatch(reloadPayees());
        setOrphans(filtedOrphans);
      }}
      onViewRules={onViewRules}
      onCreateRule={onCreateRule}
    />
  );
}
