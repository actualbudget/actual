import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router';

import CheveronDown from '../../icons/v1/CheveronDown';
import CheveronRight from '../../icons/v1/CheveronRight';
import Cog from '../../icons/v1/Cog';
import StoreFrontIcon from '../../icons/v1/StoreFront';
import TuningIcon from '../../icons/v1/Tuning';
import View from '../common/View';

import { Item } from './Item';
import { SecondaryItem } from './SecondaryItem';

export function Tools() {
  let [isOpen, setOpen] = useState(false);
  let onToggle = useCallback(() => setOpen(open => !open), []);
  let location = useLocation();

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
        Icon={isOpen ? CheveronDown : CheveronRight}
        onClick={onToggle}
        style={{ marginBottom: isOpen ? 8 : 0 }}
        forceActive={!isOpen && isActive}
      />
      {isOpen && (
        <>
          <SecondaryItem
            title="Payees"
            Icon={StoreFrontIcon}
            to="/payees"
            indent={15}
          />
          <SecondaryItem
            title="Rules"
            Icon={TuningIcon}
            to="/rules"
            indent={15}
          />
          <SecondaryItem
            title="Settings"
            Icon={Cog}
            to="/settings"
            indent={15}
          />
        </>
      )}
    </View>
  );
}
