import { Trans } from 'react-i18next';
import type { Step } from 'react-joyride';

import * as monthUtils from '@actual-app/core/shared/months';

import { Link } from '#components/common/Link';

import type { TourId } from './TourProvider';

export const ADD_ACCOUNT_STEP_ID = 'add-account';
export const IMPORT_STEP_ID = 'import-transactions';
export const ADD_SCHEDULE_STEP_ID = 'add-schedule';

export type TourStepDeps = {
  navigate: (to: string) => void;
  /** Translation function for the chapter names. */
  t: (key: string) => string;
  budgetType: 'envelope' | 'tracking';
  /** The account the "add transactions" chapter should open, if any. */
  firstAccountId?: string;
  /** Whether the file is connected to a sync server (enables bank sync). */
  hasServer?: boolean;
};

/** Extra data attached to every step, read by the tooltip. */
export type TourStepData = {
  /** Chapter name shown above the step title. */
  chapter: string;
  /**
   * The step invites the user to click the highlighted element. The tour
   * keeps running while they do, so the tooltip shows "Do it later" rather
   * than "Next".
   */
  interactive?: boolean;
};

function getDisplayedMonths(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-testid="selected-budget-month"]',
    ),
  )
    .map(element => element.dataset.month)
    .filter((month): month is string => Boolean(month));
}

// The budget summaries strip also renders the month before and after the
// displayed months (clipped by its container) so it can animate between
// months, so a summary being in the DOM does not mean it is on screen. Only
// target the current month while the month picker shows it as displayed, and
// otherwise fall back to the first displayed month.
export function findBudgetSummary(): HTMLElement | null {
  const displayedMonths = getDisplayedMonths();
  const currentMonth = monthUtils.currentMonth();
  const month =
    displayedMonths.length === 0 || displayedMonths.includes(currentMonth)
      ? currentMonth
      : displayedMonths[0];

  return (
    document.querySelector<HTMLElement>(
      `[data-testid="budget-summary"][data-month="${month}"]`,
    ) ?? document.querySelector<HTMLElement>('[data-testid="budget-summary"]')
  );
}

// Pages can take a moment to load their data after navigating, so give them
// a generous wait. Must resolve within the `beforeTimeout` configured in
// TourHost.
export const NAVIGATION_WAIT_MS = 12000;

function waitForElement(
  selector: string,
  timeoutMs = NAVIGATION_WAIT_MS,
): Promise<void> {
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

function goTo(navigate: TourStepDeps['navigate'], path: string) {
  if (window.location.pathname !== path) {
    navigate(path);
  }
}

function chapter(name: string, interactive = false): { data: TourStepData } {
  return { data: { chapter: name, interactive } };
}

/**
 * Chapter 1: a lay of the land. Where things are, how to add the first
 * account, and where to find help.
 */
function getWelcomeTourSteps({ navigate, t }: TourStepDeps): Step[] {
  const ch = t('Getting started');
  return [
    {
      id: 'welcome',
      target: 'body',
      placement: 'center',
      ...chapter(ch),
      title: <Trans>Welcome to {{ appName: 'Actual' }}!</Trans>,
      content: (
        <Trans>
          {{ appName: 'Actual' }} helps you see exactly where your money goes.
          This guide is split into short chapters, each one focused on a single
          thing: finding your way around, adding transactions, planning your
          budget, and so on. You can stop at any time and pick up where you left
          off from the <strong>Getting started</strong> checklist.
        </Trans>
      ),
    },
    {
      id: 'sidebar-navigation',
      target: '[data-testid="sidebar-primary-buttons"]',
      placement: 'right',
      ...chapter(ch),
      before: async () => {
        goTo(navigate, '/budget');
        await waitForElement('[data-testid="sidebar-primary-buttons"]');
      },
      title: <Trans>The main pages</Trans>,
      content: (
        <Trans>
          <strong>Budget</strong> is where you plan each month's spending.{' '}
          <strong>Reports</strong> turns your transactions into charts.{' '}
          <strong>Schedules</strong> keeps track of bills and income that
          repeat. Less frequently used pages, like payees and rules, live in{' '}
          <strong>Settings</strong>.
        </Trans>
      ),
    },
    {
      id: 'sidebar-accounts',
      target: '[data-testid="sidebar-accounts"]',
      placement: 'right',
      ...chapter(ch),
      title: <Trans>Your accounts</Trans>,
      content: (
        <Trans>
          Every transaction belongs to an account, like your checking account,
          savings or a credit card. <strong>On budget</strong> accounts hold the
          money you plan with; <strong>off budget</strong> accounts (like a
          mortgage or investments) are only tracked. Click an account to see its
          transactions.
        </Trans>
      ),
    },
    {
      id: ADD_ACCOUNT_STEP_ID,
      target: '[data-testid="sidebar-add-account"]',
      placement: 'right',
      spotlightPadding: 4,
      ...chapter(ch, true),
      title: <Trans>Add your first account</Trans>,
      content: (
        <Trans>
          Start with the account you use most, like your everyday checking
          account. Click <strong>Add account</strong> now and fill in a name and
          the current balance — the guide will wait for you and continue when
          you are done.
        </Trans>
      ),
    },
    {
      id: 'help-menu',
      target: '[data-testid="help-menu-button"]',
      placement: 'bottom-end',
      ...chapter(ch),
      title: <Trans>Help is always nearby</Trans>,
      content: (
        <Trans>
          Replay any chapter of this guide, read the documentation or ask the
          community from the Help menu. Hover any{' '}
          <span style={{ textDecoration: 'underline dotted' }}>
            dotted term
          </span>{' '}
          in the app to see what it means.
        </Trans>
      ),
    },
    {
      id: 'next-steps',
      target: 'body',
      placement: 'center',
      ...chapter(ch),
      title: <Trans>What's next</Trans>,
      content: (
        <Trans>
          That's the layout. The <strong>Getting started</strong> checklist in
          the corner walks you through the rest one step at a time: adding
          transactions, planning your budget, scheduling bills and exploring
          reports. Each step opens a short guide like this one.
        </Trans>
      ),
    },
  ];
}

/**
 * Chapter 2: getting transactions in, either by importing a bank file,
 * connecting a bank, or typing them in.
 */
function getAccountsTourSteps({
  navigate,
  t,
  firstAccountId,
  hasServer,
}: TourStepDeps): Step[] {
  const ch = t('Add transactions');
  const accountPath = firstAccountId
    ? `/accounts/${firstAccountId}`
    : '/accounts';

  return [
    {
      id: 'account-page',
      target: '[data-testid="account-name"]',
      placement: 'bottom-start',
      ...chapter(ch),
      before: async () => {
        goTo(navigate, accountPath);
        await waitForElement('[data-testid="account-name"]');
      },
      title: <Trans>This is an account</Trans>,
      content: firstAccountId ? (
        <Trans>
          Each account page lists its transactions with the running balance at
          the top. Everything you do with transactions — importing, adding,
          categorizing — happens here.
        </Trans>
      ) : (
        <Trans>
          This page lists transactions from all of your accounts. Once you have
          added an account, its own page looks just like this one.
        </Trans>
      ),
    },
    {
      id: IMPORT_STEP_ID,
      target: '[data-testid="import-transactions-button"]',
      placement: 'bottom-end',
      ...chapter(ch, true),
      title: <Trans>Import a file from your bank</Trans>,
      content: (
        <Trans>
          The quickest way to get going is to download a statement from your
          bank's website (CSV, OFX, QFX, QIF or CAMT) and click{' '}
          <strong>Import</strong>. You will get a preview and can map the
          columns before anything is saved. Try it now, or continue and come
          back later.
        </Trans>
      ),
    },
    ...(hasServer
      ? [
          {
            id: 'bank-sync',
            target: '[data-testid="account-actions"]',
            placement: 'bottom-end' as const,
            ...chapter(ch),
            title: <Trans>Or connect your bank</Trans>,
            content: (
              <Trans>
                Because this file is connected to a server, you can also link
                accounts to your bank so new transactions download
                automatically. Open the account menu (⋯) and choose{' '}
                <strong>Link account</strong>.{' '}
                <Link
                  variant="external"
                  to="https://actualbudget.org/docs/advanced/bank-sync"
                >
                  Learn more
                </Link>
              </Trans>
            ),
          },
        ]
      : []),
    {
      id: 'add-transaction',
      target: '[data-testid="add-transaction-button"]',
      placement: 'bottom-end',
      ...chapter(ch),
      title: <Trans>Or add one by hand</Trans>,
      content: (
        <Trans>
          Cash purchases and anything your bank does not export can be typed in.
          Click <strong>Add transaction</strong>, fill in the date, payee,
          category and amount, then press Enter.
        </Trans>
      ),
    },
    {
      id: 'transactions-table',
      target: '[data-testid="transaction-table-header"]',
      placement: 'bottom',
      ...chapter(ch),
      title: <Trans>Reading the list</Trans>,
      content: (
        <Trans>
          Each row is one transaction. <strong>Payee</strong> is who you paid,{' '}
          <strong>Category</strong> is what it was for (this is what your budget
          uses), and the checkmark column marks transactions that have cleared
          your bank. Click any cell to edit it.
        </Trans>
      ),
    },
    {
      id: 'accounts-done',
      target: 'body',
      placement: 'center',
      ...chapter(ch),
      title: <Trans>Tip: rules save time</Trans>,
      content: (
        <Trans>
          Once you have a few transactions, open{' '}
          <strong>Settings → Rules</strong> to teach the app things like "Kroger
          is always Groceries". Future imports are then categorized for you.
        </Trans>
      ),
    },
  ];
}

/**
 * Chapter 3: the budget page itself.
 */
function getBudgetTourSteps({ navigate, t, budgetType }: TourStepDeps): Step[] {
  const ch = t('Plan your budget');
  return [
    {
      id: 'budget-table',
      target: '[data-testid="budget-table"]',
      scrollTarget: '[data-testid="budget-table-scroll-container"]',
      placement: 'center',
      ...chapter(ch),
      before: async () => {
        goTo(navigate, '/budget');
        await waitForElement('[data-testid="budget-table"]');
      },
      title: <Trans>Your budget</Trans>,
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
            title: <Trans>Saved this month</Trans>,
            content: (
              <Trans>
                The summary compares what you earned and spent with what you
                planned, and shows how much you saved. Rather than rolling funds
                over, a tracking budget plans each month on its own.
              </Trans>
            ),
          }
        : {
            title: <Trans>Left to budget</Trans>,
            content: (
              <Trans>
                This is the money in your accounts that you have not given a job
                yet. Aim to bring it to zero by assigning it to categories. The
                rows underneath show exactly how it is calculated.
              </Trans>
            ),
          }),
      id: 'budget-summary',
      target: findBudgetSummary,
      placement: 'left',
      ...chapter(ch),
    },
    {
      id: 'category',
      target: '[data-testid="category-name"]',
      placement: 'bottom-start',
      ...chapter(ch),
      title: <Trans>Categories</Trans>,
      content: (
        <Trans>
          Each row is a category — a job for your money, like Groceries or Rent.
          Related categories sit under a group heading. Right-click a category
          to rename, hide or delete it.
        </Trans>
      ),
    },
    {
      id: 'budgeted-cell',
      target: '[data-testid="budget"]',
      placement: 'bottom',
      ...chapter(ch, true),
      title: <Trans>Assign money</Trans>,
      content:
        budgetType === 'tracking' ? (
          <Trans>
            Click a <strong>Budgeted</strong> amount and type what you plan to
            spend this month. <strong>Spent</strong> fills in from your
            transactions, and <strong>Balance</strong> shows how far you are
            from the target.
          </Trans>
        ) : (
          <Trans>
            Click a <strong>Budgeted</strong> amount and type how much to set
            aside this month. <strong>Spent</strong> fills in from your
            transactions, and <strong>Balance</strong> is what is left in the
            envelope. Try it now if you like.
          </Trans>
        ),
    },
    {
      id: 'month-picker',
      target: '[data-testid="selected-budget-month"]',
      placement: 'bottom',
      ...chapter(ch),
      title: <Trans>Month by month</Trans>,
      content: (
        <Trans>
          Every month gets its own budget. Use the month strip to move between
          months, and the <strong>Months</strong> control to see several side by
          side. The ⋯ menu on the summary can copy last month's budget to save
          you typing.
        </Trans>
      ),
    },
  ];
}

/**
 * Chapter 4: recurring bills and income.
 */
function getSchedulesTourSteps({ navigate, t }: TourStepDeps): Step[] {
  const ch = t('Schedule bills & income');
  return [
    {
      id: 'schedules-page',
      target: '[data-testid="schedules-toolbar"]',
      placement: 'bottom',
      ...chapter(ch),
      before: async () => {
        goTo(navigate, '/schedules');
        await waitForElement('[data-testid="schedules-toolbar"]');
      },
      title: <Trans>Schedules</Trans>,
      content: (
        <Trans>
          A schedule is a transaction you expect to repeat, like rent, a salary
          or a subscription. Scheduled transactions show up in your accounts
          before they happen, so you always know what is coming.
        </Trans>
      ),
    },
    {
      id: ADD_SCHEDULE_STEP_ID,
      target: '[data-testid="add-schedule-button"]',
      placement: 'bottom-end',
      ...chapter(ch, true),
      title: <Trans>Add a schedule</Trans>,
      content: (
        <Trans>
          Click <strong>Add new schedule</strong> and enter the payee, amount
          and how often it repeats. When a matching transaction arrives, the app
          links it to the schedule automatically.
        </Trans>
      ),
    },
    {
      id: 'find-schedules',
      target: '[data-testid="find-schedules-button"]',
      placement: 'bottom',
      ...chapter(ch),
      title: <Trans>Let the app find them</Trans>,
      content: (
        <Trans>
          Already imported a few months of transactions? Open the page menu and
          choose <strong>Find schedules</strong> to look for payments that
          repeat and turn them into schedules.
        </Trans>
      ),
    },
    {
      id: 'schedule-status',
      target: '[data-testid="table"]',
      placement: 'top',
      ...chapter(ch),
      title: <Trans>Keeping track</Trans>,
      content: (
        <Trans>
          The <strong>Status</strong> column tells you where each schedule
          stands: <strong>Upcoming</strong>, <strong>Due</strong> today, or{' '}
          <strong>Missed</strong> when no matching transaction arrived. Use the
          ⋯ menu on a row to post it, skip it or mark it complete.
        </Trans>
      ),
    },
  ];
}

/**
 * Chapter 5: the reports dashboard.
 */
function getReportsTourSteps({ navigate, t }: TourStepDeps): Step[] {
  const ch = t('Explore reports');
  return [
    {
      id: 'reports-dashboard',
      // Highlight the first widget, or the toolbar when the dashboard is
      // empty.
      target: () =>
        document.querySelector<HTMLElement>('[data-testid="report-card"]') ??
        document.querySelector<HTMLElement>(
          '[data-testid="add-widget-button"]',
        ),
      placement: 'bottom',
      ...chapter(ch),
      before: async () => {
        goTo(navigate, '/reports');
        await waitForElement('[data-testid="add-widget-button"]');
      },
      title: <Trans>Your dashboard</Trans>,
      content: (
        <Trans>
          Reports are built from your transactions, so they get more useful as
          you add data. Each card is a widget: click one to open the full
          report, change the date range and dig into the numbers.
        </Trans>
      ),
    },
    {
      id: 'add-widget',
      target: '[data-testid="add-widget-button"]',
      placement: 'bottom-end',
      ...chapter(ch),
      title: <Trans>Add widgets</Trans>,
      content: (
        <Trans>
          Pick from net worth, cash flow, spending, a transaction calendar and
          more — or build a custom report with exactly the categories and
          accounts you care about.
        </Trans>
      ),
    },
    {
      id: 'edit-dashboard',
      target: '[data-testid="edit-dashboard-button"]',
      placement: 'bottom-end',
      ...chapter(ch),
      title: <Trans>Make it yours</Trans>,
      content: (
        <Trans>
          <strong>Edit dashboard</strong> lets you drag widgets around and
          resize them. You can also create several dashboards, for example one
          for everyday spending and one for the long-term picture.
        </Trans>
      ),
    },
  ];
}

const tourSteps: Record<TourId, (deps: TourStepDeps) => Step[]> = {
  'welcome-tour': getWelcomeTourSteps,
  'accounts-tour': getAccountsTourSteps,
  'budget-tour': getBudgetTourSteps,
  'schedules-tour': getSchedulesTourSteps,
  'reports-tour': getReportsTourSteps,
};

export function getTourSteps(tourId: TourId, deps: TourStepDeps): Step[] {
  return tourSteps[tourId](deps);
}
