import { use, useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { useSyncServerStatus } from './useSyncServerStatus';
import { useDispatch } from '@desktop-client/redux';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useTranslation } from 'react-i18next';
import { deconfigureEnableBanking } from '@desktop-client/banksync/enablebanking';
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

      const results = await send('enablebanking-status');
      if(results.error){
        setConfiguredEnableBanking(false);
        if(results.error.error_code === "ENABLEBANKING_APPLICATION_INACTIVE"){
          dispatch(addNotification({
            notification:{
              type: "error",
              message: t("Your Enable Banking application is inactive. Please reconfigure."),
              button:{
                title: t("reconfigure"),
                action: deconfigureEnableBanking
              
              }
            }
          }))
        }
        setIsLoading(false);
        return;

      }

      setConfiguredEnableBanking(true);
      setIsLoading(false);
    }

    if (status === 'online') {
      fetch();
    }
  }, [status]);

  return {
    configuredEnableBanking,
    isLoading,
  };
}
