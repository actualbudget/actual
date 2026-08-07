import { Trans } from 'react-i18next';
import type { Step } from 'react-joyride';

import * as monthUtils from '@actual-app/core/shared/months';

import { Link } from '#components/common/Link';

import type { TourId } from './TourProvider';

export const ADD_ACCOUNT_STEP_ID = 'add-account';

export type TourStepDeps = {
  navigate: (to: string) => void;
  budgetType: 'envelope' | 'tracking';
};

function findBudgetSummary(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(
      `[data-testid="budget-summary"][data-month="${monthUtils.currentMonth()}"]`,
    ) ?? document.querySelector<HTMLElement>('[data-testid="budget-summary"]')
  );
}

// Must resolve within joyride's 5s beforeTimeout
function waitForElement(selector: string, timeoutMs = 4000): Promise<void> {
  return new Promise(resolve => {
    const start = Date.now();
    function check() {
      if (document.querySelector(selector) || Date.now() - start > timeoutMs) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    }
    check();
  });
}

function getBudgetTourSteps({ navigate, budgetType }: TourStepDeps): Step[] {
  return [
    {
      id: 'welcome',
      target: 'body',
      placement: 'center',
      title: <Trans>Welcome to {{ appName: 'Actual' }}!</Trans>,
      content: (
        <Trans>
          {{ appName: 'Actual' }} is a budgeting app that helps you understand
          exactly where your money goes. This short tour walks you through the
          basics. It only takes a couple of minutes, and you can leave at any
          time and replay it later from the Help menu.
        </Trans>
      ),
    },
    {
      id: 'budget-table',
      target: '[data-testid="budget-table"]',
      scrollTarget: '[data-testid="budget-table-scroll-container"]',
      placement: 'center',
      before: async () => {
        if (window.location.pathname !== '/budget') {
          navigate('/budget');
        }
        await waitForElement('[data-testid="budget-table"]');
      },
      title: <Trans>Your Budget</Trans>,
      content:
        budgetType === 'tracking' ? (
          <Trans>
            In a tracking budget, the amounts you budget are targets for your
            income and spending rather than envelopes of money. This approach is
            called{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/getting-started/tracking-budget"
            >
              tracking budgeting
            </Link>
            . If you prefer, you can switch to{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/getting-started/envelope-budgeting"
            >
              envelope budgeting
            </Link>{' '}
            in the settings.
          </Trans>
        ) : (
          <Trans>
            Categories in {{ appName: 'Actual' }} work like virtual envelopes:
            you assign the money you already have to them, then spend from each
            envelope. This approach is called{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/getting-started/envelope-budgeting"
            >
              envelope budgeting
            </Link>
            . If you prefer, you can switch to{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/getting-started/tracking-budget"
            >
              tracking budgeting
            </Link>{' '}
            in the settings.
          </Trans>
        ),
    },
    {
      ...(budgetType === 'tracking'
        ? {
            title: <Trans>Saved This Month</Trans>,
            content: (
              <Trans>
                This summary compares your income and expenses to show how much
                you saved this month. Rather than rolling funds over, a tracking
                budget plans each month on its own.
              </Trans>
            ),
          }
        : {
            title: <Trans>To Budget</Trans>,
            content: (
              <Trans>
                The <strong>To Budget</strong> amount shows the money you have
                not assigned to a category yet. Aim to bring it to zero, so that
                all of your money has a job.
              </Trans>
            ),
          }),
      id: 'budget-summary',
      target: findBudgetSummary,
      placement: 'bottom',
    },
    {
      id: 'category',
      target: '[data-testid="category-name"]',
      placement: 'bottom',
      title: <Trans>Categories</Trans>,
      content: (
        <Trans>
          Each row in the budget is a category. Click the{' '}
          <strong>Budgeted</strong> amount to assign money to a category, and
          keep an eye on the <strong>Balance</strong> column to see how much is
          left to spend.
        </Trans>
      ),
    },
    {
      id: 'month-picker',
      target: '[data-testid="selected-budget-month"]',
      placement: 'bottom',
      title: <Trans>Month by Month</Trans>,
      content: (
        <Trans>
          Every month gets its own budget. Use the month picker to move between
          months, and the calendar icons on the left to choose how many months
          are shown side by side.
        </Trans>
      ),
    },
    {
      id: 'sidebar-navigation',
      target: '[data-testid="sidebar-primary-buttons"]',
      placement: 'right',
      title: <Trans>Getting Around</Trans>,
      content: (
        <Trans>
          The sidebar takes you to your budget, reports, and scheduled
          transactions. You can find payees, rules, and the settings under{' '}
          <strong>More</strong>.
        </Trans>
      ),
    },
    {
      id: ADD_ACCOUNT_STEP_ID,
      target: '[data-testid="sidebar-add-account"]',
      placement: 'right',
      title: <Trans>Add Your Accounts</Trans>,
      content: (
        <Trans>
          Transactions live in accounts, so adding your first account is the
          best way to get started with {{ appName: 'Actual' }}. Click here to
          add one. You can enter transactions yourself, or{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/advanced/bank-sync"
          >
            link the account to your bank
          </Link>{' '}
          to import them automatically.
        </Trans>
      ),
    },
    {
      id: 'help-menu',
      target: '[data-testid="help-menu-button"]',
      placement: 'bottom-end',
      title: <Trans>Getting Help</Trans>,
      content: (
        <Trans>
          The Help menu is always here when you need it. Use it to replay this
          tour, browse the documentation, or ask the community on Discord.
        </Trans>
      ),
    },
  ];
}

const tourSteps: Record<TourId, (deps: TourStepDeps) => Step[]> = {
  'budget-tour': getBudgetTourSteps,
};

export function getTourSteps(tourId: TourId, deps: TourStepDeps): Step[] {
  return tourSteps[tourId](deps);
}
