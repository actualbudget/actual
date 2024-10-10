import React, {
  useEffect,
  useRef,
  type ComponentType,
  type SVGProps,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { useLocalPref } from '../../hooks/useLocalPref';
import { SvgCheveronDown, SvgCheveronUp } from '../../icons/v1';
import { styles } from '../../style';
import { View } from '../common/View';

import { Item } from './Item';
import { SecondaryItem } from './SecondaryItem';

type PrimaryButtonItems = {
  title: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  to: string;
  hidable?: boolean;
};

type PrimaryButtonsProps = {
  collapseSpeed?: number;
  buttons: Array<PrimaryButtonItems>;
};

export function PrimaryButtons({
  collapseSpeed = 0.15,
  buttons,
}: PrimaryButtonsProps) {
  const { t } = useTranslation();
  const divRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [expanded, setExpandedActionButtonsPref] = useLocalPref(
    'ui.expandPrimaryButtons',
  );

  const onToggle = () => {
    setExpandedActionButtonsPref(!expanded);
  };

  useEffect(() => {
    if (divRef?.current && itemsRef?.current) {
      divRef.current.style.height = itemsRef.current.scrollHeight + 'px';
    }
  }, [expanded, location.pathname]);

  return (
    <View style={{ padding: '5px 0', flexShrink: 0 }}>
      <View
        ref={divRef}
        style={{
          overflow: 'hidden',
          transition: 'height ' + collapseSpeed + 's ease-in-out',
        }}
        aria-expanded={expanded}
      >
        <View
          ref={itemsRef}
          style={{
            flexShrink: 0,
            height: 'auto',
          }}
        >
          {buttons.map(item => {
            const isActive = location.pathname.startsWith(item.to);
            const shouldHide = item.hidable && !expanded && !isActive;
            return (
              <Item
                key={item.title}
                title={item.title}
                Icon={item.Icon}
                to={item.to}
                style={{
                  ...(shouldHide && { display: 'none' }),
                }}
              />
            );
          })}
        </View>
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
