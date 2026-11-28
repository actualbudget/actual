import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { MonteCarloWidget } from '@actual-app/core/types/models';
import { useQuery } from '@tanstack/react-query';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { MonteCarloGraph } from '#components/reports/graphs/MonteCarloGraph';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import {
  getMonteCarloHorizonYears,
  monteCarloConfigFromMeta,
  runMonteCarloSimulation,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { useResolvedMonteCarloConfig } from '#components/reports/reports/monte-carlo/useResolvedMonteCarloConfig';

// Stable default so an unsaved widget doesn't bust the simulation's
// memoization on every re-render (e.g. hover state changes)
const EMPTY_META: NonNullable<MonteCarloWidget['meta']> = {};

type MonteCarloCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: MonteCarloWidget['meta'];
  onMetaChange: (newMeta: MonteCarloWidget['meta']) => void;
};

export function MonteCarloCard({
  widgetId,
  isEditing,
  meta = EMPTY_META,
  onMetaChange,
}: MonteCarloCardProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Memoised by hand so hovering the card (which toggles state) doesn't
  // re-run thousands of simulations
  const config = useMemo(() => monteCarloConfigFromMeta(meta), [meta]);
  const { resolvedConfig, hasLiveBalances } =
    useResolvedMonteCarloConfig(config);

  // Thousands of simulations take a noticeable slice of a second, so they
  // run as a query: after the dashboard has painted rather than inside
  // render, only once every linked balance is in (each arrival would
  // otherwise trigger a full re-run on stale numbers), and cached by
  // config so coming back to the dashboard doesn't simulate again. The
  // engine is deterministic, so a cached result never goes stale
  const { data } = useQuery({
    queryKey: ['monte-carlo-card', resolvedConfig],
    queryFn: () =>
      runMonteCarloSimulation({
        ...resolvedConfig,
        horizonYears: getMonteCarloHorizonYears(resolvedConfig),
        deflateToTodaysMoney: true,
      }),
    enabled: hasLiveBalances,
    staleTime: Infinity,
  });
  // While the live balances are still loading the config holds the stored
  // ones, and a result cached for those would flash a since-changed number
  // before the live key replaces it
  const result = hasLiveBalances ? (data ?? null) : null;

  const endAge = config.currentAge + getMonteCarloHorizonYears(config);
  const successPercent =
    result != null ? Math.round(result.successRate * 1000) / 10 : null;

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
                <FinancialText>
                  {successPercent != null ? `${successPercent}%` : '…'}
                </FinancialText>
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

        {result != null ? (
          <MonteCarloGraph
            percentileBands={result.percentileBands}
            startAge={config.currentAge}
            compact
            showTooltip={!isEditing && !isNarrowWidth}
            style={{ height: 'auto', flex: 1 }}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
