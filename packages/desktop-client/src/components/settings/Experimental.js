import React from 'react';

import { Link, Text, View } from 'loot-design/src/components/common';
import { Checkbox } from 'loot-design/src/components/forms';
import { colors } from 'loot-design/src/style';

import { Setting } from './UI';

export default function ExperimentalFeatures({ prefs, savePrefs }) {
  let [expanded, setExpanded] = React.useState(false);
  let flags = Object.fromEntries(
    Object.entries(prefs)
      .filter(([key]) => key.startsWith('flags.'))
      .map(([key, value]) => [key.replace('flags.', ''), value])
  );
  let disabled = prefs.budgetType === 'report' && flags.reportBudget;
  return (
    <Setting
      primaryAction={
        expanded ? (
          <View style={{ gap: '1em' }}>
            <label
              style={{
                display: 'flex',
                color: disabled ? colors.n5 : 'inherit'
              }}
            >
              <Checkbox
                id="report-budget-flag"
                checked={flags.reportBudget}
                onChange={() => {
                  savePrefs({ 'flags.reportBudget': !flags.reportBudget });
                }}
                disabled={disabled}
              />{' '}
              <View>
                Enable budget mode toggle
                {disabled && (
                  <Text style={{ color: colors.r3, fontWeight: 500 }}>
                    Switch to a rollover budget before turning off this feature
                  </Text>
                )}
              </View>
            </label>

            <label style={{ display: 'flex' }}>
              <Checkbox
                id="report-budget-flag"
                checked={flags.syncAccount}
                onChange={() => {
                  savePrefs({ 'flags.syncAccount': !flags.syncAccount });
                }}
              />{' '}
              <View>Enable account syncing</View>
            </label>
          </View>
        ) : (
          <Link
            onClick={() => setExpanded(true)}
            style={{
              flexShrink: 0,
              alignSelf: 'flex-start',
              color: colors.p4
            }}
          >
            I understand the risks, show experimental features
          </Link>
        )
      }
    >
      <Text>
        <strong>Experimental features.</strong> These features are not fully
        tested and may not work as expected. THEY MAY CAUSE IRRECOVERABLE DATA
        LOSS. They may do nothing at all. Only enable them if you know what you
        are doing.
      </Text>
    </Setting>
  );
}
