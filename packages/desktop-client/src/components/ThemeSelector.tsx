import React from 'react';

import { useActions } from '../hooks/useActions';
import MoonStars from '../icons/v2/MoonStars';
import Sun from '../icons/v2/Sun';
import { useResponsive } from '../ResponsiveProvider';
import { useTheme } from '../style';

import { Button, View } from './common';

export function ThemeSelector() {
  let theme = useTheme();
  let { saveGlobalPrefs } = useActions();

  let { isNarrowWidth } = useResponsive();

  // Don't display on mobile
  return isNarrowWidth ? null : (
    <View>
      <Button
        bare
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
