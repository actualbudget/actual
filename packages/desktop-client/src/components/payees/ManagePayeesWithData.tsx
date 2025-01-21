import React, { useState, useEffect, useCallback } from 'react';

import { pushModal } from 'loot-core/client/modals/modalsSlice';
import {
  getPayees,
  initiallyLoadPayees,
} from 'loot-core/client/queries/queriesSlice';
import { type UndoState } from 'loot-core/server/undo';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';
import { applyChanges, type Diff } from 'loot-core/src/shared/util';
import { type NewRuleEntity, type PayeeEntity } from 'loot-core/types/models';

import { usePayees } from '../../hooks/usePayees';
import { useDispatch } from '../../redux';

import { ManagePayees } from './ManagePayees';

type ManagePayeesWithDataProps = {
  initialSelectedIds: string[];
};

export function ManagePayeesWithData({
  initialSelectedIds,
}: ManagePayeesWithDataProps) {
  const payees = usePayees();
  const dispatch = useDispatch();

  const [ruleCounts, setRuleCounts] = useState({ value: new Map() });
  const [orphans, setOrphans] = useState<PayeeEntity[]>([]);

  const refetchOrphanedPayees = useCallback(async () => {
    const orphs = await send('payees-get-orphaned');
    setOrphans(orphs);
  }, []);

  const refetchRuleCounts = useCallback(async () => {
    const counts = await send('payees-get-rule-counts');
    const countsMap = new Map(Object.entries(counts));
    setRuleCounts({ value: countsMap });
  }, []);

  useEffect(() => {
    async function loadData() {
      await dispatch(initiallyLoadPayees());
      await refetchRuleCounts();
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

      await dispatch(getPayees());
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
      ruleCounts={ruleCounts.value}
      orphanedPayees={orphans}
      initialSelectedIds={initialSelectedIds}
      onBatchChange={async (changes: Diff<PayeeEntity>) => {
        await send('payees-batch-change', changes);
        await dispatch(getPayees());
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

        mergeIds.forEach(id => {
          const count = ruleCounts.value.get(id) || 0;
          ruleCounts.value.set(
            targetId,
            (ruleCounts.value.get(targetId) || 0) + count,
          );
        });

        await dispatch(getPayees());
        setOrphans(filtedOrphans);
        setRuleCounts({ value: ruleCounts.value });
      }}
      onViewRules={onViewRules}
      onCreateRule={onCreateRule}
    />
  );
}
