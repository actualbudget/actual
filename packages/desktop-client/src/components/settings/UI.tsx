import React, { useState, type ReactNode } from 'react';
import { Trans } from 'react-i18next';
import { useLocation } from 'react-router';

import { type CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { tokens } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { Link } from '@desktop-client/components/common/Link';

type SettingProps = {
  primaryAction?: ReactNode;
  style?: CSSProperties;
  children: ReactNode;
};

export const Setting = ({ primaryAction, style, children }: SettingProps) => {
  return (
    <View
      className={css([
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
      ])}
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
      className={css({
        [`@media (min-width: ${tokens.breakpoint_small})`]: {
          width: 'auto',
        },
      })}
      innerRef={el => {
        if (el && location.hash === '#advanced') {
          el.scrollIntoView(true);
        }
      }}
    >
      <View style={{ fontSize: 20, fontWeight: 500, flexShrink: 0 }}>
        <Trans>Advanced Settings</Trans>
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
      <Trans>Show advanced settings</Trans>
    </Link>
  );
};

export function Column({
  title,
  children,
  style,
}: {
  title: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <View
      style={{
        alignItems: 'flex-start',
        flexGrow: 1,
        gap: '0.5em',
        width: '100%',
        ...style,
      }}
    >
      <Text style={{ fontWeight: 500 }}>{title}</Text>
      <View style={{ alignItems: 'flex-start', gap: '1em' }}>{children}</View>
    </View>
  );
}
