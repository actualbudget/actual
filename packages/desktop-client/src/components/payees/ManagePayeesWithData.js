import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import { applyChanges } from 'loot-core/src/shared/util';
import { ManagePayees } from 'loot-design/src/components/payees';

function ManagePayeesWithData({
  modalProps,
  initialSelectedIds,
  lastUndoState,
  initialPayees,
  categoryGroups,
  initiallyLoadPayees,
  getPayees,
  setLastUndoState,
  pushModal
}) {
  let [payees, setPayees] = useState(initialPayees);
  let [ruleCounts, setRuleCounts] = useState({ value: new Map() });
  let payeesRef = useRef();

  async function refetchRuleCounts() {
    let counts = await send('payees-get-rule-counts');
    counts = new Map(Object.entries(counts));
    setRuleCounts({ value: counts });
  }

  useEffect(() => {
    async function loadData() {
      let result = await initiallyLoadPayees();

      // Wait a bit before setting the data. This lets the modal
      // settle and makes for a smoother experience.
      await new Promise(resolve => setTimeout(resolve, 100));

      if (result) {
        setPayees(result);
      }

      refetchRuleCounts();
    }
    loadData();

    let unlisten = listen('sync-event', async ({ type, tables }) => {
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

  async function onUndo({ tables, messages, meta, url }, scroll = false) {
    if (
      !tables.includes('payees') &&
      !tables.includes('payee_mapping') &&
      !tables.includes('payee_rules')
    ) {
      return;
    }

    setPayees(await getPayees());

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
      onUndo(lastUndoState.current, true);
    }

    return listen('undo-event', onUndo);
  }, []);

  function onViewRules(id) {
    pushModal('manage-rules', { payeeId: id });
  }

  function onCreateRule(id) {
    let rule = {
      stage: null,
      conditions: [
        {
          field: 'payee',
          op: 'is',
          value: id,
          type: 'id'
        }
      ],
      actions: [
        {
          op: 'set',
          field: 'category',
          value: null,
          type: 'id'
        }
      ]
    };
    pushModal('edit-rule', { rule });
  }

  return (
    <ManagePayees
      ref={payeesRef}
      modalProps={modalProps}
      payees={payees}
      ruleCounts={ruleCounts.value}
      categoryGroups={categoryGroups}
      initialSelectedIds={initialSelectedIds}
      lastUndoState={lastUndoState}
      onBatchChange={changes => {
        send('payees-batch-change', changes);
        setPayees(applyChanges(changes, payees));
      }}
      onMerge={async ([targetId, ...mergeIds]) => {
        await send('payees-merge', { targetId, mergeIds });

        let result = payees.filter(p => !mergeIds.includes(p.id));
        mergeIds.forEach(id => {
          let count = ruleCounts.value.get(id) || 0;
          ruleCounts.value.set(
            targetId,
            (ruleCounts.value.get(targetId) || 0) + count
          );
        });

        setPayees(result);
        setRuleCounts({ value: ruleCounts.value });
      }}
      onViewRules={onViewRules}
      onCreateRule={onCreateRule}
    />
  );
}

export default connect(
  state => ({
    initialPayees: state.queries.payees,
    lastUndoState: state.app.lastUndoState,
    categoryGroups: state.queries.categories.grouped
  }),
  actions
)(ManagePayeesWithData);
