import { type ComponentProps, useRef, useState } from 'react';

import { type AccountEntity } from 'loot-core/types/models';

import { useAccount } from '../../hooks/useAccount';
import { SvgClose, SvgDotsHorizontalTriple, SvgLockOpen } from '../../icons/v1';
import { type CSSProperties, styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';
import { Popover } from '../common/Popover';
import { View } from '../common/View';
import { FieldLabel } from '../mobile/MobileForms';
import { FocusableAmountInput } from '../mobile/transactions/FocusableAmountInput';
import { amountToInteger, integerToAmount } from 'loot-core/shared/util';
import { useDispatch } from 'react-redux';
import { collapseModals } from 'loot-core/client/actions';

type AccountMenuModalProps = {
  accountId: string;
  clearedBalance: number;
  onReconcile?: (amount: number) => void;
};

export function ReconcileModal({
  accountId,
  clearedBalance,
  onReconcile,
}: AccountMenuModalProps) {
  const account = useAccount(accountId);
  const dispatch = useDispatch();
  const [amountFocused, setAmountFocused] = useState(false);
  const [reconcileAmount, setReconcileAmount] = useState(clearedBalance);

  return (
    <Modal name="reconcile">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={<ModalTitle title={'Reconcile'} />}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <FieldLabel title="Enter the current balance of your bank account that you want to reconcile with:" />
            <FocusableAmountInput
              value={integerToAmount(reconcileAmount)}
              focused={amountFocused}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              onEnter={() => {
                onReconcile?.(reconcileAmount);
                dispatch(collapseModals('account-menu'));
                close();
              }}
              zeroSign="+"
              focusedStyle={{
                width: 'auto',
                padding: '5px',
                paddingLeft: '20px',
                paddingRight: '20px',
                minWidth: '100%',
              }}
              textStyle={{ ...styles.veryLargeText, textAlign: 'center' }}
              onUpdateAmount={v => {
                setReconcileAmount(amountToInteger(v));
              }}
            />
          </View>
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Button
              variant="primary"
              style={{
                height: styles.mobileMinHeight,
                marginLeft: styles.mobileEditingPadding,
                marginRight: styles.mobileEditingPadding,
              }}
              onPress={() => {
                onReconcile?.(reconcileAmount);
                dispatch(collapseModals('account-menu'));
                close();
              }}
            >
              Reconcile
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}
