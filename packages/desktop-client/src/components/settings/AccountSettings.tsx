import { useSelector } from 'react-redux';

import { useActions } from '../../hooks/useActions';
import { Text } from '../common/Text';
import { Checkbox } from '../forms';

import { Setting } from './UI';

export function AccountSettings() {
  const { savePrefs } = useActions();
  const categorySuggestionsGroupNames = useSelector(
    state => state.prefs.local['ui.categorySuggestionsGroupNames'],
  );

  return (
    <Setting
      primaryAction={
        <Text style={{ display: 'flex' }}>
          <Checkbox
            id="settings-categorySuggestionsGroupNames"
            checked={categorySuggestionsGroupNames}
            onChange={e =>
              savePrefs({
                'ui.categorySuggestionsGroupNames': e.currentTarget.checked,
              })
            }
          />
          <label htmlFor="settings-categorySuggestionsGroupNames">
            Include your group names in category suggestions
          </label>
        </Text>
      }
    >
      <Text>
        <strong>Accounts</strong> are where your transations are displayed, with
        the option to organize all your records into categories.
      </Text>
    </Setting>
  );
}
