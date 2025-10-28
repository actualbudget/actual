import { logger } from '../../platform/server/log';
import { currentDay } from '../../shared/months';
import { amountToInteger } from '../../shared/util';
import { type AccountEntity, type TransactionEntity } from '../../types/models';
import * as db from '../db';

export type MortgageLoanAccount = AccountEntity & {
  account_type: 'mortgage' | 'loan';
  interest_rate: number;
};

/**
 * Calculate interest for a mortgage/loan account based on the current balance and interest rate
 */
export function calculateInterest(
  balance: number,
  interestRate: number,
  daysElapsed: number = 1,
): number {
  // Convert annual interest rate to daily rate
  const dailyRate = interestRate / 365;

  // Calculate interest: balance * daily_rate * days
  const interest = balance * dailyRate * daysElapsed;

  // Round to 2 decimal places
  return Math.round(interest * 100) / 100;
}

/**
 * Get the last interest transaction date for an account
 */
export async function getLastInterestDate(
  accountId: string,
): Promise<string | null> {
  const result = await db.first<{ date: string }>(
    `SELECT date FROM transactions 
     WHERE acct = ? AND description LIKE ? 
     ORDER BY date DESC LIMIT 1`,
    [accountId, '%Interest%'],
  );

  return result?.date || null;
}

/**
 * Calculate days since last interest calculation
 */
export function getDaysSinceLastInterest(
  lastInterestDate: string | null,
): number {
  if (!lastInterestDate) {
    // If no previous interest transaction, calculate for 1 day
    return 1;
  }

  const lastDate = new Date(lastInterestDate);
  const currentDate = new Date(currentDay());
  const diffTime = currentDate.getTime() - lastDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(1, diffDays); // At least 1 day
}

/**
 * Create an interest transaction for a mortgage/loan account
 */
export async function createInterestTransaction(
  accountId: string,
  interestAmount: number,
  description: string = 'Interest',
): Promise<string> {
  const transaction: Omit<TransactionEntity, 'id'> = {
    account: accountId,
    amount: amountToInteger(interestAmount),
    payee: description, // Use 'payee' field which maps to 'description' in database
    date: currentDay(),
    cleared: true,
    is_parent: false,
    is_child: false,
    tombstone: false,
  };

  const transactionId = await db.insertTransaction(transaction);

  logger.info(
    `Created interest transaction for account ${accountId}: ${interestAmount}`,
  );

  return transactionId;
}

/**
 * Process interest for a mortgage/loan account
 */
export async function processInterestForAccount(
  account: MortgageLoanAccount,
): Promise<void> {
  if (!account.interest_rate || account.interest_rate <= 0) {
    return;
  }

  // Get current balance
  const balanceResult = await db.first<{ balance: number }>(
    'SELECT sum(amount) as balance FROM transactions WHERE acct = ? AND isParent = 0 AND tombstone = 0',
    [account.id],
  );

  const currentBalance = balanceResult?.balance || 0;

  if (currentBalance === 0) {
    return; // No balance to calculate interest on
  }

  // For mortgage/loan accounts, use absolute value of balance (debt amount)
  const balanceForInterest = Math.abs(currentBalance);

  // Get last interest date
  const lastInterestDate = await getLastInterestDate(account.id);
  const daysSinceLastInterest = getDaysSinceLastInterest(lastInterestDate);

  if (daysSinceLastInterest === 0) {
    return; // Interest already calculated for today
  }

  // Calculate interest
  const interestAmount = calculateInterest(
    balanceForInterest, // Use absolute value for interest calculation
    account.interest_rate,
    daysSinceLastInterest,
  );

  if (interestAmount > 0) {
    // For loans/mortgages, interest increases the debt (positive amount)
    const description =
      account.account_type === 'mortgage'
        ? 'Mortgage Interest'
        : 'Loan Interest';

    await createInterestTransaction(account.id, interestAmount, description);

    logger.info(
      `Processed interest for ${account.account_type} account ${account.id}: ` +
        `$${interestAmount} over ${daysSinceLastInterest} days`,
    );
  }
}

/**
 * Process interest for all mortgage/loan accounts
 */
export async function processInterestForAllAccounts(): Promise<void> {
  const accounts = await db.all<MortgageLoanAccount>(
    `SELECT * FROM accounts 
     WHERE account_type IN ('mortgage', 'loan') 
     AND interest_rate IS NOT NULL 
     AND interest_rate > 0 
     AND closed = 0 
     AND tombstone = 0`,
  );

  for (const account of accounts) {
    try {
      await processInterestForAccount(account);
    } catch (error) {
      logger.error(
        `Failed to process interest for account ${account.id}:`,
        error,
      );
    }
  }
}
