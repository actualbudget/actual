import type { Notification } from '../../../client/notifications/notificationsSlice';

export interface BudgetHandlers {
  'budget/budget-amount': (arg: {
    category: string /* category id */;
    month: string;
    amount: number;
  }) => Promise<void>;

  'budget/copy-previous-month': (arg: { month: string }) => Promise<void>;

  'budget/set-zero': (arg: { month: string }) => Promise<void>;

  'budget/set-3month-avg': (arg: { month: string }) => Promise<void>;

  'budget/set-6month-avg': (arg: { month: string }) => Promise<void>;

  'budget/set-12month-avg': (arg: { month: string }) => Promise<void>;

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

  'budget/hold-for-next-month': (arg: {
    month: string;
    amount: number;
  }) => Promise<boolean>;

  'budget/reset-hold': (arg: { month: string }) => Promise<void>;

  'budget/cover-overspending': (arg: {
    month: string;
    to: string;
    from: string;
  }) => Promise<void>;

  'budget/transfer-available': (arg: {
    month: string;
    amount: number;
    category: string;
  }) => Promise<void>;

  'budget/cover-overbudgeted': (arg: {
    month: string;
    category: string;
  }) => Promise<void>;

  'budget/transfer-category': (arg: {
    month: string;
    amount: number;
    to: string;
    from: string;
  }) => Promise<void>;

  'budget/set-carryover': (arg: {
    startMonth: string;
    category: string;
    flag: boolean;
  }) => Promise<void>;

  'budget/apply-single-template': (arg: {
    month: string;
    category: string; //category id
  }) => Promise<Notification>;

  'budget/set-n-month-avg': (arg: {
    month: string;
    N: number;
    category: string; //category id
  }) => Promise<void>;

  'budget/copy-single-month': (arg: {
    month: string;
    category: string; //category id
  }) => Promise<void>;

  'budget/apply-multiple-templates': (arg: {
    month: string;
    categoryIds: string[];
  }) => Promise<Notification>;
}
