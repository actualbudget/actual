import React, { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { css, media } from 'glamor';

import { type CSSProperties, theme } from '../../style';
import { tokens } from '../../tokens';
import { Link } from '../common/Link';
import { View } from '../common/View';

type SettingProps = {
  primaryAction?: ReactNode;
  style?: CSSProperties;
  children: ReactNode;
};

export const Setting = ({ primaryAction, style, children }: SettingProps) => {
  return (
    <View
      className={`${css([
        {
          backgroundColor: theme.pillBackground,
          alignSelf: 'flex-start',
          alignItems: 'flex-start',
          padding: 15,
          borderRadius: 4,
          border: '1px solid ' + theme.pillBorderDark,
          width: '100%',
        },
        style,
      ])}`}
    >
      <View
        style={{
          marginBottom: primaryAction ? 10 : 0,
          lineHeight: 1.5,
          gap: 10,
        }}
      >
        {children}
      </View>
      {primaryAction || null}
    </View>
  );
};

type AdvancedToggleProps = {
  children: ReactNode;
};

export const AdvancedToggle = ({ children }: AdvancedToggleProps) => {
  const location = useLocation();
  const [expanded, setExpanded] = useState(location.hash === '#advanced');

  return expanded ? (
    <View
      id="advanced"
      style={{
        gap: 20,
        alignItems: 'flex-start',
        marginBottom: 25,
        width: '100%',
      }}
      className={`${media(`(min-width: ${tokens.breakpoint_small})`, {
        width: 'auto',
      })}`}
      innerRef={el => {
        if (el && location.hash === '#advanced') {
          el.scrollIntoView(true);
        }
      }}
    >
      <View style={{ fontSize: 20, fontWeight: 500, flexShrink: 0 }}>
        Advanced Settings
      </View>
      {children}
    </View>
  ) : (
    <Link
      variant="text"
      onClick={() => setExpanded(true)}
      data-testid="advanced-settings"
      style={{
        flexShrink: 0,
        alignSelf: 'flex-start',
        color: theme.pageTextPositive,
        marginBottom: 25,
      }}
    >
      Show advanced settings
    </Link>
  );
};
