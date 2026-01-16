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
  docs: [
    'index',
    'vision',
    'releases',
    {
      type: 'category',
      label: 'A Tour of Actual',
      link: {
        type: 'doc',
        id: 'tour/index',
      },
      items: [
        'tour/user-interface',
        'tour/budget',
        'tour/accounts',
        'tour/reports',
        'tour/schedules',
        'tour/payees',
        'tour/rules',
      ],
    },
    {
      type: 'category',
      label: 'Getting Started',
      collapsible: false,
      className: 'no-indent',
      items: [
        'getting-started/roadmap-for-new-users',
        'getting-started/envelope-budgeting',
        'getting-started/tracking-budget',
        {
          type: 'category',
          label: 'Installation and Configuration',
          link: {
            type: 'doc',
            id: 'install/index',
          },
          items: [
            {
              type: 'category',
              label: 'On Your Own Machine',
              collapsible: false,
              className: 'no-indent',
              items: [
                'install/docker',
                'install/cli-tool',
                'install/desktop-app',
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

        {
          type: 'category',
          label: 'Migration',
          link: {
            type: 'doc',
            id: 'migration/index',
          },
          items: ['migration/ynab4', 'migration/nynab'],
        },
      ],
    },

    {
      type: 'category',
      label: 'Using Actual',
      collapsible: false,
      className: 'no-indent',
      items: [
        'getting-started/starting-fresh',
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
            'budgeting/multi-currency',
            'budgeting/joint-accounts',
            'advanced/restart',
          ],
        },

        // End of Budgeting

        'schedules',

        {
          type: 'category',
          label: 'Accounts & Transactions',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'accounts/index',
          },
          items: [
            'transactions/filters',
            'transactions/transfers',
            {
              type: 'category',
              label: 'Rules',
              collapsed: true,
              link: {
                type: 'doc',
                id: 'budgeting/rules/index',
              },
              items: ['budgeting/rules/custom'],
            },
            'transactions/importing',
            'transactions/merging',
            'accounts/reconciliation',
            'transactions/payees',
            'transactions/bulk-editing',
            'transactions/tags',
            {
              type: 'category',
              label: 'Connecting Your Bank',
              link: {
                type: 'doc',
                id: 'advanced/bank-sync',
              },
              items: [
                'advanced/bank-sync/gocardless',
                'advanced/bank-sync/simplefin',
              ],
            },
            'advanced/scripts/modify-transfers',
          ],
        },
        {
          type: 'category',
          label: 'Reports',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'reports/index',
          },
          items: ['reports/custom-reports'],
        },
        {
          type: 'category',
          label: 'Backup & Restore',
          collapsed: true,
          items: ['backup-restore/backup', 'backup-restore/restore'],
        },
        'settings/index',
        'getting-started/sync',
        'getting-started/manage-files',

        {
          type: 'category',
          label: 'Experimental features',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'experimental/index',
          },
          items: [
            'experimental/goal-templates',
            'experimental/monthly-cleanup',
            'experimental/rule-templating',
            'experimental/formulas',
            'experimental/pluggyai',
            'experimental/crossover-point-report',
            'experimental/custom-themes',
            'experimental/budget-analysis-report',
          ],
        },
        'getting-started/tips-tricks',

        {
          type: 'category',
          label: 'API',
          link: { type: 'doc', id: 'api/index' },
          items: [
            'api/reference',
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
      ],
    },

    {
      type: 'category',
      label: 'Help & Support',
      collapsible: false,
      className: 'no-indent',
      items: [
        'faq',
        'actual-server-repo-move',
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
            'contributing/leadership/cursor-ide',
            'contributing/leadership/paying-contributors',
          ],
        },
      ],
    },
  ],
};
module.exports = sidebars;
