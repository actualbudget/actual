import React from 'react';
import { Trans } from 'react-i18next';

import { Text } from '../common/Text';

import { Setting } from './UI';

export function Backups() {
  return (
    <Setting>
      <Text>
        <strong>
          <Trans>Backups</Trans>
        </strong>
        <p>
          <Trans>
            Backups are created every 15 minutes and stored in{' '}
            <strong>
              <i>Actual’s data directory</i>
            </strong>
            . The system retains a maximum of 10 backups at any time.
          </Trans>
        </p>
      </Text>
    </Setting>
  );
}
