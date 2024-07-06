import React from 'react';
import { useLocation } from 'react-router-dom';

import { send } from 'loot-core/src/platform/client/fetch';

import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Modal } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { DisplayId } from '../util/DisplayId';

export function PostsOfflineNotification({ modalProps, actions }) {
  const location = useLocation();

  const payees = (location.state && location.state.payees) || [];
  const plural = payees.length > 1;

  async function onPost() {
    await send('schedule/force-run-service');
    actions.popModal();
  }

  return (
    <Modal title="Post transactions?" size="small" {...modalProps}>
      <Paragraph>
        {payees.length > 0 ? (
          <Text>
            The {plural ? 'payees ' : 'payee '}
            {payees.map((id, idx) => (
              <Text key={id}>
                <Text style={{ color: theme.pageTextPositive }}>
                  <DisplayId id={id} type="payees" />
                </Text>
                {idx === payees.length - 1
                  ? ' '
                  : idx === payees.length - 2
                    ? ', and '
                    : ', '}
              </Text>
            ))}
          </Text>
        ) : (
          <Text>There {plural ? 'are payees ' : 'is a payee '} that </Text>
        )}

        <Text>
          {plural ? 'have ' : 'has '} schedules that are due today. Usually we
          automatically post transactions for these, but you are offline or
          syncing failed. In order to avoid duplicate transactions, we let you
          choose whether or not to create transactions for these schedules.
        </Text>
      </Paragraph>
      <Paragraph>
        Be aware that other devices may have already created these transactions.
        If you have multiple devices, make sure you only do this on one device
        or you will have duplicate transactions.
      </Paragraph>
      <Paragraph>
        You can always manually post a transaction later for a due schedule by
        selecting the schedule and clicking “Post transaction” in the action
        menu.
      </Paragraph>
      <Stack
        direction="row"
        justify="flex-end"
        style={{ marginTop: 20 }}
        spacing={2}
      >
        <Button onPress={actions.popModal}>Decide later</Button>
        <Button variant="primary" onPress={onPost}>
          Post transactions
        </Button>
      </Stack>
    </Modal>
  );
}
