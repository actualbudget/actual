import React, { type ReactNode, useState } from 'react';
import { useLocation } from 'react-router';

import { css, media } from 'glamor';
import type { CSSProperties } from 'glamor';

import { colors } from '../../style';
import tokens from '../../tokens';
import { View, LinkButton } from '../common';

type SettingProps = {
  primaryAction: ReactNode;
  style?: CSSProperties;
  children: ReactNode;
};

export const Setting = ({ primaryAction, style, children }: SettingProps) => {
  return (
    <View
      {...css([
        {
          backgroundColor: colors.n9,
          alignSelf: 'flex-start',
          alignItems: 'flex-start',
          padding: 15,
          borderRadius: 4,
          border: '1px solid ' + colors.n8,
          width: '100%',
        },
        style,
      ])}
    >
      <View
        style={{
          marginBottom: primaryAction ? 10 : 0,
          maxWidth: 500,
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
  let location = useLocation();
  let [expanded, setExpanded] = useState(location.hash === '#advanced');

  return expanded ? (
    <View
      id="advanced"
      style={[
        {
          gap: 20,
          alignItems: 'flex-start',
          marginBottom: 25,
          width: '100%',
        },
        media(`(min-width: ${tokens.breakpoint_small})`, {
          width: 'auto',
        }),
      ]}
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
    <LinkButton
      id="advanced"
      onClick={() => setExpanded(true)}
      style={{
        flexShrink: 0,
        alignSelf: 'flex-start',
        color: colors.p4,
        marginBottom: 25,
      }}
    >
      Show advanced settings
    </LinkButton>
  );
};
