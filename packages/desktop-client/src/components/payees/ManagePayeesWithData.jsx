import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import { send, listen } from 'loot-core/src/platform/client/fetch';
import { applyChanges } from 'loot-core/src/shared/util';

import { useActions } from '../../hooks/useActions';
import { useCategories } from '../../hooks/useCategories';
import { usePayees } from '../../hooks/usePayees';

import { ManagePayees } from './ManagePayees';

export function ManagePayeesWithData({ initialSelectedIds }) {
  const initialPayees = usePayees();
  const lastUndoState = useSelector(state => state.app.lastUndoState);
  const { grouped: categoryGroups } = useCategories();

  const { initiallyLoadPayees, getPayees, setLastUndoState, pushModal } =
    useActions();

  const [payees, setPayees] = useState(initialPayees);
  const [ruleCounts, setRuleCounts] = useState({ value: new Map() });
  const [orphans, setOrphans] = useState({ value: new Map() });
  const payeesRef = useRef();

  async function refetchOrphanedPayees() {
    const orphs = await send('payees-get-orphaned');
    setOrphans(orphs);
  }

  async function refetchRuleCounts() {
    let counts = await send('payees-get-rule-counts');
    counts = new Map(Object.entries(counts));
    setRuleCounts({ value: counts });
  }

  useEffect(() => {
    async function loadData() {
      const result = await initiallyLoadPayees();

      // Wait a bit before setting the data. This lets the modal
      // settle and makes for a smoother experience.
      await new Promise(resolve => setTimeout(resolve, 100));

      if (result) {
        setPayees(result);
      }

      refetchRuleCounts();
      refetchOrphanedPayees();
    }
    loadData();

    const unlisten = listen('sync-event', async ({ type, tables }) => {
      if (type === 'applied') {
        if (tables.includes('rules')) {
          refetchRuleCounts();
        }
      }
    });

    return () => {
      unlisten();
    };
  }, []);

  async function onUndo({ tables, messages, meta }) {
    if (!tables.includes('payees') && !tables.includes('payee_mapping')) {
      return;
    }

    setPayees(await getPayees());
    refetchOrphanedPayees();

    if (
      (meta && meta.targetId) ||
      messages.find(msg => msg.dataset === 'rules')
    ) {
      refetchRuleCounts();
    }

    setLastUndoState(null);
  }

  useEffect(() => {
    if (lastUndoState.current) {
      onUndo(lastUndoState.current);
    }

    return listen('undo-event', onUndo);
  }, []);

  function onViewRules(id) {
    pushModal('manage-rules', { payeeId: id });
  }

  function onCreateRule(id) {
    const rule = {
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
    pushModal('edit-rule', { rule });
  }

  return (
    <ManagePayees
      ref={payeesRef}
      payees={payees}
      ruleCounts={ruleCounts.value}
      orphanedPayees={orphans}
      categoryGroups={categoryGroups}
      initialSelectedIds={initialSelectedIds}
      lastUndoState={lastUndoState}
      onBatchChange={changes => {
        send('payees-batch-change', changes);
        setPayees(applyChanges(changes, payees));
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

        const result = payees.filter(p => !mergeIds.includes(p.id));
        mergeIds.forEach(id => {
          const count = ruleCounts.value.get(id) || 0;
          ruleCounts.value.set(
            targetId,
            (ruleCounts.value.get(targetId) || 0) + count,
          );
        });

        setPayees(result);
        setOrphans(filtedOrphans);
        setRuleCounts({ value: ruleCounts.value });
      }}
      onViewRules={onViewRules}
      onCreateRule={onCreateRule}
    />
  );
}
