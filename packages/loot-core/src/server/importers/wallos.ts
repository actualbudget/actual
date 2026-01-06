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
 *
 * Supports two export formats from Wallos:
 * - Plain array: `[{ Name: "...", ... }, ...]`
 * - Wrapped object: `{ success: true, subscriptions: [...] }`
 *
 * @param content - JSON string content of the Wallos export file
 * @returns Array of parsed subscriptions with normalized fields
 * @throws {Error} If the JSON is invalid or doesn't match expected format
 *
 * @example
 * const json = await file.text();
 * const subscriptions = parseWallosFile(json);
 * // subscriptions[0] = {
 * //   id: "uuid-...",
 * //   name: "Netflix",
 * //   amount: -1599, // in cents, negative for expense
 * //   nextPaymentDate: "2024-01-15",
 * //   frequency: "monthly",
 * //   interval: 1,
 * //   ...
 * // }
 */
export function parseWallosFile(content: string): ParsedWallosSubscription[] {
  const data = JSON.parse(content);

  let subscriptions: WallosSubscription[];

  // Handle plain array or wrapped object
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
 * Parse a single Wallos subscription into our internal format.
 *
 * Normalizes fields:
 * - Generates UUID for tracking
 * - Converts price to integer cents (always negative for expenses)
 * - Parses payment cycle into frequency/interval
 * - Derives active state from State and Active fields
 *
 * @param sub - Raw Wallos subscription object
 * @returns Parsed subscription with normalized fields
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
 * Parse Wallos "Payment Cycle" string into frequency and interval.
 *
 * Supports various formats:
 * - Simple: "Daily", "Weekly", "Monthly", "Yearly", "Annually"
 * - Interval: "Every 2 Weeks", "Every 3 Months", "Every 2 Years"
 * - Special: "Biweekly", "Bi-weekly", "Quarterly", "Semi-annual"
 *
 * @param cycle - Payment cycle string from Wallos
 * @returns Object with frequency ('daily' | 'weekly' | 'monthly' | 'yearly') and interval number
 *
 * @example
 * parsePaymentCycle("Monthly") // { frequency: "monthly", interval: 1 }
 * parsePaymentCycle("Every 2 Weeks") // { frequency: "weekly", interval: 2 }
 * parsePaymentCycle("Every 3 Months") // { frequency: "monthly", interval: 3 }
 * parsePaymentCycle("Biweekly") // { frequency: "weekly", interval: 2 }
 * parsePaymentCycle("Quarterly") // { frequency: "monthly", interval: 3 }
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
 * Parse a price string with currency symbol into an integer (cents).
 *
 * Handles multiple formats:
 * - US/UK: "$9.99", "9.99 USD", "£19.99"
 * - European: "€9,99", "9,99 EUR"
 * - Thousands separators: "$1,234.56", "€1.234,56"
 *
 * @param priceStr - Price string with optional currency symbol
 * @returns Amount in integer cents (e.g., "9.99" → 999), or 0 if parsing fails
 *
 * @example
 * parsePrice("$9.99")    // 999
 * parsePrice("€9,99")    // 999
 * parsePrice("1.234,56") // 123456
 * parsePrice("")   // 0
 */
function parsePrice(priceStr: string): number {
  if (!priceStr) {
    return 0;
  }
  // Normalize the price string to handle different formats
  let cleanedPrice = priceStr.trim();

  // Detect European format (comma as decimal separator)
  // European: "1.234,56" or "1234,56"
  // US/UK: "1,234.56" or "1234.56"
  if (cleanedPrice.includes(',')) {
    const lastComma = cleanedPrice.lastIndexOf(',');
    const lastDot = cleanedPrice.lastIndexOf('.');

    if (lastComma > lastDot) {
      // European format: comma is decimal separator
      cleanedPrice = cleanedPrice.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: comma is thousands separator
      cleanedPrice = cleanedPrice.replace(/,/g, '');
    }
  }

  // Remove remaining non-numeric characters (currency symbols, etc.)
  cleanedPrice = cleanedPrice.replace(/[^\d.]/g, '');
  const numericValue = parseFloat(cleanedPrice);

  if (isNaN(numericValue)) {
    return 0;
  }

  // Convert to integer cents using Actual's utility
  return amountToInteger(numericValue);
}

/**
 * Convert a parsed Wallos subscription to Actual's RecurConfig format.
 *
 * Maps the subscription's frequency, interval, and next payment date
 * into a recurrence configuration suitable for creating schedules.
 *
 * @param sub - Parsed Wallos subscription
 * @returns Recurrence configuration for Actual Budget
 *
 * @example
 * const config = toRecurConfig({
 *   frequency: 'monthly',
 *   interval: 1,
 *   nextPaymentDate: '2024-01-15',
 *   ...
 * });
 * // config = {
 * //   frequency: 'monthly',
 * //   interval: 1,
 * //   start: '2024-01-15',
 * //   endMode: 'never'
 * // }
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
 * Build conditions array for creating a schedule from a Wallos subscription.
 *
 * Constructs the rule conditions needed to create a schedule,
 * including date recurrence, amount, account, and optionally payee.
 *
 * @param sub - Parsed Wallos subscription
 * @param accountId - Account ID to associate with the schedule
 * @param payeeId - Payee ID (optional, null if none)
 * @returns Array of condition objects for the schedule rule
 *
 * @example
 * const conditions = buildScheduleConditions(
 *   subscription,
 *   'account-123',
 *   'payee-456'
 * );
 * // Returns conditions for: date, amount, account, payee
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
