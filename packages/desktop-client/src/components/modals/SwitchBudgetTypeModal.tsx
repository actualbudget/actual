// @ts-strict-ignore
import React from 'react';

import { useLocalPref } from '../../hooks/useLocalPref';
import { useResponsive } from '../../ResponsiveProvider';
import { styles } from '../../style';
import { Button } from '../common/Button';
import { ExternalLink } from '../common/ExternalLink';
import { Modal } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { type CommonModalProps } from '../Modals';

type SwitchBudgetTypeModalProps = {
  modalProps: CommonModalProps;
  onSwitch: () => void;
};

export function SwitchBudgetTypeModal({
  modalProps,
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
    <Modal title="Switch budget type?" {...modalProps}>
      {() => (
        <>
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
              modalProps.onClose?.();
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
            <ExternalLink
              to="https://actualbudget.org/docs/experimental/report-budget"
              linkColor="muted"
            >
              How do these types of budgeting work?
            </ExternalLink>
          </Paragraph>
        </>
      )}
    </Modal>
  );
}
