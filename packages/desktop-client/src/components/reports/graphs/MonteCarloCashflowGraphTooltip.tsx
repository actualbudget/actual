import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { FinancialText } from '#components/FinancialText';
import { useFormat } from '#hooks/useFormat';

/** One bar series of the cashflow chart: a pot, a phase, tax, ... */
export type MonteCarloCashflowSeries = {
  /** The datum key the chart plots for this series */
  key: string;
  label: string;
  color: string;
};

/**
 * A headed section of the cashflow tooltip - e.g. "Withdrawals" with a
 * row per pot. A single-series group (Contributions, Tax) sets
 * listMembers false so the heading row alone carries its value.
 */
export type MonteCarloCashflowTooltipGroup = {
  key: string;
  heading: string;
  series: MonteCarloCashflowSeries[];
  listMembers: boolean;
};

/**
 * One charted year. Besides the fixed fields it carries one entry per
 * series key: positive for money in, negative for money out.
 */
export type MonteCarloCashflowDataPoint = Record<string, number>;

type PayloadItem = {
  payload: MonteCarloCashflowDataPoint;
};

type MonteCarloCashflowGraphTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  groups: MonteCarloCashflowTooltipGroup[];
};

const VALUE_ROW_STYLE = css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 20,
});

export function MonteCarloCashflowGraphTooltip({
  active,
  payload,
  groups,
}: MonteCarloCashflowGraphTooltipProps) {
  const { t } = useTranslation();
  const format = useFormat();

  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const point = payload[0].payload;
  const sections = groups
    .map(group => {
      const members = group.series
        .map(series => ({ ...series, value: point[series.key] ?? 0 }))
        .filter(series => series.value !== 0);
      return {
        ...group,
        members,
        total: members.reduce((sum, series) => sum + series.value, 0),
      };
    })
    .filter(group => group.members.length > 0);

  return (
    <div
      className={css({
        zIndex: 1000,
        pointerEvents: 'none',
        borderRadius: 2,
        boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
        backgroundColor: theme.menuBackground,
        color: theme.menuItemText,
        padding: 10,
      })}
    >
      <div style={{ marginBottom: 10 }}>
        <strong>{t('Age {{age}}', { age: point.age })}</strong>
      </div>
      {point.afterDepletion === 1 && (
        <div
          style={{ marginBottom: 10, maxWidth: 220, color: theme.errorText }}
        >
          {t('The pots had already run out - this spending went unfunded.')}
        </div>
      )}
      <div style={{ lineHeight: 1.5 }}>
        {sections.map(group => (
          <View key={group.key} className={css({ display: 'flex' })}>
            <View className={VALUE_ROW_STYLE}>
              <View
                className={css({
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                })}
              >
                {!group.listMembers && (
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      backgroundColor: group.members[0].color,
                    }}
                  />
                )}
                <strong>{group.heading}</strong>
              </View>
              <strong>
                <FinancialText>
                  {format(group.total, 'financial')}
                </FinancialText>
              </strong>
            </View>
            {group.listMembers &&
              group.members.map(member => (
                <View
                  key={member.key}
                  className={VALUE_ROW_STYLE}
                  style={{ paddingLeft: 16 }}
                >
                  <View
                    className={css({
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    })}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        backgroundColor: member.color,
                      }}
                    />
                    <div>{member.label}</div>
                  </View>
                  <div>
                    <FinancialText>
                      {format(member.value, 'financial')}
                    </FinancialText>
                  </div>
                </View>
              ))}
          </View>
        ))}
      </div>
    </div>
  );
}
