import React from 'react';

import { useLocalPref } from '../../hooks/useLocalPref';
import { Text } from '../common/Text';
import { Checkbox } from '../forms';

import { Setting } from './UI';

export function AutocompleteSettings() {
  const [
    autocompleteCategoryMatchGroup = false,
    setAutocompleteCategoryMatchGroupPref,
  ] = useLocalPref('autocompleteCategoryMatchGroup');

  return (
    <Setting
      primaryAction={
        <Text style={{ display: 'flex' }}>
          <Checkbox
            id="settings-autocompleteCategoryMatchGroup"
            checked={!!autocompleteCategoryMatchGroup}
            onChange={e =>
              setAutocompleteCategoryMatchGroupPref(e.currentTarget.checked)
            }
          />
          <label htmlFor="settings-autocompleteCategoryMatchGroup">
            Category autocomplete search match on category group names
          </label>
        </Text>
      }
    >
      <Text>
        <strong>Autocomplete</strong> change the behavior of the autocomplete
        dropdowns.
      </Text>
    </Setting>
  );
}
