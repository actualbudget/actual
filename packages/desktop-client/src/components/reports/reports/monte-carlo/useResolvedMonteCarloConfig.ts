import { useMemo } from 'react';

import type { MonteCarloConfig } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { useAccountBalances } from '#hooks/useAccountBalances';

/**
 * Resolves account-linked pots to their live balances: a linked pot takes
 * the account's current balance, falling back to its stored starting
 * balance until the live value arrives. Shared by the report page and the
 * dashboard card so both simulate the same portfolio.
 */
export function useResolvedMonteCarloConfig(
  config: MonteCarloConfig,
): MonteCarloConfig {
  const accountBalances = useAccountBalances(
    config.pots
      .map(pot => pot.accountId)
      .filter((id): id is string => id != null),
  );

  // Memoized by hand: this plain .ts file sits outside the React
  // Compiler's include (.tsx only), and the compiled consumers key their
  // auto-memoized simulation runs on this object's identity - a fresh
  // object every render would re-simulate on every unrelated re-render
  return useMemo(
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
}
