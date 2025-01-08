import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { closeBudget } from 'loot-core/client/budgets/budgetsSlice';

import { useDispatch } from '../../redux';
import { Button } from '../common/Button2';
import { Link } from '../common/Link';
import { Modal, ModalHeader, ModalTitle } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';

export function OutOfSyncMigrationsModal() {
  const dispatch = useDispatch();

  const { t } = useTranslation();

  const closeBudgetAndModal = (close: () => void) => {
    dispatch(closeBudget());
    close();
  };

  return (
    <Modal name="out-of-sync-migrations">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={<ModalTitle title={t('Please update Actual!')} />}
          />
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
                <Trans>
                  It looks like you&apos;re using an outdated version of the
                  Actual client. Your budget data has been updated by another
                  client, but this client is still on the old verison. For the
                  best experience, please update Actual to the latest version.
                </Trans>
              </Paragraph>
            </Text>

            <Paragraph
              style={{
                fontSize: 16,
              }}
            >
              <Trans>
                If you can&apos;t update Actual at this time you can find the
                latest release at{' '}
                <Link variant="external" to="https://app.actualbudget.org">
                  app.actualbudget.org
                </Link>
                . You can use it until your client is updated.
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
