import * as monthUtils from '@actual-app/core/shared/months';

import type { AccountBalanceConverter } from '#hooks/useAccountBalanceConverter';

export type AccountAmount = { account: string; amount: number };
export type AccountMonthAmount = AccountAmount & { month: string };

export type BalanceHistoryPoint = {
  // YYYY-MM
  month: string;
  // The day the balance is valued on: the month's last day, or today for
  // the current month
  valuedOn: string;
  // The balance as stored, adding up accounts as they are
  balance: number;
  // The balance with every account converted into the default currency on
  // `valuedOn`; equal to `balance` without a converter
  converted: number;
  // Some account had no rate on or before `valuedOn`
  isApproximate: boolean;
};

// Month-end balances of one or more accounts over `months`, from their
// balance before the first month and the sum of their transactions in each
// month. Months without transactions keep the previous balance.
export function buildBalanceHistory({
  months,
  today,
  startingBalances,
  monthlyAmounts,
  convertBalance,
}: {
  months: readonly string[];
  today: string;
  startingBalances: readonly AccountAmount[];
  monthlyAmounts: readonly AccountMonthAmount[];
  convertBalance?: AccountBalanceConverter;
}): BalanceHistoryPoint[] {
  const balances = new Map<string, number>();
  for (const { account, amount } of startingBalances) {
    balances.set(account, (balances.get(account) ?? 0) + amount);
  }
  const amountsByMonth = new Map<string, AccountAmount[]>();
  for (const { account, month, amount } of monthlyAmounts) {
    amountsByMonth.set(month, [
      ...(amountsByMonth.get(month) ?? []),
      { account, amount },
    ]);
  }

  return months.map(month => {
    for (const { account, amount } of amountsByMonth.get(month) ?? []) {
      balances.set(account, (balances.get(account) ?? 0) + amount);
    }

    const monthEnd = monthUtils.lastDayOfMonth(month);
    const valuedOn = monthEnd < today ? monthEnd : today;
    let balance = 0;
    let converted = 0;
    let isApproximate = false;
    for (const [account, accountBalance] of balances) {
      balance += accountBalance;
      if (convertBalance) {
        const conversion = convertBalance(accountBalance, account, valuedOn);
        converted += conversion.amount;
        isApproximate = isApproximate || conversion.isApproximate;
      } else {
        converted += accountBalance;
      }
    }

    return { month, valuedOn, balance, converted, isApproximate };
  });
}
