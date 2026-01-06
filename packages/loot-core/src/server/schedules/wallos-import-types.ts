import type {
  AccountEntity,
  PayeeEntity,
  RecurConfig,
} from '../../types/models';

/**
 * Item structure for importing a single Wallos subscription as a schedule.
 *
 * Contains all the information needed to create a schedule from
 * a Wallos subscription, including account and payee assignments.
 */
export type WallosScheduleImportItem = {
  /** Display name for the schedule (from Wallos subscription name) */
  name: string;
  /** Amount in cents, negative for expenses */
  amount: number;
  /** Account ID to associate with the schedule */
  accountId: AccountEntity['id'];
  /** Payee ID to use (existing or newly created) */
  payeeId: PayeeEntity['id'];
  /** Recurrence configuration (frequency, interval, start date) */
  date: RecurConfig;
};

/**
 * Result of checking a single subscription for duplicate schedules.
 *
 * Used to warn users when importing a subscription that may
 * already exist as a schedule (matched by name and similar amount).
 */
export type WallosDuplicateCheckResult = {
  /** The parsed subscription ID being checked */
  subscriptionId: string;
  /** Whether a potential duplicate was found */
  isDuplicate: boolean;
  /** ID of the matching existing schedule, if found */
  existingScheduleId?: string;
  /** Name of the matching existing schedule, if found */
  existingScheduleName?: string;
};

/**
 * Result of importing Wallos subscriptions as schedules.
 *
 * Provides summary statistics and detailed error information
 * for the import operation.
 */
export type WallosImportResult = {
  /** Number of schedules successfully created */
  successCount: number;
  /** Details of any schedules that failed to import */
  errors: Array<{
    /** Name of the subscription that failed */
    name: string;
    /** Error message describing why it failed */
    error: string;
  }>;
};
