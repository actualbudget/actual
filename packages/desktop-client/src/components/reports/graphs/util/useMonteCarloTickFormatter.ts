import { MAX_FORMATTABLE_AMOUNT } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { useFormat } from '#hooks/useFormat';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

/**
 * Y-axis tick formatter shared by the Monte Carlo charts: redacted in
 * privacy mode, otherwise the amount without decimals. Recharts can
 * synthesize ticks beyond the (already clamped) data extremes, so ticks
 * are kept within what the formatter accepts.
 */
export function useMonteCarloTickFormatter() {
  const privacyMode = usePrivacyMode();
  const format = useFormat();

  return (tick: number) => {
    if (privacyMode) {
      return '...';
    }
    const safeTick = Math.min(
      Math.max(Math.round(tick), -MAX_FORMATTABLE_AMOUNT),
      MAX_FORMATTABLE_AMOUNT,
    );
    return `${format(safeTick, 'financial-no-decimals')}`;
  };
}
