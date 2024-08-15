import React from 'react';

import { css } from 'glamor';

import { reportBudget } from 'loot-core/src/client/queries';

import { theme, type CSSProperties, styles } from '../../../../style';
import { AlignedText } from '../../../common/AlignedText';
import { Text } from '../../../common/Text';
import { Tooltip } from '../../../common/Tooltip';
import { View } from '../../../common/View';
import { PrivacyFilter } from '../../../PrivacyFilter';
import { useFormat } from '../../../spreadsheet/useFormat';
import { makeAmountFullStyle } from '../../util';
import { useReportSheetValue } from '../ReportComponents';

type SavedProps = {
  projected: boolean;
  style?: CSSProperties;
};
export function Saved({ projected, style }: SavedProps) {
  const budgetedSaved =
    useReportSheetValue(reportBudget.totalBudgetedSaved) || 0;
  const totalSaved = useReportSheetValue(reportBudget.totalSaved) || 0;
  const format = useFormat();
  const saved = projected ? budgetedSaved : totalSaved;
  const isNegative = saved < 0;
  const diff = totalSaved - budgetedSaved;

  return (
    <View style={{ alignItems: 'center', fontSize: 14, ...style }}>
      {projected ? (
        <Text style={{ color: theme.pageTextLight }}>Projected Savings:</Text>
      ) : (
        <View style={{ color: theme.pageTextLight }}>
          {isNegative ? 'Overspent:' : 'Saved:'}
        </View>
      )}

      <Tooltip
        style={{ ...styles.tooltip, fontSize: 14, padding: 10 }}
        content={
          <>
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
                <Text style={{ ...makeAmountFullStyle(diff), ...styles.tnum }}>
                  {format(diff, 'financial-with-sign')}
                </Text>
              }
            />
          </>
        }
        placement="bottom"
        triggerProps={{
          isDisabled: Boolean(projected),
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
      </Tooltip>
    </View>
  );
}
