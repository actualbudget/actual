/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {(title: string) => unknown} */
const unavailable = (title) => ({
  type: 'html',
  value: title,
  className: 'menu__link menu__link--unavailable',
  defaultStyle: true,
});

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'index',
    'Release-Notes',
    {
      type: 'category',
      label: 'Contributing',
      collapsed: true,
      items: [
        {
          type: 'link',
          label: 'Issue Board',
          href: 'https://github.com/orgs/actualbudget/projects/1',
        },
        'Developers/project-layout',
        'Developers/preview-builds',
        'Developers/releasing',
        'Developers/Building-Windows',
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
            id: 'Installing/overview',
          },
          items: [
            {
              type: 'category',
              label: 'On Your Own Machine',
              collapsible: false,
              items: ['Installing/Local/your-own-machine'],
            },
            {
              type: 'category',
              label: 'On Your Own Server',
              collapsible: false,
              items: [
                'Installing/Docker',               
              ],
            },
            {
              type: 'category',
              label: 'In the Cloud',
              collapsible: false,
              items: [
                {
                  type: 'category',
                  label: 'Fly.io',
                  link: {
                    type: 'doc',
                    id: 'Installing/fly/Fly.io',
                  },
                  items: [
                    'Installing/fly/Fly-prerequisites',
                    'Installing/fly/Fly-git',
                    'Installing/fly/Fly-image',
                    'Installing/fly/Fly-terraform',
                    'Installing/fly/Fly-updating',
                    'Installing/fly/Fly-persisting',
                  ],
                },
                'Installing/PikaPods',               
              ],
            },
          ],
        },
        'Installing/Configuration',
        {
          type: 'category',
          label: 'A Tour of Actual',
          link: {
            type: 'doc',
            id: 'Getting-Started/using-actual/index',
          },
          items: [
            'Getting-Started/using-actual/files',
            'Getting-Started/using-actual/overview',
            'Getting-Started/using-actual/sidebar',
            'Getting-Started/using-actual/accounts',
            'Getting-Started/using-actual/budget',
            'Getting-Started/using-actual/schedules',
            'Getting-Started/using-actual/settings',
          ],
        },
        'Getting-Started/tipstricks',
        'Getting-Started/sync',
        'Getting-Started/managefiles',
        {
          type: 'category',
          label: 'Migration',
          link: {
            type: 'doc',
            id: 'Getting-Started/migration/migration-intro',
          },
          items: [
            'Getting-Started/migration/simple-sync',
            {
              type: 'category',
              label: 'Migrating From Other Apps',
              collapsible: false,
              items: [
                'Getting-Started/migration/ynab4',
                'Getting-Started/migration/nynab',
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
            id: 'Budgeting/howitworks',
          },
          items: [
            'Budgeting/filters',
            'Budgeting/categories',
            {
              type: 'category',
              label: 'Rules',
              collapsed: true,
              link: {
                type: 'doc',
                id: 'Budgeting/rules/rules',
              },
              items: ['Budgeting/rules/rules-custom'],
            },
            'Budgeting/schedules',
            'Budgeting/returnsandreimbursements',
            'Budgeting/creditcards',
            'Budgeting/jointaccounts',
            //unavailable('Returns and Reimbursements'),
          ],
        },
        {
          type: 'category',
          label: 'Accounts',
          collapsed: true,
          items: [
            'Accounts/overview',
            'Accounts/addaccount',
            'Accounts/reconcile',
            {
              type: 'category',
              label: 'Transactions',
              collapsible: false,
              items: [
                'Accounts/Transactions/importing-trans',
                'Accounts/Transactions/bulk-editing-transactions',
              ],
            },
            unavailable('Connecting Your Bank'),
            'Accounts/payees',
            'Accounts/transfers',
          ],
        },
        {
          type: 'category',
          label: 'Reports',
          collapsed: true,
          items: ['Reports/overview', unavailable('Custom Reports')],
        },
        {
          type: 'category',
          label: 'Backup & Restore',
          collapsed: true,
          items: ['Backup-Restore/Backups', 'Backup-Restore/Restore'],
        },
        {
          type: 'category',
          label: 'API',
          link: { type: 'doc', id: 'Developers/using-the-API' },
          items: [
            'Developers/API',
            {
              type: 'category',
              label: 'ActualQL',
              collapsed: true,
              link: {
                type: 'doc',
                id: 'Developers/ActualQL/Overview',
              },
              items: [
                'Developers/ActualQL/Functions',
                'Developers/ActualQL/Examples',
              ],
            },
          ],
        },
        {
          type: 'category',
          label: 'Advanced',
          collapsed: true,
          link: {
            type: 'doc',
            id: 'Advanced/advanced-intro',
          },
          items: [
            {
              type: 'category',
              label: 'Scripts',
              collapsible: false,
              items: ['Advanced/Scripts/modify-transfers'],
            },
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Help & Support',
      collapsible: false,
      items: [
        'Contact',
        'FAQ',
        {
          type: 'category',
          label: 'Troubleshooting',
          collapsed: true,
          items: [
            'Troubleshooting/SharedArrayBuffer',
            'Troubleshooting/Troubleshooting-Edge',
          ],
        },
        {
          type: 'category',
          label: 'Experimental features',
          collapsed: true,
          items: [
            'Advanced/Experimental-Features/goal-templates',
            unavailable('Report Budget'),
            unavailable('Account syncing')
          ],
        },
      ],
    },
  ],
};
module.exports = sidebars;
