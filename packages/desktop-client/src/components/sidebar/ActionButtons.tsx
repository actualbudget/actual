// @ts-strict-ignore
import React, { type ComponentType, type SVGProps, } from 'react';
import { useTranslation } from 'react-i18next';

import { useLocalPref } from '../../hooks/useLocalPref';
import { SvgCheveronDown, SvgCheveronUp } from '../../icons/v1';
import { styles } from '../../style';

import { View } from '../common/View';
import { Item } from './Item';
import { SecondaryItem } from './SecondaryItem';

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

export function ActionButtons({ buttons }: ActionButtonsProps) {
  const { t } = useTranslation();

  const [expanded, setExpandedActionButtonsPref] = useLocalPref(
    'ui.expandActionButtons',
  );
  const onToggle = () => {
    setExpandedActionButtonsPref(!expanded);
  };

  return (
    <View style={{ padding: '5px 0', flexShrink: 0 }}>
      {buttons.map((item) => (
        (item.hidable ?
          (expanded && <Item key={item.title} title={item.title} Icon={item.Icon} to={item.to} />) :
          <Item key={item.title} title={item.title} Icon={item.Icon} to={item.to} />
        )
      ))}
      <SecondaryItem
        title={expanded ? t('less') : t('more')}
        Icon={expanded ? SvgCheveronUp : SvgCheveronDown}
        onClick={onToggle}
        style={{ ...styles.verySmallText }}
      />
    </View>
  );
}
