// @ts-strict-ignore
import React, {
  useState,
  useCallback,
  type ComponentType,
  type SVGProps,
} from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '../common/View';
import { Item } from './Item';
import { SecondaryItem } from './SecondaryItem';

import {
  SvgCheveronDown,
  SvgCheveronUp,
} from '../../icons/v1';
import { SvgCalendar } from '../../icons/v2';

type ActionButtonItems = {
  title: string;
  Icon:
  | ComponentType<SVGProps<SVGElement>>
  | ComponentType<SVGProps<SVGSVGElement>>;
  to: string;
  hidable?: boolean;
};

type ActionButtonsProps = {
  buttons: Array<ActionButtonItems>;
};

export function ActionButtons({
  buttons,
}: ActionButtonsProps) {
  const { t } = useTranslation();
  const [isOpen, setOpen] = useState(false);
  const onToggle = useCallback(() => setOpen(open => !open), []);

  return (
    <View style={{ padding: '10px 0', flexShrink: 0}}>
      {buttons.map((item) => (
        (item.hidable ?
          (isOpen && <Item key={item.title} title={item.title} Icon={item.Icon} to={item.to} />) :
          <Item key={item.title} title={item.title} Icon={item.Icon} to={item.to} />
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