import React from 'react';
import { connect, useSelector } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';
import { saveGlobalPrefs } from 'loot-core/src/client/actions';

import Bug from '../icons/v1/Bug';
import { useResponsive } from '../ResponsiveProvider';

import { Button, Text, View } from './common';

export function ThemeSelector() {
  let { isNarrowWidth } = useResponsive();
  let theme = useSelector(state => state.prefs.global.theme);

  // Don't display on mobile
  return isNarrowWidth ? null : (
    <View>
      <Button
        bare
        // Switch theme value then update the global pref
        // which should trigger a theme update in <App> <ThemeStyle>
        onClick={() => {
          theme = theme === 'dark' ? 'light' : 'dark';
          console.log(theme);
          saveGlobalPrefs({
            theme: theme,
          });
        }}
      >
        <Bug style={{ width: 13, height: 13, color: 'inherit' }} />{' '}
        <Text>{theme}</Text>
      </Button>
    </View>
  );
}

export default connect(null, actions)(ThemeSelector);
