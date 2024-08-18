import React from 'react';

import { Text } from '../common/Text';
import { Checkbox } from '../forms';

import { Setting } from './UI';
import { useLocalPref } from '../../hooks/useLocalPref';

export function AccountGroupSettings() {
  const [accountGroupNested = false, setAccountGroupNested] = useLocalPref('ui.accountGroupNested');

  const [accountGroupDisplayName = false, setAccountGroupDisplayName] = useLocalPref('ui.accountGroupDisplayName');

  return (
    <Setting
      primaryAction={
            <>
            <Text style={{ display: 'flex' }}>
              <Checkbox
                id="settings-accountGroupNested"
                checked={accountGroupNested}
                onChange={e => setAccountGroupNested(e.currentTarget.checked)}
              />
            <label htmlFor="settings-accountGroupNested">
              Nested Accounts on Sidebar.
            </label>
            </Text>
          <div style={{ display: 'block', height: '5px', width: '1px' }} />
            <Text style={{ display: 'flex' }}>
              <Checkbox
                id="settings-accountGroupDisplayName"
                checked={accountGroupDisplayName}
                onChange={ e => setAccountGroupDisplayName(e.currentTarget.checked) }
              />
            <label htmlFor="settings-accountGroupDisplayName">
              Show Group name with Account name.
            </label>
            </Text>
          </>
      }
    >
      <Text>
        <strong>Account Group Style</strong> Change the way account grouping is
        displayed.
      </Text>
    </Setting>
  );
}
