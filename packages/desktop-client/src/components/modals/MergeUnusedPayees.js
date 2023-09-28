import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { replaceModal } from 'loot-core/src/client/actions/modals';
import { send } from 'loot-core/src/platform/client/fetch';

import { theme } from '../../style';
import { Information } from '../alerts';
import Button from '../common/Button';
import Modal, { ModalButtons } from '../common/Modal';
import Paragraph from '../common/Paragraph';
import Text from '../common/Text';
import View from '../common/View';

let highlightStyle = { color: theme.pageTextPositive };

export default function MergeUnusedPayees({
  modalProps,
  payeeIds,
  targetPayeeId,
}) {
  let { payees: allPayees, modalStack } = useSelector(state => ({
    payees: state.queries.payees,
    modalStack: state.modals.modalStack,
  }));
  let isEditingRule = !!modalStack.find(m => m.name === 'edit-rule');
  let dispatch = useDispatch();
  let [shouldCreateRule, setShouldCreateRule] = useState(true);
  let flashRef = useRef(null);

  useEffect(() => {
    // Flash the scrollbar
    if (flashRef.current) {
      let el = flashRef.current;
      let top = el.scrollTop;
      el.scrollTop = top + 1;
      el.scrollTop = top;
    }
  }, [flashRef.current, true]);

  // We store the orphaned payees into state because when we merge it,
  // it will be deleted and this component will automatically
  // rerender. Is there a better pattern for live bindings?
  //
  // TODO: I think a custom `useSelector` hook that doesn't bind would
  // be nice
  let [payees] = useState(() =>
    payeeIds.map(id => allPayees.find(p => p.id === id)),
  );
  let targetPayee = allPayees.find(p => p.id === targetPayeeId);

  if (!targetPayee) {
    return null;
  }

  async function onMerge() {
    await send('payees-merge', {
      targetId: targetPayee.id,
      mergeIds: payees.map(p => p.id),
    });

    let ruleId;
    if (shouldCreateRule && !isEditingRule) {
      let id = await send('rule-add-payee-rename', {
        fromNames: payees.map(p => p.name),
        to: targetPayee.id,
      });
      ruleId = id;
    }

    modalProps.onClose();

    return ruleId;
  }

  async function onMergeAndCreateRule() {
    let ruleId = await onMerge();

    if (ruleId) {
      let rule = await send('rule-get', { id: ruleId });
      dispatch(replaceModal('edit-rule', { rule }));
    }
  }

  return (
    <Modal
      title="Merge payee?"
      padding={0}
      showHeader={false}
      {...modalProps}
      style={modalProps.style}
    >
      {() => (
        <View style={{ padding: 20, maxWidth: 500 }}>
          <View>
            <Paragraph style={{ marginBottom: 10, fontWeight: 500 }}>
              {payees.length === 1 ? (
                <>
                  The payee <Text style={highlightStyle}>{payees[0].name}</Text>{' '}
                  is not used by transactions any more. Would like to merge it
                  with <Text style={highlightStyle}>{targetPayee.name}</Text>?
                </>
              ) : (
                <>
                  The following payees are not used by transactions any more.
                  Would like to merge them with{' '}
                  <Text style={highlightStyle}>{targetPayee.name}</Text>?
                  <ul
                    ref={flashRef}
                    style={{
                      margin: 0,
                      marginTop: 10,
                      maxHeight: 140,
                      overflow: 'auto',
                    }}
                  >
                    {payees.map(p => (
                      <li key={p.id}>
                        <Text style={highlightStyle}>{p.name}</Text>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Paragraph>

            <Information>
              Merging will remove the payee and transfer any existing rules to
              the new payee.
              {!isEditingRule && (
                <>
                  {' '}
                  If checked below, a rule will be created to do this rename
                  while importing transactions.
                </>
              )}
            </Information>

            {!isEditingRule && (
              <label
                style={{
                  fontSize: 13,
                  marginTop: 10,
                  color: theme.pageTextLight,
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <input
                  type="checkbox"
                  checked={shouldCreateRule}
                  onChange={e => setShouldCreateRule(e.target.checked)}
                />
                <Text style={{ marginLeft: 3 }}>
                  Automatically rename{' '}
                  {payees.length === 1 ? 'this payee' : 'these payees'} in the
                  future
                </Text>
              </label>
            )}

            <ModalButtons style={{ marginTop: 20 }} focusButton>
              <Button
                type="primary"
                isSubmit={false}
                style={{ marginRight: 10 }}
                onClick={onMerge}
              >
                Merge
              </Button>
              {!isEditingRule && (
                <Button
                  style={{ marginRight: 10 }}
                  onClick={onMergeAndCreateRule}
                >
                  Merge and edit rule
                </Button>
              )}
              <Button
                style={{ marginRight: 10 }}
                onClick={() => modalProps.onBack()}
              >
                Do nothing
              </Button>
            </ModalButtons>
          </View>
        </View>
      )}
    </Modal>
  );
}
