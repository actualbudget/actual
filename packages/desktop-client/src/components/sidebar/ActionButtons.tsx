// @ts-strict-ignore
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '../common/View';
import { Item } from './Item';
import { Tools } from './Tools';

import { SvgReports, SvgWallet } from '../../icons/v1';

type ActionButtonsProps = {
};

export function ActionButtons({
}: ActionButtonsProps) {
  const { t } = useTranslation();

  return (
    <View style={{ padding: '10px 0', flexShrink: 0}}>
      <Item title={t('Budget')} Icon={SvgWallet} to="/budget"/>
      <Item title={t('Reports')} Icon={SvgReports} to="/reports"/>
      <Tools />
    </View>
  );
}