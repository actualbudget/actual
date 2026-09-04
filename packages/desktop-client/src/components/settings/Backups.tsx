import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { MAX_BACKUPS } from '@actual-app/core/shared/backups';
import { isElectron } from '@actual-app/core/shared/environment';
import type { TransObjectLiteral } from '@actual-app/core/types/util';
import { format } from 'date-fns';

import { MIN_BACKUP_INTERVAL_MS } from '#backups';
import { Link } from '#components/common/Link';
import { useBackupDestination } from '#hooks/useBackupDestination';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useMetadataPref } from '#hooks/useMetadataPref';

import { BackupDestinationList } from './BackupDestinationList';
import { Setting } from './UI';

const BACKUP_FREQUENCY_MINS = MIN_BACKUP_INTERVAL_MS / 60 / 1000;
const BACKUP_DOCS_URL =
  'https://actualbudget.org/docs/experimental/automatic-backups';

export function Backups() {
  const isAutomaticBackupsEnabled = useFeatureFlag('automaticBackups');

  if (isElectron()) {
    return <ElectronBackups />;
  }
  if (!isAutomaticBackupsEnabled) {
    return null;
  }
  return <BackupDestinationSettings />;
}

function ElectronBackups() {
  return (
    <Setting>
      <Text>
        <strong>
          <Trans>Backups</Trans>
        </strong>
        <p>
          <Trans>
            Backups are taken every {{ BACKUP_FREQUENCY_MINS }} minutes and
            stored in{' '}
            <strong>
              <i>Actual's data directory</i>
            </strong>
            . Actual retains a maximum of {{ MAX_BACKUPS }} backups at any time.
          </Trans>
        </p>
      </Text>
    </Setting>
  );
}

function BackupDestinationSettings() {
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [encryptKeyId] = useMetadataPref('encryptKeyId');
  const {
    destination,
    status,
    label,
    lastBackupAt,
    isBusy,
    lastResult,
    providers,
    isSupported,
    connect,
    reconnect,
    backupNow,
    forget,
  } = useBackupDestination();
  const [actionError, setActionError] = useState<string | null>(null);

  async function runAction(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch (error) {
      console.error('Backup action failed:', error);
      setActionError(
        t('Something went wrong with your backup location. Please try again.'),
      );
    }
  }

  const lastBackupLabel = lastBackupAt
    ? format(new Date(lastBackupAt), `${dateFormat} HH:mm`)
    : null;
  const hasDestination = status !== 'unset';

  const warnings = lastResult?.ok ? lastResult.warnings : [];
  const failureReason =
    lastResult && lastResult.ok === false ? lastResult.reason : null;

  return (
    <Setting>
      <Text>
        <strong>
          <Trans>Backups</Trans>
        </strong>
        <p>
          <Trans>
            Choose where Actual should save automatic backups. A backup is saved
            shortly after you make changes, at most once every{' '}
            {{ BACKUP_FREQUENCY_MINS }} minutes, and Actual retains a maximum of{' '}
            {{ MAX_BACKUPS }} backups at any time.
          </Trans>
        </p>
        {!isSupported && (
          <p>
            <Trans>
              None of these options work in this browser yet. Use{' '}
              <strong>Export</strong> below to save a copy regularly, or keep
              your data safe with a sync server or the desktop app.{' '}
              <Link variant="external" to={BACKUP_DOCS_URL}>
                Learn more
              </Link>
            </Trans>
          </p>
        )}
        {status === 'ready' && (
          <p>
            <Trans>
              Backing up to <strong>{{ label } as TransObjectLiteral}</strong>.
            </Trans>
          </p>
        )}
        {status === 'needs-reconnect' && (
          <p>
            <Trans>
              Backups to <strong>{{ label } as TransObjectLiteral}</strong> are
              paused until you allow Actual to access it again. Your browser may
              ask you to do this once per session.
            </Trans>
          </p>
        )}
        {status === 'denied' && (
          <p>
            <Trans>
              Access to <strong>{{ label } as TransObjectLiteral}</strong> was
              denied. Choose a backup location again to continue backing up.
            </Trans>
          </p>
        )}
        {hasDestination && (
          <p>
            {lastBackupLabel ? (
              <Trans>Last backup: {{ lastBackupLabel }}</Trans>
            ) : (
              <Trans>No backup has been made yet.</Trans>
            )}
          </p>
        )}
      </Text>
      {hasDestination && encryptKeyId ? (
        <Text>
          <Trans>
            Even though encryption is enabled, backups saved to your backup
            location will not have any encryption.
          </Trans>
        </Text>
      ) : null}
      {hasDestination && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {status === 'ready' && (
            <ButtonWithLoading
              variant="primary"
              isLoading={isBusy}
              onPress={() => runAction(backupNow)}
            >
              <Trans>Back up now</Trans>
            </ButtonWithLoading>
          )}
          {status === 'needs-reconnect' && (
            <Button variant="primary" onPress={() => runAction(reconnect)}>
              <Trans>Resume backups</Trans>
            </Button>
          )}
          <Button onPress={() => runAction(forget)}>
            <Trans>Stop backing up</Trans>
          </Button>
        </View>
      )}
      {actionError && (
        <Block style={{ color: theme.errorText }}>{actionError}</Block>
      )}
      {failureReason === 'export-failed' && (
        <Block style={{ color: theme.errorText }}>
          <Trans>
            The last backup failed while exporting your budget. Please report
            this as a new issue on GitHub.
          </Trans>
        </Block>
      )}
      {failureReason === 'write-failed' && (
        <Block style={{ color: theme.errorText }}>
          <Trans>
            The last backup could not be written to your backup location. Check
            that it still exists and has free space.
          </Trans>
        </Block>
      )}
      {warnings.includes('exceeds-import-size-limit') && (
        <Block style={{ color: theme.warningText }}>
          <Trans>
            Your backups are larger than Actual can safely re-import. You may
            not be able to restore them.
          </Trans>
        </Block>
      )}
      <BackupDestinationList
        providers={providers}
        connectedKind={destination?.kind ?? null}
        connectedLabel={label}
        onConnect={kind => runAction(() => connect(kind))}
      />
    </Setting>
  );
}
