// @ts-strict-ignore
import React from 'react';
import { Trans } from 'react-i18next';

import { Block } from 'glamor/jsxstyle';

import { integerToCurrency } from 'loot-core/shared/util';

import { theme } from '../../../style';
import { AlignedText } from '../../common/AlignedText';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Change } from '../Change';

export const renderCashFlowCardViewDetailed = (
  totalIncome: number,
  totalExpenses: number,
  totalTransfers: number,
  isCardHovered: boolean,
) => {
  return (
    <View
      style={{
        paddingTop: 20,
        alignItems: 'flex-end',
        color: theme.pageText,
      }}
    >
      <AlignedText
        style={{ marginBottom: 5, minWidth: 160 }}
        left={
          <Block>
            <Trans>Income:</Trans>
          </Block>
        }
        right={
          <Text style={{ fontWeight: 600 }}>
            <PrivacyFilter>{integerToCurrency(totalIncome)}</PrivacyFilter>
          </Text>
        }
      />

      <AlignedText
        style={{ marginBottom: 5, minWidth: 160 }}
        left={
          <Block>
            <Trans>Expenses:</Trans>
          </Block>
        }
        right={
          <Text style={{ fontWeight: 600 }}>
            <PrivacyFilter>{integerToCurrency(totalExpenses)}</PrivacyFilter>
          </Text>
        }
      />

      <AlignedText
        style={{ marginBottom: 5, minWidth: 160 }}
        left={
          <Block>
            <Trans>Transfers:</Trans>
          </Block>
        }
        right={
          <Text style={{ fontWeight: 600 }}>
            <PrivacyFilter>{integerToCurrency(totalTransfers)}</PrivacyFilter>
          </Text>
        }
      />
      <Text style={{ fontWeight: 600 }}>
        <PrivacyFilter activationFilters={[!isCardHovered]}>
          <Change amount={totalIncome + totalExpenses + totalTransfers} />
        </PrivacyFilter>
      </Text>
    </View>
  );
};
