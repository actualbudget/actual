import React from 'react';

import { useActions } from '../hooks/useActions';
import MoonStars from '../icons/v2/MoonStars';
import Sun from '../icons/v2/Sun';
import System from '../icons/v2/System';
import { useResponsive } from '../ResponsiveProvider';
import { useTheme } from '../style';

import Button from './common/Button';

export function ThemeSelector() {
  let theme = useTheme();
  let { saveGlobalPrefs } = useActions();

  let { isNarrowWidth } = useResponsive();

  const themeArray = [
    { key: 'light', icon: Sun },
    { key: 'dark', icon: MoonStars },
    { key: 'auto', icon: System },
  ] as const;
  const nextTheme =
    themeArray[
      (themeArray.findIndex(themeEntry => themeEntry.key === theme) + 1) %
        themeArray.length
    ];

  const name = nextTheme.key;
  const Icon = nextTheme.icon;

  return isNarrowWidth ? null : (
    <Button
      type="bare"
      onClick={() => {
        saveGlobalPrefs({
          theme: name,
        });
      }}
    >
      <Icon style={{ width: 13, height: 13, color: 'inherit' }} />
    </Button>
  );
}
