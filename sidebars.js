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
  defaultStyle: true
})

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'index',
    {
      type: 'category',
      label: 'Installing Actual',
      link: {
        type: 'generated-index',
      },
      items: [
        'Installing/overview',
        {
          type: 'category',
          label: 'On Your Own Machine',
          items: [
            'Installing/Local/your-own-machine',
          ]
        },
        {
          type: 'category',
          label: 'On Your Own Server',
          link: {
            type: 'generated-index',
          },
          items: [
            'Installing/Docker',
            'Installing/DockerWithNginx',
            'Installing/Unraid',
            {
              type: 'category',
              label: 'Synology',
              link: {
                type: 'doc',
                id: 'Installing/synology/synology',
              },
              items: [
                'Installing/synology/synology-reverse-proxy',
                'Installing/synology/synology-watchtower',
              ]
            },
          ]
        },
        {
          type: 'category',
          label: 'In the Cloud',
          link: {
            type: 'generated-index',
          },
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
            'Installing/Pikapods',
            'Installing/Terraform',
          ]
        },
      ],
    },
    {
      type: 'category',
      label: 'Getting Started',
      link: {
        type: 'generated-index',
      },
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Using Actual',
          items: [
            'Getting-Started/using-actual/files',
            'Getting-Started/using-actual/overview',
            'Getting-Started/using-actual/sidebar',
            'Getting-Started/using-actual/accounts',
            'Getting-Started/using-actual/budget',
            'Getting-Started/using-actual/schedules',
            'Getting-Started/using-actual/settings',
          ]
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
            {
              type: 'category',
              label: 'Migrating From Other Apps',
              items: [
                'Getting-Started/migration/ynab4',
                'Getting-Started/migration/nynab'
              ]
            },
            'Getting-Started/migration/simple-sync',
          ]
        },
      ],
    },
    {
      type: 'category',
      label: 'Budgeting',
      collapsed: true,
      items: [
        'Budgeting/howitworks',
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
          items: [
            'Budgeting/rules/rules-custom',
          ],
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
          collapsed: true,
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
      items: [
        'Reports/overview',
        unavailable('Custom Reports'),
      ],
    },
    {
      type: 'category',
      label: 'Backup & Restore',
      link: {
        type: 'generated-index',
      },
      collapsed: true,
      items: [
        'Backup-Restore/Backups',
        'Backup-Restore/Restore',
      ],
    },
    {
      type: 'category',
      label: 'Developers',
      link: {
        type: 'generated-index',
      },
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
        'Developers/using-the-API',
        'Developers/API',
        {
          type: 'category',
          label: 'ActualQL',
          collapsed: true,
          items: [
            'Developers/ActualQL/Overview',
            'Developers/ActualQL/Functions',
            'Developers/ActualQL/Examples',
          ],
        },
      ],
    },
    'FAQ',
    {
      type: 'category',
      label: 'Troubleshooting',
      link: {
        type: 'generated-index',
      },
      collapsed: true,
      items: [
        'Troubleshooting/Troubleshooting-Edge',
      ],
    },
    {
      type: 'category',
      label: 'Release Notes',
      collapsed: true,
      items: [
        'Release-Notes/Release-Notes'
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
          collapsed: true,
          items: [
            'Advanced/Scripts/modify-transfers',
          ],
        },
      ],
    },
  ],
};
module.exports = sidebars;
