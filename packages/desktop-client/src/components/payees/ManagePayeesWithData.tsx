import React, { useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { listen, send } from 'loot-core/platform/client/connection';
import * as undo from 'loot-core/platform/client/undo';
import type { UndoState } from 'loot-core/server/undo';
import { applyChanges } from 'loot-core/shared/util';
import type { Diff } from 'loot-core/shared/util';
import type { NewRuleEntity, PayeeEntity } from 'loot-core/types/models';

import { ManagePayees } from './ManagePayees';

import { useOrphanedPayees } from '@desktop-client/hooks/useOrphanedPayees';
import { usePayeeRuleCounts } from '@desktop-client/hooks/usePayeeRuleCounts';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { payeeQueries } from '@desktop-client/payees';
import { useDispatch } from '@desktop-client/redux';

type ManagePayeesWithDataProps = {
  initialSelectedIds: string[];
};

export function ManagePayeesWithData({
  initialSelectedIds,
}: ManagePayeesWithDataProps) {
  const queryClient = useQueryClient();
  const { data: payees = [], refetch: refetchPayees } = usePayees();
  const { data: orphanedPayees = [], refetch: refetchOrphanedPayees } =
    useOrphanedPayees();
  const dispatch = useDispatch();
  const { data: ruleCounts = new Map(), refetch: refetchRuleCounts } =
    usePayeeRuleCounts();

  useEffect(() => {
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
  }, [dispatch, refetchRuleCounts]);

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
      void onUndo(lastUndoEvent);
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
      orphanedPayees={orphanedPayees}
      initialSelectedIds={initialSelectedIds}
      onBatchChange={async (changes: Diff<PayeeEntity>) => {
        await send('payees-batch-change', changes);
        queryClient.setQueryData(
          payeeQueries.listOrphaned().queryKey,
          existing => applyChanges(changes, existing ?? []),
        );
      }}
      onMerge={async ([targetId, ...mergeIds]) => {
        await send('payees-merge', { targetId, mergeIds });

        const targetIdIsOrphan = orphanedPayees
          .map(o => o.id)
          .includes(targetId);
        const mergeIdsOrphans = mergeIds.filter(m =>
          orphanedPayees.map(o => o.id).includes(m),
        );

        let filteredOrphans = orphanedPayees;
        if (targetIdIsOrphan && mergeIdsOrphans.length !== mergeIds.length) {
          // there is a non-orphan in mergeIds, target can be removed from orphan arr
          filteredOrphans = filteredOrphans.filter(o => o.id !== targetId);
        }
        filteredOrphans = filteredOrphans.filter(o => !mergeIds.includes(o.id));

        // Refetch rule counts after merging
        await refetchRuleCounts();

        void refetchPayees();
        queryClient.setQueryData(
          payeeQueries.listOrphaned().queryKey,
          filteredOrphans,
        );
      }}
      onViewRules={onViewRules}
      onCreateRule={onCreateRule}
    />
  );
}
