// @ts-strict-ignore
import React from 'react';

import { View } from '../../common/View';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Change } from '../Change';

export const renderCashFlowCardViewCondensed = (
  isCardHovered: boolean,
  income: number,
  expenses: number,
) => {
  return (
    <View style={{ textAlign: 'right' }}>
      <PrivacyFilter activationFilters={[!isCardHovered]}>
        <Change amount={income - expenses} />
      </PrivacyFilter>
    </View>
  );
};
