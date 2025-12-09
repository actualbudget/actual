import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Paragraph } from '@actual-app/components/paragraph';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { type PayeeEntity } from 'loot-core/types/models';
import { type TransObjectLiteral } from 'loot-core/types/util';

import { Information } from '@desktop-client/components/alerts';
import { Modal, ModalButtons } from '@desktop-client/components/common/Modal';
import { usePayees } from '@desktop-client/hooks/usePayees';
import {
  type Modal as ModalType,
  replaceModal,
} from '@desktop-client/modals/modalsSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

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
        if (!rule) {
          return;
        }

        dispatch(
          replaceModal({ modal: { name: 'edit-rule', options: { rule } } }),
        );
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
                <Trans>
                  The payee{' '}
                  <Text style={highlightStyle}>
                    {{ previousPayee: payees[0].name } as TransObjectLiteral}
                  </Text>{' '}
                  is not used by transactions any more. Would you like to merge
                  it with{' '}
                  <Text style={highlightStyle}>
                    {{ payee: targetPayee.name } as TransObjectLiteral}
                  </Text>
                  ?
                </Trans>
              ) : (
                <>
                  <Trans>
                    The following payees are not used by transactions any more.
                    Would you like to merge them with{' '}
                    <Text style={highlightStyle}>
                      {{ payee: targetPayee.name } as TransObjectLiteral}
                    </Text>
                    ?
                  </Trans>
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
              <Trans>
                Merging will remove the payee and transfer any existing rules to
                the new payee.
              </Trans>
              {!isEditingRule && (
                <>
                  {' '}
                  <Trans>
                    If checked below, a rule will be created to do this rename
                    while importing transactions.
                  </Trans>
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
                aria-label={t(
                  'Automatically rename these payees in the future',
                )}
              >
                <input
                  type="checkbox"
                  checked={shouldCreateRule}
                  onChange={e => setShouldCreateRule(e.target.checked)}
                />
                <Text style={{ marginLeft: 3 }}>
                  <Trans>Automatically rename these payees in the future</Trans>
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
                <Trans>Merge</Trans>
              </Button>
              {!isEditingRule && (
                <Button
                  style={{ marginRight: 10 }}
                  onPress={() => {
                    onMergeAndCreateRule(targetPayee);
                    close();
                  }}
                >
                  <Trans>Merge and edit rule</Trans>
                </Button>
              )}
              <Button style={{ marginRight: 10 }} onPress={close}>
                <Trans>Do nothing</Trans>
              </Button>
            </ModalButtons>
          </View>
        </View>
      )}
    </Modal>
  );
}
