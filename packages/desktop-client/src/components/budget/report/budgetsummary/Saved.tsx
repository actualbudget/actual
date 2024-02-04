import React from 'react';

import { css } from 'glamor';

import { reportBudget } from 'loot-core/src/client/queries';

import { theme, type CSSProperties, styles } from '../../../../style';
import { AlignedText } from '../../../common/AlignedText';
import { HoverTarget } from '../../../common/HoverTarget';
import { Text } from '../../../common/Text';
import { View } from '../../../common/View';
import { PrivacyFilter } from '../../../PrivacyFilter';
import { useFormat } from '../../../spreadsheet/useFormat';
import { useSheetValue } from '../../../spreadsheet/useSheetValue';
import { Tooltip } from '../../../tooltips';
import { makeAmountFullStyle } from '../../util';

type SavedProps = {
  projected: boolean;
  style?: CSSProperties;
};
export function Saved({ projected, style }: SavedProps) {
  const budgetedSaved =
    useSheetValue<number>(reportBudget.totalBudgetedSaved) || 0;
  const totalSaved = useSheetValue<number>(reportBudget.totalSaved) || 0;
  const format = useFormat();
  const saved = projected ? budgetedSaved : totalSaved;
  const isNegative = saved < 0;

  return (
    <View style={{ alignItems: 'center', fontSize: 14, ...style }}>
      {projected ? (
        <Text style={{ color: theme.pageTextLight }}>Projected Savings:</Text>
      ) : (
        <View style={{ color: theme.pageTextLight }}>
          {isNegative ? 'Overspent:' : 'Saved:'}
        </View>
      )}

      <HoverTarget
        renderContent={() => {
          if (!projected) {
            const diff = totalSaved - budgetedSaved;
            return (
              <Tooltip
                position="bottom-center"
                style={{ padding: 10, fontSize: 14 }}
              >
                <AlignedText
                  left="Projected Savings:"
                  right={
                    <Text
                      style={{
                        ...makeAmountFullStyle(budgetedSaved),
                        ...styles.tnum,
                      }}
                    >
                      {format(budgetedSaved, 'financial-with-sign')}
                    </Text>
                  }
                />
                <AlignedText
                  left="Difference:"
                  right={
                    <Text
                      style={{ ...makeAmountFullStyle(diff), ...styles.tnum }}
                    >
                      {format(diff, 'financial-with-sign')}
                    </Text>
                  }
                />
              </Tooltip>
            );
          }
          return null;
        }}
      >
        <View
          className={`${css([
            {
              fontSize: 25,
              color: projected
                ? theme.warningText
                : isNegative
                  ? theme.errorTextDark
                  : theme.upcomingText,
            },
          ])}`}
        >
          <PrivacyFilter blurIntensity={7}>
            {format(saved, 'financial')}
          </PrivacyFilter>
        </View>
      </HoverTarget>
    </View>
  );
}
