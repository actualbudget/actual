import React from 'react';
import { connect, useSelector, shallowEqual } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';
import { saveGlobalPrefs } from 'loot-core/src/client/actions';

import { MoonStars, Sun } from '../icons/v2';
import { useResponsive } from '../ResponsiveProvider';

import { Button, View } from './common';

export function ThemeSelector() {
  let { isNarrowWidth } = useResponsive();
  let theme = useSelector(state => state.prefs.global.theme, shallowEqual);

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
        {theme === 'light' ? (
          <MoonStars style={{ width: 13, height: 13, color: 'inherit' }} />
        ) : (
          <Sun style={{ width: 13, height: 13, color: 'inherit' }} />
        )}{' '}
      </Button>
    </View>
  );
}

/* eslint-disable import/no-unused-modules */
export default connect(null, actions)(ThemeSelector);
