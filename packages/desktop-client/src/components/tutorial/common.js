import React, { useState } from 'react';

import { View, AnchorLink } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import AnimateIn from './AnimateIn';

export function Title({ children }) {
  return (
    <View style={{ fontSize: 25, fontWeight: 700, marginBottom: 15 }}>
      {children}
    </View>
  );
}

export function Standalone({ children, width = 320, skipAnimation = false }) {
  return (
    <AnimateIn>
      {animating => (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            transform: `translateY(${skipAnimation || animating ? 0 : 10}px)`,
            opacity: skipAnimation || animating ? 1 : 0,
            transition: 'opacity .2s, transform .2s',
            padding: 20,
            margin: 40,
            backgroundColor: 'white',
            width: width,
            boxShadow: '0 2px 8px rgba(0, 0, 0, .3)',
            borderRadius: 4,
            zIndex: 1000,
            fontSize: 14
          }}
        >
          {children}
        </View>
      )}
    </AnimateIn>
  );
}

export const ExternalLink = React.forwardRef((props, ref) => {
  let { href, ...linkProps } = props;
  return (
    <AnchorLink
      to="/"
      {...linkProps}
      style={{ fontSize: 14, color: colors.p4 }}
      onClick={e => {
        e.preventDefault();
        window.Actual.openURLInBrowser(href);
      }}
    />
  );
});

export function useMinimized() {
  let [minimized, setMinimized] = useState(false);

  function toggleContent() {
    setMinimized(!minimized);
  }

  return [minimized, toggleContent];
}
