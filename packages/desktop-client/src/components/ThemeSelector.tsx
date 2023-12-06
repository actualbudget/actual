import React from 'react';

import { useActions } from '../hooks/useActions';
import MoonStars from '../icons/v2/MoonStars';
import Sun from '../icons/v2/Sun';
import { useResponsive } from '../ResponsiveProvider';
import { type CSSProperties, useTheme } from '../style';

import Button from './common/Button';

type ThemeSelectorProps = {
  style?: CSSProperties;
};

export function ThemeSelector({ style }: ThemeSelectorProps) {
  const theme = useTheme();
  const { saveGlobalPrefs } = useActions();

  const { isNarrowWidth } = useResponsive();

  return isNarrowWidth ? null : (
    <Button
      type="bare"
      aria-label="Switch theme"
      onClick={() => {
        saveGlobalPrefs({
          theme: theme === 'dark' ? 'light' : 'dark',
        });
      }}
      style={style}
    >
      {theme === 'light' ? (
        <MoonStars style={{ width: 15, height: 15, color: 'inherit' }} />
      ) : (
        <Sun style={{ width: 15, height: 15, color: 'inherit' }} />
      )}
    </Button>
  );
}
