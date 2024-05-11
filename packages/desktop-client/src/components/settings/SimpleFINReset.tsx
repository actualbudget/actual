import React, { useEffect, useState } from 'react';

import { useActions } from '../../hooks/useActions';
import { useSimpleFinStatus } from '../../hooks/useSimpleFinStatus';
import { ButtonWithLoading } from '../common/Button';
import { Text } from '../common/Text';

import { Setting } from './UI';

export function SimpleFINResetCredential() {
  const actions = useActions();
  const [isSimpleFinSetupComplete, setIsSimpleFinSetupComplete] = useState<
    boolean | null
  >(null);
  const [loadingSimpleFinAccounts, setLoadingSimpleFinAccounts] =
    useState(false);

  const onSimpleFinInit = () => {
    setLoadingSimpleFinAccounts(true);
    actions.pushModal('simplefin-init', {
      onSuccess: () => {
        setIsSimpleFinSetupComplete(true);
      },
    });
    setLoadingSimpleFinAccounts(false);
  };
  const { configuredSimpleFin } = useSimpleFinStatus();
  useEffect(() => {
    setIsSimpleFinSetupComplete(configuredSimpleFin);
  }, [configuredSimpleFin]);

  return (
    <Setting
      primaryAction={
        <ButtonWithLoading
          loading={loadingSimpleFinAccounts}
          disabled={!isSimpleFinSetupComplete}
          onClick={onSimpleFinInit}
        >
          Reset SimpleFIN Credential
        </ButtonWithLoading>
      }
    >
      {isSimpleFinSetupComplete ? (
        <Text>
          <strong>Reset your SimpleFIN credential</strong> if you are having
          issues with account sync. In some cases (like importing from an
          existing database to a new instance), you may need to generate a new
          SimpleFIN setup token to receive a valid access token for your
          SimpleFIN account. If you are having trouble, generate a new setup
          token and enter it here.
        </Text>
      ) : (
        <Text>
          <strong>Reset SimpleFIN Credential</strong> is only available when
          SimpleFIN has been enabled and configured.
        </Text>
      )}
    </Setting>
  );
}
