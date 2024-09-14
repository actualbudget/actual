// @ts-strict-ignore
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '../common/View';
import { Item } from './Item';
import { SecondaryItem } from './SecondaryItem';

import {
  SvgCheveronDown,
  SvgCheveronUp,
  SvgStoreFront,
  SvgTuning,
  SvgReports,
  SvgWallet,
} from '../../icons/v1';
import { SvgCalendar } from '../../icons/v2';

type ActionButtonsProps = {
};

export function ActionButtons({
}: ActionButtonsProps) {
  const { t } = useTranslation();
  const [isOpen, setOpen] = useState(false);
  const onToggle = useCallback(() => setOpen(open => !open), []);

  const actionButtons = [
    { title: t('Budget'), Icon: SvgWallet, to: "/budget" },
    { title: t('Reports'), Icon: SvgReports, to: "/reports" },
    { title: t('Schedules'), Icon: SvgCalendar, to: "/schedules", secondary: true },
    { title: t('Payees'), Icon: SvgStoreFront, to: "/payees", secondary: true },
    { title: t('Rules'), Icon: SvgTuning, to: "/rules", secondary: true },
  ];

  return (
    <View style={{ padding: '10px 0', flexShrink: 0}}>
      {actionButtons.map((item) => (
        (item.secondary ?
          (isOpen && <Item title={item.title} Icon={item.Icon} to={item.to} />) :
          <Item title={item.title} Icon={item.Icon} to={item.to} />
        )
      ))}
      <SecondaryItem
        title={t('')}
        Icon={isOpen ? SvgCheveronUp : SvgCheveronDown}
        onClick={onToggle}
      />
    </View>
  );
}