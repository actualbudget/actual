import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { ButtonWithLoading } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { send } from '@actual-app/core/platform/client/connection';
import type { SkippedDashboardExport } from '@actual-app/core/shared/dashboard';
import { format } from 'date-fns';

import { Warning } from '#components/alerts';
import { useMetadataPref } from '#hooks/useMetadataPref';

import { Setting } from './UI';

export function ExportDashboards() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skippedDashboards, setSkippedDashboards] = useState<
    SkippedDashboardExport[]
  >([]);
  const [budgetName] = useMetadataPref('budgetName');

  function formatSkippedDashboard({ name, reason }: SkippedDashboardExport) {
    const displayName = name || t('Untitled dashboard');

    if (reason === 'missing-custom-report') {
      return t(
        '"{{name}}" contains a custom report widget linked to a missing report.',
        { name: displayName },
      );
    }

    return t('"{{name}}" could not be exported.', { name: displayName });
  }

  async function onExport() {
    setIsLoading(true);
    setError(null);
    setSkippedDashboards([]);

    try {
      const response = await send('dashboard-export-all');

      setSkippedDashboards(
        'skippedDashboards' in response
          ? (response.skippedDashboards ?? [])
          : [],
      );

      if ('error' in response && response.error) {
        setError(response.error);
        return;
      }

      if ('data' in response && response.data) {
        void window.Actual.saveFile(
          response.data,
          `${format(new Date(), 'yyyy-MM-dd')}-${budgetName}-dashboards.zip`,
          t('Export dashboards'),
        );
      }
    } catch {
      setError('An unknown error occurred while exporting dashboards.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Setting
      primaryAction={
        <>
          <ButtonWithLoading onPress={onExport} isLoading={isLoading}>
            <Trans>Export dashboards</Trans>
          </ButtonWithLoading>
          {error && (
            <Block style={{ color: theme.errorText, marginTop: 15 }}>
              {error === 'all-dashboards-failed'
                ? t(
                    'No dashboards could be exported. Review the skipped dashboards below.',
                  )
                : t(
                    'An unknown error occurred while exporting. Please report this as a new issue on GitHub.',
                  )}
            </Block>
          )}
          {skippedDashboards.length > 0 && (
            <Warning style={{ marginTop: 15 }}>
              <Trans count={skippedDashboards.length}>
                {{ count: skippedDashboards.length }} dashboard could not be
                exported:
              </Trans>
              {skippedDashboards.map((skipped, idx) => (
                <Block key={idx}>{formatSkippedDashboard(skipped)}</Block>
              ))}
            </Warning>
          )}
        </>
      }
    >
      <Text>
        <Trans>
          <strong>Export</strong> all your dashboards as a zip file for backup.
          Each dashboard is saved as a separate JSON file inside the zip. Each
          dashboard can be imported in the "Reports" tab, then selecting "...",
          then "Import".
        </Trans>
      </Text>
    </Setting>
  );
}

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
