/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tourSidebar: [
    'tour/index',
    'tour/user-interface',
    'tour/budget',
    'tour/accounts',
    'tour/reports',
    'tour/schedules',
    'tour/payees',
    'tour/rules',
  ],
  docs: [
    'index',
    'vision',
    { type: 'ref', id: 'releases' }, // take release and upcoming release notes out of navigation as they're too long
    { type: 'ref', id: 'upcoming-release-notes' },
    {
      type: 'category',
      label: 'Getting Started with Actual',
      collapsible: false,
      className: 'no-indent',
      items: [
        'getting-started/envelope-budgeting',
        'getting-started/tracking-budget',
        'getting-started/roadmap-for-new-users',
        {
          type: 'doc',
          id: 'getting-started/starting-fresh',
          label: 'Getting Started', // Quick start guide will replace this eventually
        },
        'getting-started/tips-tricks',
      ],
    },

    {
      type: 'category',
      label: 'User Manual',
      collapsible: false,
      className: 'no-indent',
      items: [
        {
          type: 'category',
          label: 'Installation and Configuration',
          link: {
            type: 'doc',
            id: 'install/index',
          },
          items: [
            'getting-started/sync',
            {
              type: 'category',
              label: 'On Your Own Machine',
              collapsible: false,
              className: 'no-indent',
              items: [
                'install/desktop-app',
                {
                  type: 'doc',
                  id: 'getting-started/manage-files',
                  label: 'Managing Files on the Desktop App',
                },
                'install/docker',
                'install/cli-tool',
                'install/build-from-source',
              ],
            },

            {
              type: 'category',
              label: 'In the Cloud',
              collapsible: false,
              className: 'no-indent',
              items: ['install/pikapods', 'install/fly'],
            },
            {
              type: 'category',
              label: 'Configuration',
              collapsible: false,
              className: 'no-indent',
              items: [
                'config/index',
                'config/https',
                'config/reverse-proxies',
                'config/oauth-auth',
                'config/multi-user',
                'advanced/http-header-auth',
              ],
            },
          ],
        },
        // end of installation

        {
          type: 'category',
          label: 'Data Migration',
          link: {
            type: 'doc',
            id: 'migration/index',
          },
          items: ['migration/ynab4', 'migration/nynab'],
        },
        // end of migration

        {
          type: 'category',
          label: 'Accounts',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'accounts/index',
          },
          items: [
            {
              type: 'category',
              label: 'Managing Credit Cards',
              collapsible: true,
              link: {
                type: 'doc',
                id: 'budgeting/credit-cards/index',
              },
              items: [
                'budgeting/credit-cards/paying-in-full',
                'budgeting/credit-cards/carrying-debt',
              ],
            },
            'budgeting/joint-accounts',
            'accounts/reconciliation',
            {
              type: 'category',
              label: 'Connecting Your Bank',
              link: {
                type: 'doc',
                id: 'advanced/bank-sync',
              },
              items: [
                {
                  type: 'doc',
                  id: 'advanced/bank-sync/enable-banking',
                  label: 'Enable Banking - EU (experimental)',
                },
                'advanced/bank-sync/gocardless',
                'advanced/bank-sync/simplefin',
                'advanced/bank-sync/pluggyai',
              ],
            },
          ],
        },
        // end of accounts
        {
          type: 'category',
          label: 'Transactions',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'transactions/importing',
          },
          items: [
            'transactions/payees',            
            {
              type: 'category',
              label: 'Transfers',
              collapsed: true,
              link: {
                type: 'doc',
                id: 'transactions/transfers',
              },
              items: ['advanced/scripts/modify-transfers'],
            },
            'transactions/split-transactions',
            'transactions/tags',
            'schedules',
            {
              type: 'category',
              label: 'Rules',
              collapsed: true,
              link: {
                type: 'doc',
                id: 'budgeting/rules/index',
              },
              items: [
                'budgeting/rules/custom',
                {
                  type: 'ref',
                  id: 'experimental/formulas', // the primary link is in Reports
                  label: 'Excel Formula Mode - Rule Formulas (experimental)',
                },
              ],
            },            
            'transactions/filters',
            'transactions/merging',
            'transactions/bulk-editing',
            'budgeting/multi-currency',
          ],
        },
        // end of transactions

        {
          type: 'category',
          label: 'Budgeting',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'budgeting/index',
          },
          items: [
            'budgeting/categories',
            'budgeting/returns-and-reimbursements',
            {
              type: 'doc',
              id: 'experimental/budget-automation',
              label: 'Budget Automations (experimental)',
            },
            {
              type: 'doc',
              id: 'experimental/goal-templates',
              label: 'Notes-based Templates (experimental)',
            },
            {
              type: 'doc',
              id: 'experimental/monthly-cleanup',
              label: 'Notes-based Monthly Cleanup (experimental)',
            },
            {
              type: 'ref',
              id: 'getting-started/tracking-budget', // secondary link to tracking budget
            },
            'advanced/restart',
          ],
        },

        // End of Budgeting

        {
          type: 'category',
          label: 'Reports Dashboard',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'reports/index',
          },
          items: [
            'reports/custom-reports',
            {
              type: 'doc',
              id: 'experimental/formulas', // there is a secondary link above in Transactions/Rules and in Experimental below
              label: 'Excel Formula Mode - Formula Cards (experimental)',
            },
            {
              type: 'doc',
              id: 'experimental/balance-forecast-report',
              label: 'Balance Forecast Report (experimental)',
            },
            {
              type: 'doc',
              id: 'experimental/budget-analysis-report',
              label: 'Budget Analysis Report (experimental)',
            },
          ],
        },
        // end of Reports

        {
          type: 'category',
          label: 'Backup & Restore',
          collapsed: true,
          items: ['backup-restore/backup', 'backup-restore/restore'],
        },
        // end of Backup

        {
          type: 'category',
          label: 'Settings',
          collapsed: true,
          items: ['settings/index', 'custom-themes'],
        },
        // end of Settings

        {
          type: 'category',
          label: 'Experimental features',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'experimental/index',
          },
          items: [
            // Secondary links to documentation. Primary links above in navigation scheme.
            {
              type: 'ref',
              id: 'experimental/budget-automation',
              label: 'Budget Automations',
            },
            {
              type: 'ref',
              id: 'experimental/goal-templates',
              label: 'Notes-based Templates',
            },
            {
              type: 'ref',
              id: 'experimental/monthly-cleanup',
              label: 'Notes-based Monthly Cleanup',
            },
            {
              type: 'ref',
              id: 'experimental/formulas',
              label: 'Excel Formula Mode - Formula Cards & Rule Formulas',
            },
            {
              type: 'ref',
              id: 'experimental/balance-forecast-report',
              label: 'Balance Forecast Report',
            },
            {
              type: 'ref',
              id: 'experimental/budget-analysis-report',
              label: 'Budget Analysis Report',
            },
            'experimental/rule-templating', // this has been deprecated, but leaving here for the notice.
          ],
        },
        // end of Experimental
      ],
    },

    {
      type: 'category',
      label: 'Help & Support',
      collapsible: false,
      className: 'no-indent',
      items: [
        'faq',
        {
          type: 'category',
          label: 'Troubleshooting',
          collapsed: true,
          items: [
            'troubleshooting/server',
            'troubleshooting/shared-array-buffer',
            'troubleshooting/reset_password',
            'troubleshooting/edge-browser',
          ],
        },
        'community-repos',
        {
          type: 'category',
          label: 'API',
          link: { type: 'doc', id: 'api/index' },
          items: [
            'api/reference',
            'api/cli',
            {
              type: 'category',
              label: 'ActualQL',
              collapsed: true,
              link: {
                type: 'doc',
                id: 'api/actual-ql/index',
              },
              items: ['api/actual-ql/functions', 'api/actual-ql/examples'],
            },
          ],
        },
        'actual-server-repo-move',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      link: {
        type: 'doc',
        id: 'contributing/index',
      },
      collapsed: true,
      items: [
        {
          type: 'link',
          label: 'Open Bug Reports',
          href: 'https://github.com/actualbudget/actual/issues',
        },
        {
          type: 'link',
          label: 'Feature Requests',
          href: 'https://github.com/actualbudget/actual/issues?q=label%3A%22needs+votes%22+sort%3Areactions-%2B1-desc+',
        },
        {
          type: 'category',
          label: 'The Actual Project Structure',
          link: {
            type: 'doc',
            id: 'contributing/project-details/index',
          },
          items: [
            'contributing/project-details/database',
            'contributing/project-details/architecture',
            'contributing/project-details/feature-flags',
            'contributing/project-details/electron',
            'contributing/project-details/migrations',
            'contributing/project-details/advice',
          ],
        },
        'contributing/ai-usage-policy',
        'contributing/development-setup',
        'contributing/testing',
        'contributing/code-style',
        'contributing/troubleshooting',
        'contributing/i18n',
        'contributing/preview-builds',
        'contributing/releasing',
        'contributing/windows',
        {
          type: 'category',
          label: 'Documentation',
          collapsible: false,
          className: 'no-indent',
          items: ['contributing/writing-docs'],
        },
        {
          type: 'category',
          label: 'Project Leadership',
          collapsible: false,
          className: 'no-indent',
          items: [
            'contributing/leadership/funding',
            'contributing/leadership/triaging-issues',
            'contributing/leadership/new-core-contributors-guide',
            'contributing/leadership/architecture-decision-records',
            'contributing/leadership/cursor-ide',
            'contributing/leadership/paying-contributors',
          ],
        },
      ],
    },
  ],
};
module.exports = sidebars;
