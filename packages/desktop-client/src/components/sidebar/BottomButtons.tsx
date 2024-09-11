// @ts-strict-ignore
import React, { useState } from 'react';
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

  return (
    <View style={{flexShrink: 0}}>
      <SecondaryItem
        style={{
          marginTop: 15,
          marginBottom: 9,
        }}
        onClick={onAddAccount}
        Icon={SvgAdd}
        title={t('Add account')}
      />
    </View>
  );
}