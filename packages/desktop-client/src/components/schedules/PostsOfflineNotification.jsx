import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { popModal } from 'loot-core/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';

import { useFormatList } from '../../hooks/useFormatList';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { Paragraph } from '../common/Paragraph';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { DisplayId } from '../util/DisplayId';

export function PostsOfflineNotification() {
  const { t } = useTranslation();

  const location = useLocation();
  const dispatch = useDispatch();

  const payees = (location.state && location.state.payees) || [];

  async function onPost() {
    await send('schedule/force-run-service');
    dispatch(popModal());
  }

  const payeesList = payees.map(id => (
    <Text key={id} style={{ color: theme.pageTextPositive }}>
      <DisplayId id={id} type="payees" />
    </Text>
  ));
  const payeeNamesList = useFormatList(payeesList, t.language);

  return (
    <Modal name="schedule-posts-offline-notification">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Post transactions?')}
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <Paragraph>
            <Text>
              {payees.length > 0 ? (
                <Trans count={payees.length}>
                  The payees <span>{payeeNamesList}</span> have schedules that
                  are due today.
                </Trans>
              ) : (
                t('There are payees that have schedules that are due today.', {
                  count: payees.length,
                })
              )}{' '}
              <Trans>
                Usually we automatically post transactions for these, but you
                are offline or syncing failed. In order to avoid duplicate
                transactions, we let you choose whether or not to create
                transactions for these schedules.
              </Trans>
            </Text>
          </Paragraph>
          <Paragraph>
            <Trans>
              Be aware that other devices may have already created these
              transactions. If you have multiple devices, make sure you only do
              this on one device or you will have duplicate transactions.
            </Trans>
          </Paragraph>
          <Paragraph>
            <Trans>
              You can always manually post a transaction later for a due
              schedule by selecting the schedule and clicking “Post transaction”
              in the action menu.
            </Trans>
          </Paragraph>
          <Stack
            direction="row"
            justify="flex-end"
            style={{ marginTop: 20 }}
            spacing={2}
          >
            <Button onPress={close}>
              <Trans>Decide later</Trans>
            </Button>
            <Button
              variant="primary"
              autoFocus
              onPress={() => {
                onPost();
                close();
              }}
            >
              <Trans>Post transactions</Trans>
            </Button>
          </Stack>
        </>
      )}
    </Modal>
  );
}
