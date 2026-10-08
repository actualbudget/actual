import type { CurrentEstimate } from '@actual-app/core/server/accounts/current-estimates';
import { invertRate, utcDay } from '@actual-app/core/shared/exchange-rate';
import type { AccountEntity } from '@actual-app/core/types/models';
import type { TFunction } from 'i18next';

type Formatting = {
  /** Formats a base amount in the budget currency. */
  formatBase: (amount: number) => string;
  baseCurrency: string;
};

// An inverted rate carries 15 decimals of division noise; six significant
// digits match how stored rates are shown elsewhere.
const shownInverse = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 6,
  useGrouping: false,
});

/** Where a resolved rate came from, with its date. */
function rateOrigin(
  t: TFunction,
  estimate: Extract<CurrentEstimate, { status: 'resolved' }>,
) {
  const date = estimate.timestamp ? utcDay(estimate.timestamp) : '';
  const origin =
    estimate.kind === 'standing'
      ? t('manual standing rate from {{date}}', { date })
      : estimate.kind === 'dated'
        ? t('manual rate for {{date}}', { date })
        : t('{{source}} rate from {{date}}', {
            source: estimate.source,
            date,
          });
  return estimate.fallback
    ? t('{{origin}} (latest available)', { origin })
    : origin;
}

/** The estimate line for one foreign account. */
export function estimateText(
  t: TFunction,
  estimate: CurrentEstimate,
  account: Pick<AccountEntity, 'currency'>,
  { formatBase, baseCurrency }: Formatting,
) {
  switch (estimate.status) {
    case 'zero':
      return t('≈ {{amount}} at the current rate (no balance)', {
        amount: formatBase(0),
      });
    case 'unavailable':
      return t('Current-rate estimate: rate unavailable');
    default: {
      let inverse: string | undefined;
      try {
        inverse = shownInverse.format(Number(invertRate(estimate.rate)));
      } catch {
        // Keep extreme valid rates visible if their reciprocal exceeds the bounds.
        inverse = undefined;
      }
      return t(
        '≈ {{amount}} at the current rate (1 {{from}} = {{rate}} {{to}}, {{origin}})',
        {
          amount: formatBase(estimate.baseAmount),
          from: inverse ? account.currency : baseCurrency,
          rate: inverse ?? estimate.rate,
          to: inverse ? baseCurrency : account.currency,
          origin: rateOrigin(t, estimate),
        },
      );
    }
  }
}

/** The converted-total line for a group, naming accounts without a rate. */
export function convertedTotalText(
  t: TFunction,
  group: { convertedAmount: number; missing: string[] },
  accounts: Pick<AccountEntity, 'id' | 'name'>[],
  { formatBase }: Pick<Formatting, 'formatBase'>,
) {
  const amount = formatBase(group.convertedAmount);
  if (group.missing.length === 0) {
    return t('≈ {{amount}} at current rates', { amount });
  }
  return t(
    '≈ {{amount}} at current rates, incomplete: rate unavailable for {{accounts}}',
    {
      amount,
      accounts: group.missing
        .map(id => accounts.find(a => a.id === id)?.name ?? id)
        .join(', '),
    },
  );
}

/** The estimate group a register or sidebar total shows, if any. */
export function groupEstimateKey(
  accountId: string | undefined,
): 'all' | 'onBudget' | 'offBudget' | null {
  if (accountId === undefined) return 'all';
  if (accountId === 'onbudget') return 'onBudget';
  if (accountId === 'offbudget') return 'offBudget';
  return null;
}
