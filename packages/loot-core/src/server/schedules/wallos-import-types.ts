import type {
  AccountEntity,
  PayeeEntity,
  RecurConfig,
} from '../../types/models';

/**
 * Item structure for importing a single Wallos subscription as a schedule
 */
export type WallosScheduleImportItem = {
  /** Name for the schedule (from Wallos subscription name) */
  name: string;
  /** Amount in cents, negative for expenses */
  amount: number;
  /** Account to associate with the schedule */
  accountId: AccountEntity['id'];
  /** Payee ID to use (existing or newly created) */
  payeeId: PayeeEntity['id'];
  /** Recurrence configuration */
  date: RecurConfig;
};

/**
 * Result of checking for duplicate schedules
 */
export type WallosDuplicateCheckResult = {
  /** The parsed subscription ID being checked */
  subscriptionId: string;
  /** Whether a potential duplicate was found */
  isDuplicate: boolean;
  /** ID of the matching existing schedule, if found */
  existingScheduleId?: string;
  /** Name of the matching existing schedule */
  existingScheduleName?: string;
};

/**
 * Result of importing Wallos subscriptions
 */
export type WallosImportResult = {
  /** Number of schedules successfully created */
  successCount: number;
  /** Errors encountered during import */
  errors: Array<{
    name: string;
    error: string;
  }>;
};
