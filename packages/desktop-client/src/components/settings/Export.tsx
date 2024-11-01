import React, { useState } from 'react';

import { format } from 'date-fns';
import { t } from 'i18next';

import { send } from 'loot-core/src/platform/client/fetch';

import { useMetadataPref } from '../../hooks/useMetadataPref';
import { theme } from '../../style';
import { Block } from '../common/Block';
import { ButtonWithLoading } from '../common/Button2';
import { Text } from '../common/Text';

import { Setting } from './UI';

export function ExportBudget() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetName] = useMetadataPref('budgetName');
  const [encryptKeyId] = useMetadataPref('encryptKeyId');

  async function onExport() {
    setIsLoading(true);
    setError(null);

    const response = await send('export-budget');

    if ('error' in response) {
      setError(response.error);
      setIsLoading(false);
      console.log(t('Export error code:'), response.error);
      return;
    }

    window.Actual?.saveFile(
      response.data,
      `${format(new Date(), 'yyyy-MM-dd')}-${budgetName}.zip`,
      t('Export budget'),
    );
    setIsLoading(false);
  }

  return (
    <Setting
      primaryAction={
        <>
          <ButtonWithLoading onPress={onExport} isLoading={isLoading}>
            {t('Export data')}
          </ButtonWithLoading>
          {error && (
            <Block style={{ color: theme.errorText, marginTop: 15 }}>
              {t(
                'An unknown error occurred while exporting. Please report this as a new issue on Github.',
              )}
            </Block>
          )}
        </>
      }
    >
      <Text>
        <strong>{t('Export')}</strong>{' '}
        {t(
          'your data as a zip file containing db.sqlite and metadata.json files. It can be imported into another Actual instance by closing an open file (if any), then clicking the “Import file” button, then choosing “Actual.”',
        )}
      </Text>
      {encryptKeyId ? (
        <Text>
          {t(
            'Even though encryption is enabled, the exported zip file will not have any encryption.',
          )}
        </Text>
      ) : null}
    </Setting>
  );
}
