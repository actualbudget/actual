import React, { useState } from 'react';
import { useLocation } from 'react-router';

import { css, media } from 'glamor';

import { View, Link } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';
import tokens from 'loot-design/src/tokens';

export function Section({ title, children, style, titleProps, ...props }) {
  return (
    <View style={[{ gap: 20, alignItems: 'flex-start' }, style]} {...props}>
      <View
        style={[
          { fontSize: 20, fontWeight: 500, flexShrink: 0 },
          titleProps && titleProps.style
        ]}
        {...titleProps}
      >
        {title}
      </View>
      {children}
    </View>
  );
}

export function Setting({ primaryAction, children }) {
  return (
    <View
      {...css(
        {
          backgroundColor: colors.n9,
          alignSelf: 'flex-start',
          alignItems: 'flex-start',
          padding: 15,
          borderRadius: 4,
          border: '1px solid ' + colors.n8,
          width: '100%'
        },
        media(`(min-width: ${tokens.breakpoint_medium})`, {
          width: 'auto'
        })
      )}
    >
      <View
        style={{
          marginBottom: primaryAction ? 10 : 0,
          maxWidth: 500,
          lineHeight: 1.5,
          gap: 10
        }}
      >
        {children}
      </View>
      {primaryAction || null}
    </View>
  );
}

export function AdvancedToggle({ children }) {
  let location = useLocation();
  let [expanded, setExpanded] = useState(location.hash === '#advanced');

  return expanded ? (
    <Section
      innerRef={el => {
        if (el && location.hash === '#advanced') {
          el.scrollIntoView(true);
        }
      }}
      id="advanced"
      title="Advanced Settings"
      {...css(
        {
          marginBottom: 25,
          width: '100%'
        },
        media(`(min-width: ${tokens.breakpoint_medium})`, {
          width: 'auto'
        })
      )}
    >
      {children}
    </Section>
  ) : (
    <Link
      id="advanced"
      onClick={() => setExpanded(true)}
      style={{
        flexShrink: 0,
        alignSelf: 'flex-start',
        color: colors.p4,
        marginBottom: 25
      }}
    >
      Show advanced settings
    </Link>
  );
}
