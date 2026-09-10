import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { FinancialText } from '#components/FinancialText';
import { MonteCarloCashflowSwatch } from '#components/reports/graphs/MonteCarloCashflowSwatch';
import type {
  MonteCarloCashflowDataPoint,
  MonteCarloCashflowTooltipGroup,
} from '#components/reports/graphs/util/monteCarloCashflowChart';
import { useFormat } from '#hooks/useFormat';

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

const LABEL_STYLE = css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
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
  // Only series with money moving this year, and only groups with any
  const sections = groups
    .map(group => {
      const members = group.series
        .map(series => ({ ...series, value: point.amounts[series.key] ?? 0 }))
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
      {point.afterDepletion && (
        <div
          style={{ marginBottom: 10, maxWidth: 220, color: theme.errorText }}
        >
          {t('The pots had already run out - this spending went unfunded.')}
        </div>
      )}
      <div style={{ lineHeight: 1.5 }}>
        {sections.map(group => (
          <View key={group.key}>
            <View className={VALUE_ROW_STYLE}>
              <View className={LABEL_STYLE}>
                {!group.listMembers && (
                  <MonteCarloCashflowSwatch color={group.members[0].color} />
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
                  <View className={LABEL_STYLE}>
                    <MonteCarloCashflowSwatch color={member.color} />
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
