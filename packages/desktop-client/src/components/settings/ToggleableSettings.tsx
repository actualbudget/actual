import React from 'react';

import { useLocalPref } from '../../hooks/useLocalPref';
import { Text } from '../common/Text';
import { Checkbox } from '../forms';

import { Setting } from './UI';

export function ToggleableSettings() {
  const [autoCompleteCategories = false, setAutoCompleteCategoriesPref] =
    useLocalPref('autoCompleteCategories');

  console.log(autoCompleteCategories);
  return (
    <Setting
      primaryAction={
        <Text style={{ display: 'flex' }}>
          <Checkbox
            id="settings-autoCompleteCategories"
            checked={!!autoCompleteCategories}
            onChange={e =>
              setAutoCompleteCategoriesPref(e.currentTarget.checked)
            }
          />
          <label htmlFor="settings-autoCompleteCategories">
            Include category names in autocomplete Search
          </label>
        </Text>
      }
    >
      <Text>
        <strong>Toggleable Preferences</strong> customize your experience by
        enabling or disabling various features. Adjust settings below to suit
        your preferences.
      </Text>
    </Setting>
  );
}
