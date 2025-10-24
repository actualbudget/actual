import { useTranslation } from 'react-i18next';

import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { send } from 'loot-core/platform/client/fetch';
import { type CategoryEntity } from 'loot-core/types/models/category';

import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

type ApplyBudgetActionPayload =
  | {
      type: 'budget-amount';
      month: string;
      args: {
        category: CategoryEntity['id'];
        amount: number;
      };
    }
  | {
      type: 'copy-last';
      month: string;
      args?: never;
    }
  | {
      type: 'set-zero';
      month: string;
      args?: never;
    }
  | {
      type: 'set-3-avg';
      month: string;
      args?: never;
    }
  | {
      type: 'set-6-avg';
      month: string;
      args?: never;
    }
  | {
      type: 'set-12-avg';
      month: string;
      args?: never;
    }
  | {
      type: 'check-templates';
      month?: never;
      args?: never;
    }
  | {
      type: 'apply-goal-template';
      month: string;
      args?: never;
    }
  | {
      type: 'overwrite-goal-template';
      month: string;
      args?: never;
    }
  | {
      type: 'cleanup-goal-template';
      month: string;
      args?: never;
    }
  | {
      type: 'hold';
      month: string;
      args: {
        amount: number;
      };
    }
  | {
      type: 'reset-hold';
      month: string;
      args?: never;
    }
  | {
      type: 'cover-overspending';
      month: string;
      args: {
        to: CategoryEntity['id'];
        from: CategoryEntity['id'];
      };
    }
  | {
      type: 'transfer-available';
      month: string;
      args: {
        amount: number;
        category: CategoryEntity['id'];
      };
    }
  | {
      type: 'cover-overbudgeted';
      month: string;
      args: {
        category: CategoryEntity['id'];
      };
    }
  | {
      type: 'transfer-category';
      month: string;
      args: {
        amount: number;
        from: CategoryEntity['id'];
        to: CategoryEntity['id'];
      };
    }
  | {
      type: 'carryover';
      month: string;
      args: {
        category: CategoryEntity['id'];
        flag: boolean;
      };
    }
  | {
      type: 'reset-income-carryover';
      month: string;
      args?: never;
    }
  | {
      type: 'apply-single-category-template';
      month: string;
      args: {
        category: CategoryEntity['id'];
      };
    }
  | {
      type: 'apply-multiple-templates';
      month: string;
      args: {
        categories: Array<CategoryEntity['id']>;
      };
    }
  | {
      type: 'set-single-3-avg';
      month: string;
      args: {
        category: CategoryEntity['id'];
      };
    }
  | {
      type: 'set-single-6-avg';
      month: string;
      args: {
        category: CategoryEntity['id'];
      };
    }
  | {
      type: 'set-single-12-avg';
      month: string;
      args: {
        category: CategoryEntity['id'];
      };
    }
  | {
      type: 'copy-single-last';
      month: string;
      args: {
        category: CategoryEntity['id'];
      };
    };

export function useBudgetActions() {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ month, type, args }: ApplyBudgetActionPayload) => {
      switch (type) {
        case 'budget-amount':
          await send('budget/budget-amount', {
            month,
            category: args.category,
            amount: args.amount,
          });
          return null;
        case 'copy-last':
          await send('budget/copy-previous-month', { month });
          return null;
        case 'set-zero':
          await send('budget/set-zero', { month });
          return null;
        case 'set-3-avg':
          await send('budget/set-3month-avg', { month });
          return null;
        case 'set-6-avg':
          await send('budget/set-6month-avg', { month });
          return null;
        case 'set-12-avg':
          await send('budget/set-12month-avg', { month });
          return null;
        case 'check-templates':
          return await send('budget/check-templates');
        case 'apply-goal-template':
          return await send('budget/apply-goal-template', { month });
        case 'overwrite-goal-template':
          return await send('budget/overwrite-goal-template', { month });
        case 'apply-single-category-template':
          return await send('budget/apply-single-template', {
            month,
            category: args.category,
          });
        case 'cleanup-goal-template':
          return await send('budget/cleanup-goal-template', { month });
        case 'hold':
          await send('budget/hold-for-next-month', {
            month,
            amount: args.amount,
          });
          return null;
        case 'reset-hold':
          await send('budget/reset-hold', { month });
          return null;
        case 'cover-overspending':
          await send('budget/cover-overspending', {
            month,
            to: args.to,
            from: args.from,
          });
          return null;
        case 'transfer-available':
          await send('budget/transfer-available', {
            month,
            amount: args.amount,
            category: args.category,
          });
          return null;
        case 'cover-overbudgeted':
          await send('budget/cover-overbudgeted', {
            month,
            category: args.category,
          });
          return null;
        case 'transfer-category':
          await send('budget/transfer-category', {
            month,
            amount: args.amount,
            from: args.from,
            to: args.to,
          });
          return null;
        case 'carryover': {
          await send('budget/set-carryover', {
            startMonth: month,
            category: args.category,
            flag: args.flag,
          });
          return null;
        }
        case 'reset-income-carryover':
          await send('budget/reset-income-carryover', { month });
          return null;
        case 'apply-multiple-templates':
          return await send('budget/apply-multiple-templates', {
            month,
            categoryIds: args.categories,
          });
        case 'set-single-3-avg':
          await send('budget/set-n-month-avg', {
            month,
            N: 3,
            category: args.category,
          });
          return null;
        case 'set-single-6-avg':
          await send('budget/set-n-month-avg', {
            month,
            N: 6,
            category: args.category,
          });
          return null;
        case 'set-single-12-avg':
          await send('budget/set-n-month-avg', {
            month,
            N: 12,
            category: args.category,
          });
          return null;
        case 'copy-single-last':
          await send('budget/copy-single-month', {
            month,
            category: args.category,
          });
          return null;
        default:
          throw new Error(`Unknown budget action type: ${type}`);
      }
    },
    onSuccess: notification => {
      if (notification) {
        dispatch(
          addNotification({
            notification,
          }),
        );
      }
    },
    onError: error => {
      console.error('Error applying budget action:', error);
      dispatch(
        addNotification({
          notification: {
            id: uuidv4(),
            type: 'error',
            message: t(
              'There was an error applying the budget action. Please try again.',
            ),
          },
        }),
      );
      throw error;
    },
  });
}
