import { useMemo } from 'react';

import type { MonteCarloConfig } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { useAccountBalances } from '#hooks/useAccountBalances';

type ResolvedMonteCarloConfig = {
  resolvedConfig: MonteCarloConfig;
  /**
   * False while any linked account's balance is still on its way: the
   * balances arrive one at a time, so simulating before they all have
   * would run on stale starting balances and then re-run per arrival
   */
  hasLiveBalances: boolean;
};

/**
 * Resolves account-linked pots to their live balances: a linked pot takes
 * the account's current balance, falling back to its stored starting
 * balance until the live value arrives. Shared by the report page and the
 * dashboard card so both simulate the same portfolio.
 */
export function useResolvedMonteCarloConfig(
  config: MonteCarloConfig,
): ResolvedMonteCarloConfig {
  const linkedAccountIds = config.pots
    .map(pot => pot.accountId)
    .filter((id): id is string => id != null);
  const accountBalances = useAccountBalances(linkedAccountIds);

  // An account the spreadsheet can't value reports null, which still
  // counts as arrived (the pot keeps its stored balance)
  const hasLiveBalances = linkedAccountIds.every(
    accountId => accountId in accountBalances,
  );

  // Memoized by hand: this plain .ts file sits outside the React
  // Compiler's include (.tsx only), and the compiled consumers key their
  // auto-memoized simulation runs on this object's identity - a fresh
  // object every render would re-simulate on every unrelated re-render
  const resolvedConfig = useMemo(
    () => ({
      ...config,
      pots: config.pots.map(pot => {
        const balance =
          pot.accountId != null ? accountBalances[pot.accountId] : null;
        return balance != null
          ? { ...pot, startingBalance: Math.max(0, balance) }
          : pot;
      }),
    }),
    [config, accountBalances],
  );

  return useMemo(
    () => ({ resolvedConfig, hasLiveBalances }),
    [resolvedConfig, hasLiveBalances],
  );
}
