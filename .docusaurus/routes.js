import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/docs/__docusaurus/debug',
    component: ComponentCreator('/docs/__docusaurus/debug', '6ee'),
    exact: true
  },
  {
    path: '/docs/__docusaurus/debug/config',
    component: ComponentCreator('/docs/__docusaurus/debug/config', '2cd'),
    exact: true
  },
  {
    path: '/docs/__docusaurus/debug/content',
    component: ComponentCreator('/docs/__docusaurus/debug/content', '4a7'),
    exact: true
  },
  {
    path: '/docs/__docusaurus/debug/globalData',
    component: ComponentCreator('/docs/__docusaurus/debug/globalData', '650'),
    exact: true
  },
  {
    path: '/docs/__docusaurus/debug/metadata',
    component: ComponentCreator('/docs/__docusaurus/debug/metadata', '84d'),
    exact: true
  },
  {
    path: '/docs/__docusaurus/debug/registry',
    component: ComponentCreator('/docs/__docusaurus/debug/registry', 'd25'),
    exact: true
  },
  {
    path: '/docs/__docusaurus/debug/routes',
    component: ComponentCreator('/docs/__docusaurus/debug/routes', '017'),
    exact: true
  },
  {
    path: '/docs/markdown-page',
    component: ComponentCreator('/docs/markdown-page', '1af'),
    exact: true
  },
  {
    path: '/docs/',
    component: ComponentCreator('/docs/', '536'),
    routes: [
      {
        path: '/docs/',
        component: ComponentCreator('/docs/', 'e7a'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Accounts/addaccount',
        component: ComponentCreator('/docs/Accounts/addaccount', 'f1d'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Accounts/connecting-your-bank',
        component: ComponentCreator('/docs/Accounts/connecting-your-bank', 'ce0'),
        exact: true
      },
      {
        path: '/docs/Accounts/importing-trans',
        component: ComponentCreator('/docs/Accounts/importing-trans', '725'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Accounts/overview',
        component: ComponentCreator('/docs/Accounts/overview', 'c33'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Accounts/payees',
        component: ComponentCreator('/docs/Accounts/payees', '1e7'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Accounts/transfers',
        component: ComponentCreator('/docs/Accounts/transfers', '132'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Backup-Restore/Backups',
        component: ComponentCreator('/docs/Backup-Restore/Backups', 'eed'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Backup-Restore/Restore',
        component: ComponentCreator('/docs/Backup-Restore/Restore', '03c'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Budgeting/categories',
        component: ComponentCreator('/docs/Budgeting/categories', '143'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Budgeting/creditcards',
        component: ComponentCreator('/docs/Budgeting/creditcards', '32c'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Budgeting/howitworks',
        component: ComponentCreator('/docs/Budgeting/howitworks', 'c3c'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Budgeting/reconcile',
        component: ComponentCreator('/docs/Budgeting/reconcile', '76b'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Budgeting/returnsandreimbursements',
        component: ComponentCreator('/docs/Budgeting/returnsandreimbursements', '32e'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Budgeting/rules/',
        component: ComponentCreator('/docs/Budgeting/rules/', '00f'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Budgeting/rules/rules-custom',
        component: ComponentCreator('/docs/Budgeting/rules/rules-custom', '479'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Budgeting/schedules',
        component: ComponentCreator('/docs/Budgeting/schedules', '4f1'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/category/backup--restore',
        component: ComponentCreator('/docs/category/backup--restore', '4f7'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/category/developers',
        component: ComponentCreator('/docs/category/developers', 'cb5'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/category/getting-started',
        component: ComponentCreator('/docs/category/getting-started', '066'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/category/installing-actual',
        component: ComponentCreator('/docs/category/installing-actual', '81d'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/category/troubleshooting',
        component: ComponentCreator('/docs/category/troubleshooting', '036'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Developers/ActualQL',
        component: ComponentCreator('/docs/Developers/ActualQL', 'c88'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Developers/API',
        component: ComponentCreator('/docs/Developers/API', '750'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Developers/Building-Windows',
        component: ComponentCreator('/docs/Developers/Building-Windows', '5e3'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Developers/project-layout',
        component: ComponentCreator('/docs/Developers/project-layout', 'c41'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Developers/using-the-API',
        component: ComponentCreator('/docs/Developers/using-the-API', '1fe'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/FAQ',
        component: ComponentCreator('/docs/FAQ', '6a7'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/Docker',
        component: ComponentCreator('/docs/Getting-Started/Installing/Docker', 'a26'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/fly/Fly-git',
        component: ComponentCreator('/docs/Getting-Started/Installing/fly/Fly-git', '464'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/fly/Fly-image',
        component: ComponentCreator('/docs/Getting-Started/Installing/fly/Fly-image', '0fe'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/fly/Fly-persisting',
        component: ComponentCreator('/docs/Getting-Started/Installing/fly/Fly-persisting', '284'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/fly/Fly-prerequisites',
        component: ComponentCreator('/docs/Getting-Started/Installing/fly/Fly-prerequisites', 'c05'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/fly/Fly-terraform',
        component: ComponentCreator('/docs/Getting-Started/Installing/fly/Fly-terraform', '8a7'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/fly/Fly-updating',
        component: ComponentCreator('/docs/Getting-Started/Installing/fly/Fly-updating', '3ea'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/fly/Fly.io',
        component: ComponentCreator('/docs/Getting-Started/Installing/fly/Fly.io', '1b9'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/Pikapods',
        component: ComponentCreator('/docs/Getting-Started/Installing/Pikapods', '64f'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/synology/',
        component: ComponentCreator('/docs/Getting-Started/Installing/synology/', 'e23'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/synology/synology-reverse-proxy',
        component: ComponentCreator('/docs/Getting-Started/Installing/synology/synology-reverse-proxy', '657'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/synology/synology-watchtower',
        component: ComponentCreator('/docs/Getting-Started/Installing/synology/synology-watchtower', '7a2'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/Terraform',
        component: ComponentCreator('/docs/Getting-Started/Installing/Terraform', '840'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/Installing/Unraid',
        component: ComponentCreator('/docs/Getting-Started/Installing/Unraid', 'ee7'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/managefiles',
        component: ComponentCreator('/docs/Getting-Started/managefiles', 'ca4'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/migration/migration-intro',
        component: ComponentCreator('/docs/Getting-Started/migration/migration-intro', 'aac'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/migration/nynab',
        component: ComponentCreator('/docs/Getting-Started/migration/nynab', '3d2'),
        exact: true
      },
      {
        path: '/docs/Getting-Started/migration/ynab4',
        component: ComponentCreator('/docs/Getting-Started/migration/ynab4', '954'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/sync',
        component: ComponentCreator('/docs/Getting-Started/sync', '5cd'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Getting-Started/tipstricks',
        component: ComponentCreator('/docs/Getting-Started/tipstricks', '1b8'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Reports/overview',
        component: ComponentCreator('/docs/Reports/overview', '34a'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/docs/Troubleshooting/Troubleshooting-Edge',
        component: ComponentCreator('/docs/Troubleshooting/Troubleshooting-Edge', '85e'),
        exact: true,
        sidebar: "docs"
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
