// @ts-strict-ignore
import React, { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { useTranslation } from 'react-i18next';

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
  collapseSpeed?: Number;
  buttons: Array<ActionButtonItems>;
};

export function ActionButtons({
  collapseSpeed = 0.4,
  buttons
}: ActionButtonsProps) {
  const { t } = useTranslation();

  const [expanded, setExpandedActionButtonsPref] = useState(false);
  const initLengthRef = React.useRef(0);
  const divRef = React.useRef(null);

  const onToggle = () => {
    setExpandedActionButtonsPref(!expanded);
  };

  useEffect(() => {
    const expndDiv = divRef.current;
    if (!initLengthRef.current) {
      const height = divRef.current.style.height;
      initLengthRef.current = height;
    }
    if (!expanded && initLengthRef.current) {
      expndDiv.style.height = initLengthRef.current;
    } else {
      expndDiv.style.height = expndDiv.scrollHeight + "px";
    }
  });

  return (
    <View style={{ padding: '5px 0', flexShrink: 0 }}>
      <View
        ref={divRef}
        style={{ overflow: 'hidden', transition: 'height ' + collapseSpeed + 's ease-in-out' }}
      > 
        {buttons.map(item =>
          <Item
            key={item.title}
            title={item.title}
            Icon={item.Icon}
            to={item.to}
            style={(item.hidable && !expanded && { display: 'none' })}
          />
        )}
      </View>
      <SecondaryItem
        title={expanded ? t('Less') : t('More')}
        Icon={expanded ? SvgCheveronUp : SvgCheveronDown}
        onClick={onToggle}
        style={{ ...styles.verySmallText }}
      />
    </View>
  );
}
