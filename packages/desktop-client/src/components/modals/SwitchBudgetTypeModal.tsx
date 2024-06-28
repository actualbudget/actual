// @ts-strict-ignore
import React from 'react';

import { useLocalPref } from '../../hooks/useLocalPref';
import { useResponsive } from '../../ResponsiveProvider';
import { styles } from '../../style';
import { Button } from '../common/Button';
import { Link } from '../common/Link';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal2';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';

type SwitchBudgetTypeModalProps = {
  onSwitch: () => void;
};

export function SwitchBudgetTypeModal({
  onSwitch,
}: SwitchBudgetTypeModalProps) {
  const [budgetType] = useLocalPref('budgetType');
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth
    ? {
        height: styles.mobileMinHeight,
      }
    : {};
  return (
    <Modal name="switch-budget-type">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={<ModalTitle title="Switch budget type?" shrinkOnOverflow />}
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <Paragraph>
            You are currently using a{' '}
            <Text style={{ fontWeight: 600 }}>
              {budgetType === 'report' ? 'Report budget' : 'Rollover budget'}.
            </Text>{' '}
            Switching will not lose any data and you can always switch back.
          </Paragraph>
          <Button
            type="primary"
            style={{
              ...narrowStyle,
            }}
            onClick={() => {
              onSwitch?.();
              close();
            }}
          >
            Switch to a{' '}
            {budgetType === 'report' ? 'Rollover budget' : 'Report budget'}
          </Button>
          <Paragraph
            isLast={true}
            style={{
              marginTop: 10,
            }}
          >
            <Link
              variant="external"
              to="https://actualbudget.org/docs/experimental/report-budget"
              linkColor="muted"
            >
              How do these types of budgeting work?
            </Link>
          </Paragraph>
        </>
      )}
    </Modal>
  );
}
