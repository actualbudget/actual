import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Plain-language definitions for the budgeting vocabulary used throughout the
 * app. New users hover a highlighted term (see `<Term />`) to read these, so
 * every definition should be short, avoid jargon, and explain what the
 * number or feature means for *them*.
 */
export const GLOSSARY_TERM_IDS = [
  'account',
  'on-budget',
  'off-budget',
  'category',
  'category-group',
  'budgeted',
  'spent',
  'balance',
  'received',
  'to-budget',
  'overbudgeted',
  'available-funds',
  'overspent-last-month',
  'budgeted-this-month',
  'for-next-month',
  'income',
  'expenses',
  'saved',
  'projected-savings',
  'carryover',
  'payee',
  'transfer',
  'cleared',
  'reconcile',
  'uncategorized',
  'split-transaction',
  'schedule',
  'schedule-status',
  'rule',
  'tag',
  'import',
  'bank-sync',
  'net-worth',
  'cash-flow',
  'envelope-budgeting',
  'tracking-budgeting',
  'dashboard-widget',
  'hold',
] as const;

export type GlossaryTermId = (typeof GLOSSARY_TERM_IDS)[number];

export type GlossaryEntry = {
  /** Short human readable name of the term, e.g. "Budgeted". */
  title: string;
  /** One or two sentences explaining the term in plain language. */
  definition: string;
  /** Optional short tip on what the user can do with it. */
  tip?: string;
  /** Optional documentation link for users who want the full story. */
  learnMore?: string;
};

const DOCS = 'https://actualbudget.org/docs';

export function useGlossary(): Record<GlossaryTermId, GlossaryEntry> {
  const { t } = useTranslation();

  return useMemo(
    () => ({
      account: {
        title: t('Account'),
        definition: t(
          'A place your money lives, like a checking account, savings account, credit card, or cash in your wallet. Every transaction belongs to an account.',
        ),
        tip: t(
          'Add one account for each real-world account you want to track.',
        ),
        learnMore: `${DOCS}/accounts/`,
      },
      'on-budget': {
        title: t('On budget'),
        definition: t(
          'Money you can spend day to day, such as checking, savings and credit cards. The balances of these accounts are the money you assign to your budget categories.',
        ),
        learnMore: `${DOCS}/accounts/#on-budget-vs-off-budget`,
      },
      'off-budget': {
        title: t('Off budget'),
        definition: t(
          'Accounts you want to keep an eye on but not spend from, like a mortgage, a house, or retirement investments. They count towards your net worth but not your budget.',
        ),
        learnMore: `${DOCS}/accounts/#on-budget-vs-off-budget`,
      },
      category: {
        title: t('Category'),
        definition: t(
          'A label for what a transaction was for, like Groceries, Rent or Salary. Categories are the rows of your budget.',
        ),
        learnMore: `${DOCS}/budgeting/categories`,
      },
      'category-group': {
        title: t('Category group'),
        definition: t(
          'A heading that bundles related categories together, like "Bills" for Rent, Electricity and Phone. Groups show the totals of the categories inside them.',
        ),
        learnMore: `${DOCS}/budgeting/categories`,
      },
      budgeted: {
        title: t('Budgeted'),
        definition: t(
          'The amount you decided to set aside for this category this month. Click the number to change it — it is your plan, not what you have spent.',
        ),
        learnMore: `${DOCS}/getting-started/envelope-budgeting`,
      },
      spent: {
        title: t('Spent'),
        definition: t(
          'The total of all transactions in this category this month. Spending shows as a negative number.',
        ),
      },
      balance: {
        title: t('Balance'),
        definition: t(
          'What is left in the category: the amount budgeted, plus anything carried over from last month, minus what you spent. A red balance means you spent more than you planned.',
        ),
        learnMore: `${DOCS}/getting-started/envelope-budgeting`,
      },
      received: {
        title: t('Received'),
        definition: t(
          'Income that has actually arrived in your accounts this month for this category, such as your salary.',
        ),
      },
      'to-budget': {
        title: t('To budget'),
        definition: t(
          'Money in your on-budget accounts that you have not assigned to a category yet. Aim for zero so that every dollar has a job.',
        ),
        tip: t(
          'If it is negative you assigned more than you have — reduce some category amounts.',
        ),
        learnMore: `${DOCS}/getting-started/envelope-budgeting`,
      },
      overbudgeted: {
        title: t('Overbudgeted'),
        definition: t(
          'You have assigned more money to categories than you actually have. Lower some budgeted amounts until this is back to zero.',
        ),
        learnMore: `${DOCS}/getting-started/envelope-budgeting`,
      },
      'available-funds': {
        title: t('Available funds'),
        definition: t(
          'All the money you can assign this month: income received this month plus whatever was left unassigned at the end of last month.',
        ),
      },
      'overspent-last-month': {
        title: t('Overspent last month'),
        definition: t(
          "Categories that went negative last month. That shortfall is taken out of this month's available funds so your budget stays honest.",
        ),
      },
      'budgeted-this-month': {
        title: t('Budgeted this month'),
        definition: t(
          'The total you have assigned to all categories this month.',
        ),
      },
      'for-next-month': {
        title: t('Set aside for next month'),
        definition: t(
          "Money you have already assigned to next month's budget. It is not available to spend this month.",
        ),
      },
      income: {
        title: t('Income'),
        definition: t(
          'Money coming in, like salary, interest or refunds. Income categories live at the bottom of the budget.',
        ),
      },
      expenses: {
        title: t('Expenses'),
        definition: t(
          'Money going out — everything you spend, from rent and groceries to the occasional coffee.',
        ),
      },
      saved: {
        title: t('Saved'),
        definition: t(
          'Income received minus money spent this month. A positive number means you ended the month with more than you started.',
        ),
      },
      'projected-savings': {
        title: t('Projected savings'),
        definition: t(
          'What you would save if the month goes to plan: budgeted income minus budgeted expenses.',
        ),
      },
      carryover: {
        title: t('Carryover'),
        definition: t(
          "When a category ends the month with money left over, that amount rolls into next month's balance so you can keep saving towards bigger purchases.",
        ),
      },
      payee: {
        title: t('Payee'),
        definition: t(
          'Who you paid or who paid you, like a shop, employer or friend. Payees help you find transactions and power rules that categorize them automatically.',
        ),
        learnMore: `${DOCS}/transactions/payees`,
      },
      transfer: {
        title: t('Transfer'),
        definition: t(
          'Moving money between two of your own accounts, like paying a credit card from checking. Transfers are not income or expenses, so they do not need a category.',
        ),
        learnMore: `${DOCS}/transactions/transfers`,
      },
      cleared: {
        title: t('Cleared'),
        definition: t(
          'A transaction your bank has processed. Tick the checkmark once it appears on your bank statement so you can spot anything still pending.',
        ),
        learnMore: `${DOCS}/transactions/reconciliation`,
      },
      reconcile: {
        title: t('Reconcile'),
        definition: t(
          'Compare your account to your bank statement so they match. Enter the balance from your statement and the app shows the difference.',
        ),
        learnMore: `${DOCS}/transactions/reconciliation`,
      },
      uncategorized: {
        title: t('Uncategorized'),
        definition: t(
          'Transactions that do not have a category yet. They are not counted in your budget until you pick one.',
        ),
      },
      'split-transaction': {
        title: t('Split transaction'),
        definition: t(
          'One purchase divided across several categories, like a supermarket trip that was part groceries and part household items.',
        ),
        learnMore: `${DOCS}/transactions/splits`,
      },
      schedule: {
        title: t('Schedule'),
        definition: t(
          'A recurring transaction you expect, like rent, a salary or a subscription. The app shows upcoming ones, warns you when they are missed, and can enter them automatically.',
        ),
        learnMore: `${DOCS}/schedules`,
      },
      'schedule-status': {
        title: t('Schedule status'),
        definition: t(
          'Upcoming: expected in the next few days. Due: expected today. Missed: the date passed without a matching transaction. Completed: the schedule has finished.',
        ),
        learnMore: `${DOCS}/schedules`,
      },
      rule: {
        title: t('Rule'),
        definition: t(
          'An automatic edit applied to matching transactions, like "if the payee contains Netflix, set the category to Entertainment". Rules save time when importing.',
        ),
        learnMore: `${DOCS}/budgeting/rules`,
      },
      tag: {
        title: t('Tag'),
        definition: t(
          "A word starting with # that you add to a transaction's notes, like #holiday, so you can filter and report on it across categories.",
        ),
        learnMore: `${DOCS}/transactions/tags`,
      },
      import: {
        title: t('Import'),
        definition: t(
          'Bring in transactions from a file downloaded from your bank. CSV, OFX, QFX, QIF and CAMT files are supported.',
        ),
        learnMore: `${DOCS}/transactions/importing`,
      },
      'bank-sync': {
        title: t('Bank sync'),
        definition: t(
          'Connect an account to your bank so new transactions download automatically. Requires a sync server.',
        ),
        learnMore: `${DOCS}/advanced/bank-sync`,
      },
      'net-worth': {
        title: t('Net worth'),
        definition: t(
          'Everything you own minus everything you owe — the total of all your account balances, including off-budget accounts.',
        ),
        learnMore: `${DOCS}/reports/`,
      },
      'cash-flow': {
        title: t('Cash flow'),
        definition: t(
          'Money in versus money out over a period of time. Positive cash flow means you earned more than you spent.',
        ),
        learnMore: `${DOCS}/reports/`,
      },
      'envelope-budgeting': {
        title: t('Envelope budgeting'),
        definition: t(
          'You only budget money you already have. Each category is an envelope: assign money to it, spend from it, and carry leftovers forward.',
        ),
        learnMore: `${DOCS}/getting-started/envelope-budgeting`,
      },
      'tracking-budgeting': {
        title: t('Tracking budget'),
        definition: t(
          'Budgeted amounts are targets for the month rather than envelopes of real money. Compare what you planned with what actually happened.',
        ),
        learnMore: `${DOCS}/getting-started/tracking-budget`,
      },
      'dashboard-widget': {
        title: t('Dashboard widget'),
        definition: t(
          'A card on the reports dashboard showing one chart or number. Add, resize and rearrange widgets to build the overview you want.',
        ),
        learnMore: `${DOCS}/reports/`,
      },
      hold: {
        title: t('Hold for next month'),
        definition: t(
          "Keep some of this month's unassigned money aside so it becomes available next month instead of now.",
        ),
      },
    }),
    [t],
  );
}
