import { useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';
import { getOpenIdErrors } from 'loot-core/shared/errors';

import * as asyncStorage from '../../../../loot-core/src/platform/server/asyncStorage';
import { useActions } from '../../hooks/useActions';
import { theme, styles } from '../../style';
import { Error } from '../alerts';
import { Button } from '../common/Button2';
import { Label } from '../common/Label';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { View } from '../common/View';
import { type OpenIdConfig, OpenIdForm } from '../manager/subscribe/OpenIdForm';
import { useRefreshLoginMethods } from '../ServerContext';

export function OpenIDEnableModal({ onSave: originalOnSave }) {
  const [error, setError] = useState('');
  const actions = useActions();
  const { closeBudget } = useActions();
  const refreshLoginMethods = useRefreshLoginMethods();

  async function onSave(config: OpenIdConfig) {
    const { error } = (await send('enable-openid', { openId: config })) || {};
    if (!error) {
      originalOnSave?.();
      await refreshLoginMethods();
      await asyncStorage.removeItem('user-token');
      await closeBudget();
    } else {
      setError(getOpenIdErrors(error));
    }
  }

  return (
    <Modal name="Enable OpenID">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Enable OpenID"
            rightContent={<ModalCloseButton onClick={close} />}
          />

          <View style={{ flexDirection: 'column' }}>
            <OpenIdForm
              onSetOpenId={onSave}
              otherButtons={[
                <Button
                  key="cancel"
                  variant="bare"
                  style={{ marginRight: 10 }}
                  onPress={actions.popModal}
                >
                  Cancel
                </Button>,
              ]}
            />
            <Label
              style={{
                ...styles.verySmallText,
                color: theme.pageTextLight,
                paddingTop: 5,
              }}
              title="After enabling openid all sessions will be closed"
            />
            <Label
              style={{
                ...styles.verySmallText,
                color: theme.pageTextLight,
              }}
              title="The first user to login will become the server master"
            />
            <Label
              style={{
                ...styles.verySmallText,
                color: theme.warningText,
              }}
              title="The current password will be disabled"
            />

            {error && <Error>{error}</Error>}
          </View>
        </>
      )}
    </Modal>
  );
}
