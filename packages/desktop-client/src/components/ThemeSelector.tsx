import React from 'react';
import { useSelector } from 'react-redux';

import { useActions } from '../hooks/useActions';
import MoonStars from '../icons/v2/MoonStars';
import Sun from '../icons/v2/Sun';
import { useResponsive } from '../ResponsiveProvider';

import { Button, View } from './common';

export function ThemeSelector() {
  let theme = useSelector(state => state.prefs?.global?.theme ?? 'light');
  let { saveGlobalPrefs } = useActions();

  let { isNarrowWidth } = useResponsive();

  // Don't display on mobile
  return isNarrowWidth ? null : (
    <View>
      <Button
        bare
        // Switch theme value then update the global pref
        // which triggers a theme update in <App> <ThemeStyle>
        onClick={() => {
          saveGlobalPrefs({
            theme: theme === 'dark' ? 'light' : 'dark',
          });
        }}
      >
        {theme === 'light' ? (
          <MoonStars style={{ width: 13, height: 13, color: 'inherit' }} />
        ) : (
          <Sun style={{ width: 13, height: 13, color: 'inherit' }} />
        )}
      </Button>
    </View>
  );
}
