import React, { useState } from 'react';

import { View, Link } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import { isMobile } from '../util';

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

export function ButtonSetting({ button, children }) {
  return (
    <View
      style={{
        backgroundColor: colors.n9,
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
        padding: 15,
        borderRadius: 4,
        border: '1px solid ' + colors.n8,
        ...(isMobile() && { width: '100%' })
      }}
    >
      <View
        style={{ marginBottom: 10, maxWidth: 500, lineHeight: 1.5, gap: 10 }}
      >
        {children}
      </View>
      {button}
    </View>
  );
}

export function AdvancedToggle({ children }) {
  let [expanded, setExpanded] = useState(false);
  return expanded ? (
    <Section
      title="Advanced Settings"
      style={{ marginBottom: 25, ...(isMobile() && { width: '100%' }) }}
    >
      {children}
    </Section>
  ) : (
    <Link
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
