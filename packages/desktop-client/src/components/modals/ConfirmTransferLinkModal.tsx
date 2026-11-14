import { useEffect, useEffectEvent, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { FinancialText } from '#components/FinancialText';
import { useAccount } from '#hooks/useAccount';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { usePayee } from '#hooks/usePayee';
import type { Modal as ModalType } from '#modals/modalsSlice';

type ConfirmTransferLinkModalProps = Extract<
  ModalType,
  { name: 'confirm-transfer-link' }
>['options'];

export function ConfirmTransferLinkModal({
  fromAccount,
  match,
  onLink,
  onCreateNew,
}: ConfirmTransferLinkModalProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const account = useAccount(match.account);
  const sourceAccount = useAccount(fromAccount);
  // Same rule as the server uses when linking: the category is cleared only
  // between two on-budget or two off-budget accounts
  const clearsCategory =
    match.category != null && sourceAccount?.offbudget === account?.offbudget;
  const { data: payee } = usePayee(match.payee);
  // Every close path other than Link means Create new
  const hasLinked = useRef(false);
  // A navigation removes the modal without closing it. Settle the pending
  // save then too, or it never finishes.
  const onRemoved = useEffectEvent(() => {
    if (!hasLinked.current) {
      onCreateNew();
    }
  });
  useEffect(() => () => onRemoved(), []);

  const { isNarrowWidth } = useResponsive();
  const narrowButtonStyle = isNarrowWidth
    ? { height: styles.mobileMinHeight }
    : {};

  return (
    <Modal
      name="confirm-transfer-link"
      containerProps={{ style: { width: '30vw' } }}
      onClose={() => {
        if (!hasLinked.current) {
          onCreateNew();
        }
      }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Link transfer?')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ lineHeight: 1.5 }}>
            <Block>
              <Trans>
                {{ account: account?.name ?? '' } as TransObjectLiteral} already
                has a matching transaction:
              </Trans>
            </Block>
            <Block style={{ marginTop: 10, fontWeight: 600 }}>
              {monthUtils.format(match.date, dateFormat)} ·{' '}
              {payee?.name || t('(No payee)')} ·{' '}
              <FinancialText>{format(match.amount, 'financial')}</FinancialText>
            </Block>
            {match.reconciled && (
              <Block style={{ marginTop: 10 }}>
                {clearsCategory ? (
                  <Trans>
                    This transaction is reconciled. Linking changes its payee
                    and clears its category.
                  </Trans>
                ) : (
                  <Trans>
                    This transaction is reconciled. Linking changes its payee.
                  </Trans>
                )}
              </Block>
            )}
            <View
              style={{
                marginTop: 20,
                flexDirection: 'row',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                style={{ marginRight: 10, ...narrowButtonStyle }}
                onPress={() => state.close()}
              >
                <Trans>Create new</Trans>
              </Button>
              <InitialFocus>
                <Button
                  variant="primary"
                  style={{ marginRight: 10, ...narrowButtonStyle }}
                  onPress={() => {
                    hasLinked.current = true;
                    onLink();
                    state.close();
                  }}
                >
                  <Trans>Link</Trans>
                </Button>
              </InitialFocus>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
