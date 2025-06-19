import React, { type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { useTrackingSheetValue } from '@desktop-client/components/budget/tracking/TrackingBudgetComponents';
import { makeAmountFullStyle } from '@desktop-client/components/budget/util';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { trackingBudget } from '@desktop-client/spreadsheet/bindings';

type SavedProps = {
  projected: boolean;
  style?: CSSProperties;
};
export function Saved({ projected, style }: SavedProps) {
  const { t } = useTranslation();
  const budgetedSaved =
    useTrackingSheetValue(trackingBudget.totalBudgetedSaved) || 0;
  const totalSaved = useTrackingSheetValue(trackingBudget.totalSaved) || 0;
  const format = useFormat();
  const saved = projected ? budgetedSaved : totalSaved;
  const isNegative = saved < 0;
  const diff = totalSaved - budgetedSaved;

  return (
    <View style={{ alignItems: 'center', fontSize: 14, ...style }}>
      {projected ? (
        <Text style={{ color: theme.pageTextLight }}>
          <Trans>Projected savings:</Trans>
        </Text>
      ) : (
        <View style={{ color: theme.pageTextLight }}>
          {isNegative ? t('Overspent:') : t('Saved:')}
        </View>
      )}

      <Tooltip
        style={{ ...styles.tooltip, fontSize: 14, padding: 10 }}
        content={
          <>
            <AlignedText
              left={t('Projected savings:')}
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
              left={t('Difference:')}
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
          className={css({
            fontSize: 25,
            color: projected
              ? theme.warningText
              : isNegative
                ? theme.errorTextDark
                : theme.upcomingText,
          })}
        >
          <PrivacyFilter>{format(saved, 'financial')}</PrivacyFilter>
        </View>
      </Tooltip>
    </View>
  );
}
