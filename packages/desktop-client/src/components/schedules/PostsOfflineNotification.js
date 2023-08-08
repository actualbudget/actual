import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { send } from 'loot-core/src/platform/client/fetch';

import { colors } from '../../style';
import Button from '../common/Button';
import Paragraph from '../common/Paragraph';
import Stack from '../common/Stack';
import Text from '../common/Text';
import { Page } from '../Page';
import DisplayId from '../util/DisplayId';

export default function PostsOfflineNotification() {
  let location = useLocation();
  let navigate = useNavigate();

  let payees = (location.state && location.state.payees) || [];
  let plural = payees.length > 1;

  function onClose() {
    navigate(-1);
  }

  async function onPost() {
    await send('schedule/force-run-service');
    navigate(-1);
  }

  return (
    <Page title="Post transactions?" modalSize="small">
      <Paragraph>
        {payees.length > 0 ? (
          <Text>
            The {plural ? 'payees ' : 'payee '}
            {payees.map((id, idx) => (
              <Text key={id}>
                <Text style={{ color: colors.p4 }}>
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
        <Button onClick={onClose}>Decide later</Button>
        <Button type="primary" onClick={onPost}>
          Post transactions
        </Button>
      </Stack>
    </Page>
  );
}
