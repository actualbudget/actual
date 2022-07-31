import React from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useHistory } from 'react-router-dom';
import { useSchedules } from '@actual-app/loot-core/src/client/data-hooks/schedules';
import { send } from '@actual-app/loot-core/src/platform/client/fetch';
import {
  View,
  Text,
  P,
  Button,
  Stack
} from '@actual-app/loot-design/src/components/common';
import { Page } from '../Page';
import { SchedulesTable } from './SchedulesTable';
import DisplayId from '../util/DisplayId';
import { colors, styles } from '@actual-app/loot-design/src/style';

export default function PostsOfflineNotification() {
  let location = useLocation();
  let history = useHistory();

  let payees = (location.state && location.state.payees) || [];
  let plural = payees.length > 1;

  function onClose() {
    history.goBack();
  }

  async function onPost() {
    await send('schedule/force-run-service');
    history.goBack();
  }

  return (
    <Page title="Post transactions?" modalSize="small">
      <P>
        {payees.length > 0 ? (
          <Text>
            The {plural ? 'payees ' : 'payee '}
            {payees.map((id, idx) => (
              <Text>
                <Text style={{ color: colors.p4 }}>
                  <DisplayId key={id} id={id} type="payees" />
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
      </P>
      <P>
        Be aware that other devices may have already created these transactions.
        If you have multiple devices, make sure you only do this on one device
        or you will have duplicate transactions.
      </P>
      <P>
        You can always manually post a transaction later for a due schedule by
        selecting the schedule and clicking "Post transaction" in the action
        menu.
      </P>
      <Stack
        direction="row"
        justify="flex-end"
        style={{ marginTop: 20 }}
        spacing={2}
      >
        <Button onClick={onClose}>Decide later</Button>
        <Button primary onClick={onPost}>
          Post transactions
        </Button>
      </Stack>
    </Page>
  );
}
