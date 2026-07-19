import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { ButtonWithLoading } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { send } from '@actual-app/core/platform/client/connection';
import { format } from 'date-fns';

import { useMetadataPref } from '#hooks/useMetadataPref';

import { Setting } from './UI';

export function ExportBudget() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [budgetName] = useMetadataPref('budgetName');
  const [encryptKeyId] = useMetadataPref('encryptKeyId');

  async function onExport() {
    setIsLoading(true);
    setError(null);
    setWarnings([]);

    const response = await send('export-budget');

    if ('error' in response && response.error) {
      setError(response.error);
      setIsLoading(false);
      console.log('Export error code:', response.error);
      return;
    }

    if (response.data) {
      setWarnings(response.warnings ?? []);
      void window.Actual.saveFile(
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
          {warnings.includes('exceeds-import-size-limit') && (
            <Block style={{ color: theme.warningText, marginTop: 15 }}>
              <Trans>
                This export is larger than Actual can safely re-import. You may
                not be able to restore this backup.
              </Trans>
            </Block>
          )}
          {warnings.includes('may-exceed-available-memory') && (
            <Block style={{ color: theme.warningText, marginTop: 15 }}>
              <Trans>
                This export is larger than the memory available on this device.
                Restoring it here may fail.
              </Trans>
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
          any), then clicking the "Import file" button, then choosing "Actual."
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
