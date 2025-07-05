import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { ButtonWithLoading } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { format } from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';

import { Setting } from './UI';

import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';

export function ExportBudget() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetName] = useMetadataPref('budgetName');
  const [encryptKeyId] = useMetadataPref('encryptKeyId');

  async function onExport() {
    setIsLoading(true);
    setError(null);

    const response = await send('export-budget');

    if ('error' in response && response.error) {
      setError(response.error);
      setIsLoading(false);
      console.log('Export error code:', response.error);
      return;
    }

    if (response.data) {
      window.Actual.saveFile(
        response.data,
        `${format(new Date(), 'yyyy-MM-dd')}-${budgetName}.zip`,
        t('Export budget'),
      );
    }
    setIsLoading(false);
  }

  return (
    <Setting
      primaryAction={
        <>
          <ButtonWithLoading onPress={onExport} isLoading={isLoading}>
            <Trans>Export data</Trans>
          </ButtonWithLoading>
          {error && (
            <Block style={{ color: theme.errorText, marginTop: 15 }}>
              {t(
                'An unknown error occurred while exporting. Please report this as a new issue on GitHub.',
              )}
            </Block>
          )}
        </>
      }
    >
      <Text>
        <Trans>
          <strong>Export</strong> your data as a zip file containing{' '}
          <code>db.sqlite</code> and <code>metadata.json</code> files. It can be
          imported into another Actual instance by closing an open file (if
          any), then clicking the “Import file” button, then choosing “Actual.”
        </Trans>
      </Text>
      {encryptKeyId ? (
        <Text>
          <Trans>
            Even though encryption is enabled, the exported zip file will not
            have any encryption.
          </Trans>
        </Text>
      ) : null}
    </Setting>
  );
}
