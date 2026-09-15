import React from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

/**
 * Shown when the budget is not writing to the message log at all, which happens
 * when the feature flag is turned on after the budget was opened: the recording
 * mode is chosen at load time.
 */
export function ChangeLogNotice() {
  return (
    <View
      style={{
        backgroundColor: theme.warningBackground,
        color: theme.warningText,
        borderRadius: 4,
        padding: '8px 10px',
        marginBottom: 12,
        flexShrink: 0,
      }}
    >
      <Text>
        <Trans>
          Change history is not being recorded for this budget yet. Close and
          reopen it to start recording; changes made before that are not
          available.
        </Trans>
      </Text>
    </View>
  );
}
