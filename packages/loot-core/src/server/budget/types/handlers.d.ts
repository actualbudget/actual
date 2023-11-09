import type { Notification } from '../../../client/state-types/notifications';

export interface BudgetHandlers {
  'budget/budget-amount': (arg: {
    category: string /* category id */;
    month: string;
    amount: number;
  }) => Promise<unknown>;

  'budget/copy-previous-month': (...args: unknown[]) => Promise<unknown>;

  'budget/set-zero': (...args: unknown[]) => Promise<unknown>;

  'budget/set-3month-avg': (...args: unknown[]) => Promise<unknown>;

  'budget/check-templates': () => Promise<Notification>;

  'budget/apply-goal-template': (arg: {
    month: string;
  }) => Promise<Notification>;

  'budget/overwrite-goal-template': (arg: {
    month: string;
  }) => Promise<Notification>;

  'budget/cleanup-goal-template': (arg: {
    month: string;
  }) => Promise<Notification>;

  'budget/hold-for-next-month': (...args: unknown[]) => Promise<unknown>;

  'budget/reset-hold': (...args: unknown[]) => Promise<unknown>;

  'budget/cover-overspending': (...args: unknown[]) => Promise<unknown>;

  'budget/transfer-available': (...args: unknown[]) => Promise<unknown>;

  'budget/transfer-category': (...args: unknown[]) => Promise<unknown>;

  'budget/set-carryover': (...args: unknown[]) => Promise<unknown>;

  'budget/apply-single-template': (arg: {
    month: string;
    category: string; //category id
  }) => Promise<Notification>;

  'budget/set-n-month-avg': (arg: {
    month: string;
    N: number;
    category: string; //category id
  }) => Promise<unknown>;

  'budget/copy-single-month': (arg: {
    month: string;
    category: string; //category id
  }) => Promise<unknown>;
}
