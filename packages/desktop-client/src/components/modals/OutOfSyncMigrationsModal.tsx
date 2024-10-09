import React from 'react';
import { Trans } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { closeBudget } from 'loot-core/client/actions';

import { Button } from '../common/Button2';
import { Link } from '../common/Link';
import { Modal, ModalHeader, ModalTitle } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';

export function OutOfSyncMigrationsModal() {
  const dispatch = useDispatch();

  const closeBudgetAndModal = (close: () => void) => {
    dispatch(closeBudget());
    close();
  };

  return (
    <Modal name="out-of-sync-migrations">
      {({ state: { close } }) => (
        <>
          <ModalHeader title={<ModalTitle title="Please update Actual!" />} />
          <View
            style={{
              padding: 15,
              gap: 15,
              paddingTop: 0,
              paddingBottom: 25,
              maxWidth: 550,
              lineHeight: '1.5em',
            }}
          >
            <Text>
              <Paragraph style={{ fontSize: 16 }}>
                It looks like you&apos;re using an outdated version of the
                Actual. Your data has been updated, but your client hasn&apos;t.
                To ensure the best experience, please update Actual to the
                latest version.
              </Paragraph>
            </Text>

            <Paragraph
              style={{
                fontSize: 16,
              }}
            >
              <Trans>
                If you can&apos;t update Actual at this time but need to use it
                you can find the latest release at{' '}
                <Link variant="external" to="https://app.actualbudget.org">
                  app.actualbudget.org
                </Link>
              </Trans>
            </Paragraph>

            <View
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
            >
              <Button
                variant="primary"
                style={{
                  padding: '10px 30px',
                }}
                onPress={() => closeBudgetAndModal(close)}
              >
                <Trans>Close Budget</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
