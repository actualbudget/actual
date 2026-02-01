import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from 'loot-core/platform/client/fetch';

import { useSyncServerStatus } from './useSyncServerStatus';

import { deconfigureEnableBanking } from '@desktop-client/banksync/enablebanking';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

export function useEnableBankingStatus() {
  const [configuredEnableBanking, setConfiguredEnableBanking] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useSyncServerStatus();
  const dispatch = useDispatch();
  const t = useTranslation().t;

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);

      try {
        const results = await send('enablebanking-status');
        if (results.error) {
          // Automatically reset credentials on errors that indicate invalid configuration
          if (
            results.error.error_code === 'ENABLEBANKING_APPLICATION_INACTIVE' ||
            results.error.error_code === 'ENABLEBANKING_SECRETS_INVALID'
          ) {
            try {
              await deconfigureEnableBanking();
              dispatch(
                addNotification({
                  notification: {
                    type: 'warning',
                    message: t(
                      'EnableBanking credentials were reset due to invalid configuration.',
                    ),
                  },
                }),
              );
            } catch {
              // Deconfiguration failed, but we still mark as unconfigured
            } finally {
              setConfiguredEnableBanking(false);
              setIsLoading(false);
            }
            return;
          }

          setConfiguredEnableBanking(false);
          setIsLoading(false);
          return;
        }

        setConfiguredEnableBanking(true);
      } catch {
        // Handle any unexpected errors during send() call
        setConfiguredEnableBanking(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'online') {
      fetch();
    }
  }, [status, dispatch, t]);

  return {
    configuredEnableBanking,
    isLoading,
  };
}
