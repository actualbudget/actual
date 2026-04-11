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
    'releases',
    {
      type: 'category',
      label: 'Budgeting 101',
      collapsible: false,
      className: 'no-indent',
      items: [
        'getting-started/envelope-budgeting',
        'getting-started/tracking-budget',
      ],
    },
    {
      type: 'category',
      label: 'Quick Start Guide',
      collapsed: true,
      items: [
        {
        type: 'category',
        label: 'Install Actual',
        collapsed: true,
        items: [
          'install/index',
          'install/desktop-app',
          'install/pikapods',
        ],
        },
        'getting-started/add-accounts',
        'getting-started/add-categories',
        'getting-started/add-transactions',
        'getting-started/reconcile-new',
        'getting-started/starting-fresh',
        'getting-started/start-new-month',
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
          label: 'Installation & Configuration',
          collapsed: true,
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
              items: ['install/desktop-app', 'install/docker', 'install/cli-tool', 'install/build-from-source'],
            },
            {
              type: 'category',
              label: 'In the Cloud',
              collapsible: false,
              className: 'no-indent',
              items: ['install/pikapods','install/fly'],
            },
            {
              type: 'category',
              label: 'Configuration',
              collapsible: false,
              className: 'no-indent',
              items: ['config/index', 'config/https', 'config/reverse-proxies', 'config/oauth-auth', 'config/multi-user', 'advanced/http-header-auth'],
            },
          ],
        },
        //end of installation, begin migration
        {
          type: 'category',
          label: 'Data Migration',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'migration/index',
          },
          items: ['migration/ynab4', 'migration/nynab'],
        },
        //end migration, begin accounts
        {
          type: 'category',
          label: 'Adding Accounts',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'accounts/index',
          },
           items: [
           'accounts/add-accounts',
           {
             type: 'category',
             label: 'Credit Cards',
             collapsed: true,
             link: {
               type: 'doc',
               id: 'accounts/credit-cards/index',
            },
             items: ['accounts/credit-cards/carrying-debt', 'accounts/credit-cards/paying-in-full'],
           },
           'accounts/joint-accounts',
           'accounts/reconciliation',
           {
             type: 'category',
             label: 'Connecting Your Bank',
             collapsed: true,
             link: {
               type: 'doc',
               id: 'accounts/bank-sync',
             },
            items: [
              'accounts/bank-sync/gocardless', 
              'accounts/bank-sync/simplefin', 
              'accounts/bank-sync/pluggyai',
            ],
           },
          ],
        },
        //end accounts, begin transactions
        {
         type: 'category',
         label: 'Transactions',
         collapsed: true,
         link: {
         type: 'doc',
        id: 'transactions/importing',
         },
         items: [
           'transactions/split-transactions', 
           'transactions/transfers', 
           'transactions/schedules', 
           'transactions/filters',
           {
            type: 'category',
            label: 'Rules',
           collapsed: true,
           link: {
           type: 'doc',
           id: 'transactions/rules/index',
           },
           items: [
            'transactions/rules/custom',
            'transactions/rules/rule-templating',
            'transactions/rules/multi-currency',
           ],
          },
           'transactions/merging', 
           'transactions/payees', 
           'transactions/tags',
           'transactions/bulk-editing',
          ],
        },
        //end transactions, begin budgeting
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
            'budgeting/monthly-cleanup',
            'budgeting/goal-templates',
            'getting-started/tracking-budget',
            'budgeting/restart',
          ],
        },
        //end budgeting, begin reports
        {
          type: 'category',
          label: 'Reports',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'reports/index',
          },
          items: [
            'reports/custom-reports', 
            'reports/crossover-point-report', 
            'reports/budget-analysis-report',
            'reports/formulas',
          ],
        },
        //end reports
        'tips-tricks',
        {
          type: 'category',
          label: 'Utilities & Troubleshooting',
          collapsed: true,
          items: [
            'troubleshooting/faq',
            'budgeting/restart',
            'backup-restore/backup',
            'backup-restore/restore',
            'settings/index',
            'troubleshooting/custom-themes',
            'troubleshooting/sync',
            'troubleshooting/edge-browser',
            'troubleshooting/reset-password',
            'troubleshooting/shared-array-buffer',
            'troubleshooting/server',
            'troubleshooting/actual-server-repo-move',
            ],
        },
        //end troubleshooting
        'community-repos',
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
                'contributing/leadership/architecture-decision-records',
                'contributing/leadership/cursor-ide',
                'contributing/leadership/paying-contributors',
              ],
            },
          ],
        },
      ],
    },
 ],
};
module.exports = sidebars;
