import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import {
  SvgCheveronDown,
  SvgCheveronRight,
  SvgCog,
  SvgStoreFront,
  SvgTuning,
} from '../../icons/v1';
import { View } from '../common/View';

import { Item } from './Item';
import { SecondaryItem } from './SecondaryItem';

export function Tools() {
  const [isOpen, setOpen] = useState(false);
  const onToggle = useCallback(() => setOpen(open => !open), []);
  const location = useLocation();

  const isActive = ['/payees', '/rules', '/settings', '/tools'].some(route =>
    location.pathname.startsWith(route),
  );

  useEffect(() => {
    if (isActive) {
      setOpen(true);
    }
  }, [location.pathname]);

  return (
    <View style={{ flexShrink: 0 }}>
      <Item
        title="More"
        Icon={isOpen ? SvgCheveronDown : SvgCheveronRight}
        onClick={onToggle}
        style={{ marginBottom: isOpen ? 8 : 0 }}
        forceActive={!isOpen && isActive}
      />
      {isOpen && (
        <>
          <SecondaryItem
            title="Payees"
            Icon={SvgStoreFront}
            to="/payees"
            indent={15}
          />
          <SecondaryItem
            title="Rules"
            Icon={SvgTuning}
            to="/rules"
            indent={15}
          />
          <SecondaryItem
            title="Settings"
            Icon={SvgCog}
            to="/settings"
            indent={15}
          />
        </>
      )}
    </View>
  );
}
