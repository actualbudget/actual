import { v4 as uuidv4 } from 'uuid';

import { amountToInteger } from '../../shared/util';
import type { RecurConfig } from '../../types/models';

import type {
  ParsedWallosSubscription,
  WallosExportResponse,
  WallosSubscription,
} from './wallos-types';

export type { ParsedWallosSubscription, WallosExportResponse };

/**
 * Parse a Wallos JSON export file into a structured format.
 * Supports both formats:
 * - Plain array: [{ Name: "...", ... }, ...]
 * - Wrapped: { success: true, subscriptions: [...] }
 *
 * @param content - JSON string content of the Wallos export file
 */
export function parseWallosFile(content: string): ParsedWallosSubscription[] {
  const data = JSON.parse(content);

  let subscriptions: WallosSubscription[];

  // Handle both formats: plain array or wrapped object
  if (Array.isArray(data)) {
    subscriptions = data;
  } else if (data.success && Array.isArray(data.subscriptions)) {
    subscriptions = (data as WallosExportResponse).subscriptions;
  } else {
    throw new Error(
      'Invalid Wallos export file: expected an array of subscriptions or { success: true, subscriptions: [...] }',
    );
  }

  return subscriptions.map(sub => parseSubscription(sub));
}

/**
 * Parse a single Wallos subscription into our internal format
 */
function parseSubscription(sub: WallosSubscription): ParsedWallosSubscription {
  const { frequency, interval } = parsePaymentCycle(sub['Payment Cycle']);
  const amount = parsePrice(sub.Price);

  return {
    id: uuidv4(),
    name: sub.Name,
    amount: -Math.abs(amount), // Always negative for expenses
    nextPaymentDate: sub['Next Payment'],
    frequency,
    interval,
    category: sub.Category || '',
    paymentMethod: sub['Payment Method'] || '',
    notes: sub.Notes || '',
    url: sub.URL || '',
    isActive: sub.Active === 'Yes' && sub.State === 'Enabled',
    originalPrice: sub.Price,
  };
}

/**
 * Parse Wallos "Payment Cycle" string into frequency and interval
 * Examples: "Monthly", "Every 2 Weeks", "Yearly", "Every 3 Months", "Daily", "Weekly"
 */
function parsePaymentCycle(cycle: string): {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
} {
  const normalizedCycle = cycle.toLowerCase().trim();

  // Handle simple cases
  if (normalizedCycle === 'daily') {
    return { frequency: 'daily', interval: 1 };
  }
  if (normalizedCycle === 'weekly') {
    return { frequency: 'weekly', interval: 1 };
  }
  if (normalizedCycle === 'monthly') {
    return { frequency: 'monthly', interval: 1 };
  }
  if (normalizedCycle === 'yearly' || normalizedCycle === 'annually') {
    return { frequency: 'yearly', interval: 1 };
  }

  // Handle "Every N <unit>" patterns
  const everyPattern = /every\s+(\d+)\s+(day|week|month|year)s?/i;
  const match = normalizedCycle.match(everyPattern);

  if (match) {
    const interval = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'day':
        return { frequency: 'daily', interval };
      case 'week':
        return { frequency: 'weekly', interval };
      case 'month':
        return { frequency: 'monthly', interval };
      case 'year':
        return { frequency: 'yearly', interval };
      default:
        return { frequency: 'monthly', interval: 1 };
    }
  }

  // Handle "Biweekly" / "Bi-weekly" patterns
  if (
    normalizedCycle.includes('biweekly') ||
    normalizedCycle.includes('bi-weekly')
  ) {
    return { frequency: 'weekly', interval: 2 };
  }

  // Handle "Bimonthly" / "Bi-monthly" patterns
  if (
    normalizedCycle.includes('bimonthly') ||
    normalizedCycle.includes('bi-monthly')
  ) {
    return { frequency: 'monthly', interval: 2 };
  }

  // Handle "Quarterly" pattern
  if (normalizedCycle.includes('quarterly')) {
    return { frequency: 'monthly', interval: 3 };
  }

  // Handle "Semi-annual" / "Semi-annually" patterns (every 6 months)
  if (
    normalizedCycle.includes('semi-annual') ||
    normalizedCycle.includes('semiannual')
  ) {
    return { frequency: 'monthly', interval: 6 };
  }

  // Default to monthly if we can't parse
  return { frequency: 'monthly', interval: 1 };
}

/**
 * Parse a price string with currency symbol into an integer (cents)
 * Examples: "$9.99", "€9.99", "9.99 USD", "£19.99"
 */
function parsePrice(priceStr: string): number {
  if (!priceStr) {
    return 0;
  }

  // Remove everything except digits and decimal point
  const cleanedPrice = priceStr.replace(/[^\d.]/g, '').trim();

  const numericValue = parseFloat(cleanedPrice);

  if (isNaN(numericValue)) {
    return 0;
  }

  // Convert to integer cents using Actual's utility
  return amountToInteger(numericValue);
}

/**
 * Convert a parsed Wallos subscription to Actual's RecurConfig format
 */
export function toRecurConfig(sub: ParsedWallosSubscription): RecurConfig {
  return {
    frequency: sub.frequency,
    interval: sub.interval,
    start: sub.nextPaymentDate,
    endMode: 'never',
  };
}

/**
 * Build conditions array for creating a schedule
 */
export function buildScheduleConditions(
  sub: ParsedWallosSubscription,
  accountId: string,
  payeeId: string | null,
): Array<{ op: string; field: string; value: unknown }> {
  const conditions: Array<{ op: string; field: string; value: unknown }> = [
    {
      op: 'isapprox',
      field: 'date',
      value: toRecurConfig(sub),
    },
    {
      op: 'isapprox',
      field: 'amount',
      value: sub.amount,
    },
    {
      op: 'is',
      field: 'account',
      value: accountId,
    },
  ];

  if (payeeId) {
    conditions.push({
      op: 'is',
      field: 'payee',
      value: payeeId,
    });
  }

  return conditions;
}
