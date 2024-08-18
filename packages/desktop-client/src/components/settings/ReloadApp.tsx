import { useState, useCallback } from 'react';

import { ButtonWithLoading } from '../common/Button2';
import { Text } from '../common/Text';

import { Setting } from './UI';

export function ReloadApp() {
  const [reloading, setReloading] = useState(false);

  const reload: undefined | (() => Promise<void>) = window.Actual?.reload;
  const isReloadable = reload != null;

  const onReloadApp = useCallback(async () => {
    setReloading(true);
    if (reload) {
      await reload();
    }
    setReloading(false);
  }, [setReloading, reload]);

  return (
    <Setting
      primaryAction={
        <ButtonWithLoading
          isLoading={reloading}
          isDisabled={!isReloadable}
          onPress={onReloadApp}
        >
          Reload application
        </ButtonWithLoading>
      }
    >
      {isReloadable ? (
        <Text>
          <strong>Reload application</strong> will force the application to
          reload from the server. This is done automatically when there are new
          versions available, however forcing the application to reload may
          resolve issues with redirects with custom authentication
        </Text>
      ) : (
        <Text>
          <strong>Reload application</strong> is only available on browser
        </Text>
      )}
    </Setting>
  );
}
