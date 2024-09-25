import React from 'react';

import { Text } from '../common/Text';

import { Setting } from './UI';

export function Backups() {
  return (
    <Setting>
      <Text>
        <strong>Backups</strong>
        <p>
          Backups are created every 15 minutes and stored in{' '}
          <strong>
            <i>Actual’s data directory</i>
          </strong>
          . The system retains a maximum of 10 backups at any time.
        </p>
      </Text>
    </Setting>
  );
}
