/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/**
 * @param {string} title
 * @returns {import('@docusaurus/plugin-content-docs/src/sidebars/types').SidebarItemHtml}
 */
const unavailable = title => ({
  type: 'html',
  value: title,
  className: 'menu__link menu__link--unavailable',
  defaultStyle: true,
});

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'index',
    'releases',
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
          ],
        },
        'contributing/preview-builds',
        'contributing/releasing',
        'contributing/windows',
        {
          type: 'category',
          label: 'Project Leadership',
          collapsible: false,
          items: ['contributing/leadership/funding'],
        },
      ],
    },
    {
      type: 'category',
      label: 'Getting Started',
      collapsible: false,
      items: [
        {
          type: 'category',
          label: 'Installing Actual',
          link: {
            type: 'doc',
            id: 'install/index',
          },
          items: [
            {
              type: 'category',
              label: 'On Your Own Machine',
              collapsible: false,
              items: ['install/local', 'install/docker'],
            },
            {
              type: 'category',
              label: 'In the Cloud',
              collapsible: false,
              items: ['install/pikapods', 'install/fly'],
            },
          ],
        },
        {
          type: 'category',
          label: 'Configuring the Server',
          link: {
            type: 'doc',
            id: 'config/index',
          },
          items: ['config/https'],
        },
        {
          type: 'category',
          label: 'A Tour of Actual',
          link: {
            type: 'doc',
            id: 'tour/index',
          },
          items: [
            'tour/files',
            'tour/overview',
            'tour/sidebar',
            'tour/accounts',
            'tour/budget',
            'tour/schedules',
            'tour/settings',
          ],
        },
        'getting-started/tips-tricks',
        'getting-started/sync',
        'getting-started/manage-files',
        {
          type: 'category',
          label: 'Migration',
          link: {
            type: 'doc',
            id: 'migration/index',
          },
          items: [
            'migration/simple-sync',
            {
              type: 'category',
              label: 'Migrating From Other Apps',
              collapsible: false,
              items: [
                'migration/actual-import',
                'migration/ynab4',
                'migration/nynab',
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Using Actual',
      collapsible: false,
      items: [
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
            'budgeting/schedules',
            'budgeting/returns-and-reimbursements',
            {
              type: 'category',
              label: 'Managing Credit Cards',
              collapsed: true,
              link: {
                type: 'doc',
                id: 'budgeting/credit-cards/index',
              },
              items: ['budgeting/credit-cards/carrying-debt'],
            },
            'budgeting/joint-accounts',
            //unavailable('Returns and Reimbursements'),
          ],
        },
        {
          type: 'category',
          label: 'Accounts & Transactions',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'accounts/index',
          },
          items: [
            'accounts/reconciliation',
            'transactions/importing',
            'transactions/bulk-editing',
            'transactions/payees',
            'transactions/transfers',
          ],
        },
        {
          type: 'category',
          label: 'Reports & Filters',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'reports-filters/index',
          },
          items: [
            'reports-filters/reports',
            'reports-filters/filters',
          ],
        },
        {
          type: 'category',
          label: 'Backup & Restore',
          collapsed: true,
          items: ['backup-restore/backup', 'backup-restore/restore'],
        },
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
        {
          type: 'category',
          label: 'Advanced',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'advanced/index',
          },
          items: [
            'advanced/bank-sync',
            {
              type: 'category',
              label: 'Scripts',
              collapsible: false,
              items: ['advanced/scripts/modify-transfers'],
            },
          ],
        },
        {
          type: 'category',
          label: 'Experimental features',
          collapsed: true,
          items: [
            'experimental/goal-templates',
            'experimental/monthly-cleanup',
            'experimental/report-budget',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Help & Support',
      collapsible: false,
      items: [
        'faq',
        {
          type: 'category',
          label: 'Troubleshooting',
          collapsed: true,
          items: [
            'troubleshooting/server',
            'troubleshooting/shared-array-buffer',
            'troubleshooting/edge-browser',
          ],
        },
      ],
    },
  ],
};
module.exports = sidebars;
