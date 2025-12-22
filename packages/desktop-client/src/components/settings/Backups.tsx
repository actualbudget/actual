import React from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';

import { Setting } from './UI';

export function Backups() {
  const BACKUP_FREQUENCY_MINS = 15;
  const MAX_BACKUPS = 10;

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
