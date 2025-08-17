import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Paragraph } from '@actual-app/components/paragraph';
import { View } from '@actual-app/components/view';

import { Error } from '@desktop-client/components/alerts';

import { Modal, ModalHeader } from '@desktop-client/components/common/Modal';
import { useSearchParams } from 'react-router';
import { send } from 'loot-core/platform/client/fetch';

export function EnableBankingCallback() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState<string|null>(null);

  const state = searchParams.get('state');
  const code = searchParams.get('code')

  if(!state){

  }
  console.log(searchParams.get('state'))

  useEffect(() => {
    const fetchData = async () => {
      if (!state || !code){
        setError(t("Something went wrong during authentication. Please try again."))
        return;
      }
      await send("enablebanking-completeauth",{state,code})
      window.opener = null;
      window.open("", "_self");
      window.close();
    };
    fetchData();
  }, []);
  return (
    <Modal name="enablebanking-callback" isDismissable={false}>
      <ModalHeader title={t('Account sync')} />
      <View style={{ maxWidth: 500 }}>
        {(!error?
          <View>
            <Paragraph>
              <Trans>Please wait...</Trans>
            </Paragraph>
            <Paragraph>
              <Trans>
                The window should close automatically. If nothing happened you can
                close this window or tab.
              </Trans>
            </Paragraph>
          </View>:
          <Error style={{ alignSelf: 'center', marginBottom: 10 }}>
              {error}
          </Error>
        )}
      </View>
    </Modal>
  );
}
