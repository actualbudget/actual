import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import {
  SvgCheveronDown,
  SvgCheveronUp,
  SvgStoreFront,
  SvgTuning,
} from '../../icons/v1';
import { SvgCalendar } from '../../icons/v2';
import { View } from '../common/View';

import { Item } from './Item';
import { SecondaryItem } from './SecondaryItem';

export function Tools() {
  const { t } = useTranslation();
  const [isOpen, setOpen] = useState(false);
  const onToggle = useCallback(() => setOpen(open => !open), []);
  const location = useLocation();

  const isActive = ['/payees', '/rules', '/tools'].some(route =>
    location.pathname.startsWith(route),
  );

  useEffect(() => {
    if (isActive) {
      setOpen(true);
    }
  }, [location.pathname]);

  return (
    <View >
      {isOpen && (
        <>
          <Item
            title={t('Schedules')}
            Icon={SvgCalendar}
            to="/schedules"
          />
          <Item
            title={t('Payees')}
            Icon={SvgStoreFront}
            to="/payees"
          />
          <Item
            title={t('Rules')}
            Icon={SvgTuning}
            to="/rules"
          />
        </>
      )}
      <SecondaryItem
        title={t('')}
        Icon={isOpen ? SvgCheveronUp : SvgCheveronDown}
        onClick={onToggle}
      />
    </View>
  );
}
