import React from 'react';

import { Button } from '../common/Button2';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';

type OutOfSyncMigrationsModalProps = {
  budgetId: string;
};

export function OutOfSyncMigrationsModal({
  budgetId,
}: OutOfSyncMigrationsModalProps) {
  return (
    <Modal name="out-of-sync-migrations">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={<ModalTitle title="Out of sync migrations" />}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: 400,
              }}
            >
              You are using an old version of the client. Please update to the
              latest. If you wish to continue using this client, please accept
              that the app may not function correctly.
              <Button>Accept</Button>
            </Text>
          </View>
        </>
      )}
    </Modal>
  );
}
