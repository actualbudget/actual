// @ts-strict-ignore
import React, {
  type ComponentType,
  type SVGProps,
} from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexShrink: 0,
        marginTop: 15,
        marginBottom: 9,
      }}
    >
      {buttons.map((item) => (
        <SecondaryItem title={item.title} Icon={item.Icon} onClick={item.onClick} />
      ))}
    </View>
  );
}