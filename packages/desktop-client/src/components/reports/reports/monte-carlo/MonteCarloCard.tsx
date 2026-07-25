import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { MonteCarloWidget } from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { MonteCarloGraph } from '#components/reports/graphs/MonteCarloGraph';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import {
  getMonteCarloHorizonYears,
  monteCarloConfigFromMeta,
  runMonteCarloSimulation,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { useAccountBalances } from '#hooks/useAccountBalances';

type MonteCarloCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: MonteCarloWidget['meta'];
  onMetaChange: (newMeta: MonteCarloWidget['meta']) => void;
};

export function MonteCarloCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
}: MonteCarloCardProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);

  const config = monteCarloConfigFromMeta(meta);
  // Pots linked to an account use its live balance; the stored balance is
  // the fallback until the live value arrives
  const accountBalances = useAccountBalances(
    config.pots
      .map(pot => pot.accountId)
      .filter((id): id is string => id != null),
  );
  const resolvedConfig = {
    ...config,
    pots: config.pots.map(pot => {
      const balance =
        pot.accountId != null ? accountBalances[pot.accountId] : null;
      return balance != null
        ? { ...pot, startingBalance: Math.max(0, balance) }
        : pot;
    }),
  };
  const result = runMonteCarloSimulation({
    ...resolvedConfig,
    horizonYears: getMonteCarloHorizonYears(resolvedConfig),
    deflateToTodaysMoney: true,
  });

  const endAge = config.currentAge + result.horizonYears;
  const successPercent = Math.round(result.successRate * 1000) / 10;

  return (
    <ReportCard
      widgetId={widgetId}
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/monte-carlo/${widgetId}`}
      onRename={() => setNameMenuOpen(true)}
    >
      <View
        style={{ flex: 1 }}
        onPointerEnter={() => setIsCardHovered(true)}
        onPointerLeave={() => setIsCardHovered(false)}
      >
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <ReportCardName
              name={meta?.name || t('Monte Carlo Analysis')}
              isEditing={nameMenuOpen}
              onChange={newName => {
                onMetaChange({
                  ...meta,
                  name: newName,
                });
                setNameMenuOpen(false);
              }}
              onClose={() => setNameMenuOpen(false)}
            />
          </View>
          <View style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
            <Block
              style={{
                ...styles.mediumText,
                fontWeight: 500,
                marginBottom: 5,
              }}
            >
              <PrivacyFilter activationFilters={[!isCardHovered]}>
                <FinancialText>{`${successPercent}%`}</FinancialText>
              </PrivacyFilter>
            </Block>
            <Block
              style={{
                fontSize: 12,
                color: theme.pageTextSubdued,
              }}
            >
              <Trans>Success rate to age {{ age: endAge }}</Trans>
            </Block>
          </View>
        </View>

        <MonteCarloGraph
          percentileBands={result.percentileBands}
          startAge={config.currentAge}
          compact
          showTooltip={!isEditing && !isNarrowWidth}
          style={{ height: 'auto', flex: 1 }}
        />
      </View>
    </ReportCard>
  );
}
