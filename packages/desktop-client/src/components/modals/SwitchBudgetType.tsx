// @ts-strict-ignore
import React from 'react';
import { useSelector } from 'react-redux';

import { type State } from 'loot-core/src/client/state-types';
import { type PrefsState } from 'loot-core/src/client/state-types/prefs';

import { Button } from '../common/Button';
import { ExternalLink } from '../common/ExternalLink';
import { Modal } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { type CommonModalProps } from '../Modals';

type SwitchBudgetTypeProps = {
  modalProps: CommonModalProps;
  onSwitch: () => void;
};

export function SwitchBudgetType({
  modalProps,
  onSwitch,
}: SwitchBudgetTypeProps) {
  const budgetType = useSelector<State, PrefsState['local']['budgetType']>(
    state => state.prefs.local.budgetType,
  );
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
            onClick={() => {
              onSwitch();
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
