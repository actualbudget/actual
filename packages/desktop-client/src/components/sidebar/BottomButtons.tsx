// @ts-strict-ignore
import React from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '../common/View';
import { SecondaryItem } from './SecondaryItem';

import { SvgAdd } from '../../icons/v1';

type BottomButtonsProps = {
  onAddAccount: () => void;
};

export function BottomButtons({
  onAddAccount,
}: BottomButtonsProps) {
  const { t } = useTranslation();

  const bottomButtons = [
    { title: t('Add account'), Icon: SvgAdd, onClick: onAddAccount },
  ];

  return (
    <View
      style={{
        flexShrink: 0,
        marginTop: 15,
        marginBottom: 9,
      }}
    >
      {bottomButtons.map((item) => (
        <SecondaryItem title={item.title} Icon={item.Icon} onClick={item.onClick} />
      ))}
    </View>
  );
}