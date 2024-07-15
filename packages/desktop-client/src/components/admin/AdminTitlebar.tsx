import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

import * as Platform from 'loot-core/src/client/platform';
import { isDevelopmentEnvironment } from 'loot-core/src/shared/environment';
import { CSSProperties, theme } from '../../style';
import { useLocalPref } from '../../hooks/useLocalPref';
import { Button } from '../common/Button';
import { SvgViewHide, SvgViewShow } from '../../icons/v1';
import { View } from '../common/View';
import { useNavigate } from '../../hooks/useNavigate';
import { useSidebar } from '../sidebar/SidebarProvider';
import { useResponsive } from '../../ResponsiveProvider';
import { useServerURL } from '../ServerContext';
import { useGlobalPref } from '../../hooks/useGlobalPref';
import { SvgNavigationMenu } from '../../icons/v2';
import { ThemeSelector } from '../ThemeSelector';
import { LoggedInUser } from '../LoggedInUser';

type PrivacyButtonProps = {
  style?: CSSProperties;
};

function PrivacyButton({ style }: PrivacyButtonProps) {
  const [isPrivacyEnabled, setPrivacyEnabledPref] =
    useLocalPref('isPrivacyEnabled');

  const privacyIconStyle = { width: 15, height: 15 };

  return (
    <Button
      type="bare"
      aria-label={`${isPrivacyEnabled ? 'Disable' : 'Enable'} privacy mode`}
      onClick={() => setPrivacyEnabledPref(!isPrivacyEnabled)}
      style={style}
    >
      {isPrivacyEnabled ? (
        <SvgViewHide style={privacyIconStyle} />
      ) : (
        <SvgViewShow style={privacyIconStyle} />
      )}
    </Button>
  );
}

type TitlebarProps = {
  style?: CSSProperties;
};

export function AdminTitlebar({ style }: TitlebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebar = useSidebar();
  const { isNarrowWidth } = useResponsive();
  const serverURL = useServerURL();
  const [floatingSidebar] = useGlobalPref('floatingSidebar');

  return isNarrowWidth ? null : (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 15px',
        height: 36,
        pointerEvents: 'none',
        '& *': {
          pointerEvents: 'auto',
        },
        ...(!Platform.isBrowser &&
          Platform.OS === 'mac' &&
          floatingSidebar && { paddingLeft: 80 }),
        ...style,
      }}
    >
      {(floatingSidebar || sidebar.alwaysFloats) && (
        <Button
          type="bare"
          style={{ marginRight: 8 }}
          onPointerEnter={e => {
            if (e.pointerType === 'mouse') {
              sidebar.setHidden(false);
            }
          }}
          onPointerUp={e => {
            if (e.pointerType !== 'mouse') {
              sidebar.setHidden(!sidebar.hidden);
            }
          }}
        >
          <SvgNavigationMenu
            className="menu"
            style={{ width: 15, height: 15, color: theme.pageText, left: 0 }}
          />
        </Button>
      )}

      <View style={{ flex: 1 }} />
      {isDevelopmentEnvironment() && !Platform.isPlaywright && (
        <ThemeSelector style={{ marginLeft: 10 }} />
      )}
      <LoggedInUser style={{ marginLeft: 10 }} />
    </View>
  );
}
