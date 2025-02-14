import React, { type ComponentType, type SVGProps } from 'react';

import { View } from '@actual-app/components/view';

import { SecondaryItem } from './SecondaryItem';

type SecondaryButtonItems = {
  title: string;
  Icon:
    | ComponentType<SVGProps<SVGElement>>
    | ComponentType<SVGProps<SVGSVGElement>>;
  onClick: () => void;
};

type SecondaryButtonsProps = {
  buttons: Array<SecondaryButtonItems>;
};

export function SecondaryButtons({ buttons }: SecondaryButtonsProps) {
  return (
    <View
      style={{
        flexShrink: 0,
        padding: '5px 0',
      }}
    >
      {buttons.map(item => (
        <SecondaryItem
          key={item.title}
          title={item.title}
          Icon={item.Icon}
          onClick={item.onClick}
        />
      ))}
    </View>
  );
}
