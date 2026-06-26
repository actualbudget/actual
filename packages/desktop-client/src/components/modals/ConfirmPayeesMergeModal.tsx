import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowDown } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Information } from '#components/alerts';
import { Modal, ModalButtons, ModalHeader } from '#components/common/Modal';
import { usePayees } from '#hooks/usePayees';
import type { Modal as ModalType } from '#modals/modalsSlice';

const mergePayeeStyle = {
  padding: 10,
  border: 'solid',
  borderWidth: 1,
  borderRadius: 6,
  borderColor: theme.tableBorder,
  backgroundColor: theme.tableBackground,
};

const targetPayeeStyle = {
  ...mergePayeeStyle,
  backgroundColor: theme.tableRowBackgroundHighlight,
};

type ConfirmPayeesMergeModalProps = Extract<
  ModalType,
  { name: 'confirm-payees-merge' }
>['options'];

export function ConfirmPayeesMergeModal({
  payeeIds,
  targetPayeeId,
  onConfirm,
}: ConfirmPayeesMergeModalProps) {
  const { t } = useTranslation();
  const { data: allPayees = [] } = usePayees();

  const mergePayees = allPayees.filter(p => payeeIds.includes(p.id));

  const targetPayee = allPayees.find(p => p.id === targetPayeeId);

  if (!targetPayee || mergePayees.length === 0) {
    return null;
  }

  return (
    <Modal name="confirm-payees-merge">
      {({ state }) => (
        <>
          <ModalHeader title={t('Confirm Merge')} />

          <View style={{ maxWidth: 500, marginTop: 20 }}>
            <View
              style={{
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
              }}
            >
              <View style={{ width: '100%', flexDirection: 'column', gap: 10 }}>
                {mergePayees.map(payee => (
                  <View style={mergePayeeStyle} key={payee.id}>
                    <Text>{payee.name}</Text>
                  </View>
                ))}
              </View>
              <SvgArrowDown width={20} height={20} />
              <View style={{ width: '100%' }}>
                <View style={targetPayeeStyle}>
                  <Text
                    style={{
                      fontWeight: 700,
                      color: theme.tableRowBackgroundHighlightText,
                    }}
                  >
                    {targetPayee.name}
                  </Text>
                </View>
              </View>
            </View>

            <Information style={{ marginTop: 20 }}>
              <Trans>
                Merging will delete the selected payee(s) and transfer any
                associated rules to the target payee.
              </Trans>
            </Information>

            <ModalButtons style={{ marginTop: 20 }} focusButton>
              <Button style={{ marginRight: 10 }} onPress={() => state.close()}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                variant="primary"
                style={{ marginRight: 10 }}
                onPress={async () => {
                  onConfirm?.();
                  state.close();
                }}
              >
                <Trans>Merge</Trans>
              </Button>
            </ModalButtons>
          </View>
        </>
      )}
    </Modal>
  );
}
