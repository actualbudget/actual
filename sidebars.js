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
      label: 'Getting Started',
      link: {
        type: 'generated-index',
      },
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Installing Actual',
          link: {
            type: 'generated-index',
          },
          items: [
            {
              type: 'category',
              label: 'Fly.io',
              link: {
                type: 'doc',
                id: 'Getting-Started/Installing/fly/Fly.io',
              },
              items: [
                'Getting-Started/Installing/fly/Fly-prerequisites',
                'Getting-Started/Installing/fly/Fly-git',            
                'Getting-Started/Installing/fly/Fly-image',            
                'Getting-Started/Installing/fly/Fly-terraform',
                'Getting-Started/Installing/fly/Fly-updating',
                'Getting-Started/Installing/fly/Fly-persisting',
              ],
            },
            'Getting-Started/Installing/Docker',
            'Getting-Started/Installing/Pikapods', 
            'Getting-Started/Installing/Unraid',
            'Getting-Started/Installing/Terraform',
            {
              type: 'category',
              label: 'Synology',
              link: {
                type: 'doc',
                id: 'Getting-Started/Installing/synology/synology',
              },
              items: [
                'Getting-Started/Installing/synology/synology-reverse-proxy',
                'Getting-Started/Installing/synology/synology-watchtower',
              ]
            },
          ],
        },
        'Getting-Started/tipstricks',
        'Getting-Started/sync',
        'Getting-Started/managefiles',
        {
          type: 'category',
          label: 'Migrating From Other Apps',
          link: {
            type: 'doc',
            id: 'Getting-Started/migration/migration-intro',
          },
          items: [
            'Getting-Started/migration/ynab4',
            unavailable('nYNAB'),
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
        'Budgeting/reconcile',
        'Budgeting/returnsandreimbursements',
        'Budgeting/creditcards',
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
        'Accounts/importing-trans',
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
        'Developers/project-layout',
        'Developers/using-the-API',
        'Developers/API',
        'Developers/ActualQL',
        'Developers/Building-Windows',
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
  ],
};
module.exports = sidebars;
