import React, { useState } from 'react';

import { format } from 'date-fns';

import { send } from 'loot-core/src/platform/client/fetch';

import { useLocalPref } from '../../hooks/useLocalPref';
import { theme } from '../../style';
import { Block } from '../common/Block';
import { ButtonWithLoading } from '../common/Button';
import { Text } from '../common/Text';

import { Setting } from './UI';

export function ExportBudget() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetName] = useLocalPref('budgetName');
  const [encryptKeyId] = useLocalPref('encryptKeyId');

  async function onExport() {
    setIsLoading(true);
    setError(null);

    const response = await send('export-budget');

    if ('error' in response) {
      setError(response.error);
      setIsLoading(false);
      console.log('Export error code:', response.error);
      return;
    }

    window.Actual?.saveFile(
      response.data,
      `${format(new Date(), 'yyyy-MM-dd')}-${budgetName}.zip`,
      'Export budget',
    );
    setIsLoading(false);
  }

  return (
    <Setting
      primaryAction={
        <>
          <ButtonWithLoading onClick={onExport} loading={isLoading}>
            Export data
          </ButtonWithLoading>
          {error && (
            <Block style={{ color: theme.errorText, marginTop: 15 }}>
              An unknown error occurred while exporting. Please report this as a
              new issue on Github.
            </Block>
          )}
        </>
      }
    >
      <Text>
        <strong>Export</strong> your data as a zip file containing{' '}
        <code>db.sqlite</code> and <code>metadata.json</code> files. It can be
        imported into another Actual instance by closing an open file (if any),
        then clicking the “Import file” button, then choosing “Actual.”
      </Text>
      {encryptKeyId ? (
        <Text>
          Even though encryption is enabled, the exported zip file will not have
          any encryption.
        </Text>
      ) : null}
    </Setting>
  );
}
