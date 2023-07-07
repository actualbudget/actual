import React from 'react';
import { connect } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';

import MoonStars from '../icons/v2/MoonStars';
import Sun from '../icons/v2/Sun';
import { useResponsive } from '../ResponsiveProvider';
import { colorsm } from '../style';

import { Button, View } from './common';

export function ThemeSelector({ globalPrefs, saveGlobalPrefs }) {
  let { isNarrowWidth } = useResponsive();

  // Don't display on mobile
  return isNarrowWidth ? null : (
    <View>
      <Button
        bare
        // Switch theme value then update the global pref
        // which triggers a theme update in <App> <ThemeStyle>
        onClick={() => {
          globalPrefs.theme = globalPrefs.theme === 'dark' ? 'light' : 'dark';
          saveGlobalPrefs({
            theme: globalPrefs.theme,
          });
        }}
        style={{
          color: colorsm.pageTextSubdued,
          ':hover': { color: colorsm.pageText },
        }}
      >
        {globalPrefs.theme === 'light' ? (
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
