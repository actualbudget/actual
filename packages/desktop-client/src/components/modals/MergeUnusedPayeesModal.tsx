import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type Modal as ModalType,
  replaceModal,
} from 'loot-core/client/modals/modalsSlice';
import { send } from 'loot-core/src/platform/client/fetch';
import { type PayeeEntity } from 'loot-core/types/models';

import { usePayees } from '../../hooks/usePayees';
import { useSelector, useDispatch } from '../../redux';
import { theme } from '../../style';
import { Information } from '../alerts';
import { Button } from '../common/Button2';
import { Modal, ModalButtons } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';

const highlightStyle = { color: theme.pageTextPositive };

type MergeUnusedPayeesModalProps = Extract<
  ModalType,
  { name: 'merge-unused-payees' }
>['options'];

export function MergeUnusedPayeesModal({
  payeeIds,
  targetPayeeId,
}: MergeUnusedPayeesModalProps) {
  const { t } = useTranslation();
  const allPayees = usePayees();
  const modalStack = useSelector(state => state.modals.modalStack);
  const isEditingRule = !!modalStack.find(m => m.name === 'edit-rule');
  const dispatch = useDispatch();
  const [shouldCreateRule, setShouldCreateRule] = useState(true);
  const flashRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    // Flash the scrollbar
    if (flashRef.current) {
      const el = flashRef.current;
      const top = el.scrollTop;
      el.scrollTop = top + 1;
      el.scrollTop = top;
    }
  }, []);

  // We store the orphaned payees into state because when we merge it,
  // it will be deleted and this component will automatically
  // rerender. Is there a better pattern for live bindings?
  //
  // TODO: I think a custom `useSelector` hook that doesn't bind would
  // be nice
  const [payees] = useState<PayeeEntity[]>(() =>
    allPayees.filter(p => payeeIds.includes(p.id)),
  );

  const onMerge = useCallback(
    async (targetPayee: PayeeEntity) => {
      await send('payees-merge', {
        targetId: targetPayee.id,
        mergeIds: payees.map(payee => payee.id),
      });

      let ruleId;
      if (shouldCreateRule && !isEditingRule) {
        const id = await send('rule-add-payee-rename', {
          fromNames: payees.map(payee => payee.name),
          to: targetPayee.id,
        });
        ruleId = id;
      }

      return ruleId;
    },
    [shouldCreateRule, isEditingRule, payees],
  );

  const onMergeAndCreateRule = useCallback(
    async (targetPayee: PayeeEntity) => {
      const ruleId = await onMerge(targetPayee);

      if (ruleId) {
        const rule = await send('rule-get', { id: ruleId });
        dispatch(replaceModal({ name: 'edit-rule', options: { rule } }));
      }
    },
    [onMerge, dispatch],
  );

  const targetPayee = allPayees.find(p => p.id === targetPayeeId);
  if (!targetPayee) {
    return null;
  }

  return (
    <Modal name="merge-unused-payees">
      {({ state: { close } }) => (
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
                    {payees.map(payee => (
                      <li key={payee.id}>
                        <Text style={highlightStyle}>{payee.name}</Text>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Paragraph>

            <Information>
              {t(
                'Merging will remove the payee and transfer any existing rules to the new payee.',
              )}
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
                variant="primary"
                autoFocus
                style={{ marginRight: 10 }}
                onPress={() => {
                  onMerge(targetPayee);
                  close();
                }}
              >
                {t('Merge')}
              </Button>
              {!isEditingRule && (
                <Button
                  style={{ marginRight: 10 }}
                  onPress={() => {
                    onMergeAndCreateRule(targetPayee);
                    close();
                  }}
                >
                  {t('Merge and edit rule')}
                </Button>
              )}
              <Button style={{ marginRight: 10 }} onPress={close}>
                {t('Do nothing')}
              </Button>
            </ModalButtons>
          </View>
        </View>
      )}
    </Modal>
  );
}
