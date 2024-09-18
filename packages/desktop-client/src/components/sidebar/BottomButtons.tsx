// @ts-strict-ignore
import React, {
  type ComponentType,
  type SVGProps,
} from 'react';

import { View } from '../common/View';
import { SecondaryItem } from './SecondaryItem';

type BottomButtonItems = {
  title: string;
  Icon:
  | ComponentType<SVGProps<SVGElement>>
  | ComponentType<SVGProps<SVGSVGElement>>;
  onClick: () => void;
};

type BottomButtonsProps = {
  buttons: Array<BottomButtonItems>;
};

export function BottomButtons({
  buttons,
}: BottomButtonsProps) {

  return (
    <View
      style={{
        flexShrink: 0,
        padding: '5px 0',
      }}
    >
      {buttons.map((item) => (
        <SecondaryItem key={item.title} title={item.title} Icon={item.Icon} onClick={item.onClick} />
      ))}
    </View>
  );
}