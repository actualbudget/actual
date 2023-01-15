import React from 'react';

import { View, Text, Button } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

export default function BankSync({ prefs, savePrefs }) {
  const onEnableAccountSync = () => {
    savePrefs({ 'flags.syncAccount': true });
  };

  const onDisableAccountSync = () => {
    savePrefs({ 'flags.syncAccount': false });
  };

  return (
    <View style={{ marginBottom: 20, alignItems: 'flex-start' }}>
      <View>
        <Text style={{ fontWeight: 700, fontSize: 15 }}>
          Bank sync with Nordigen
        </Text>
        <View
          style={{
            color: colors.n2,
            marginTop: 10,
            maxWidth: 600,
            lineHeight: '1.4em'
          }}
        >
          {prefs['flags.syncAccount'] ? (
            <Text>
              <Text style={{ color: colors.g4, fontWeight: 600 }}>
                Sync is turned on.
              </Text>{' '}
              <Button
                style={{ marginTop: 10 }}
                onClick={() => onDisableAccountSync()}
              >
                Disable integration
              </Button>
            </Text>
          ) : (
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={{ lineHeight: '1.4em' }}>
                The integration give you possibility to sync your accounts with
                banks.
              </Text>
              <Button
                style={{ marginTop: 10 }}
                onClick={() => onEnableAccountSync()}
              >
                Enable integration
              </Button>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
