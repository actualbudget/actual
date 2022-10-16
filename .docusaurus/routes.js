import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/actual-community-docs/__docusaurus/debug',
    component: ComponentCreator('/actual-community-docs/__docusaurus/debug', 'b84'),
    exact: true
  },
  {
    path: '/actual-community-docs/__docusaurus/debug/config',
    component: ComponentCreator('/actual-community-docs/__docusaurus/debug/config', '7cc'),
    exact: true
  },
  {
    path: '/actual-community-docs/__docusaurus/debug/content',
    component: ComponentCreator('/actual-community-docs/__docusaurus/debug/content', '1f0'),
    exact: true
  },
  {
    path: '/actual-community-docs/__docusaurus/debug/globalData',
    component: ComponentCreator('/actual-community-docs/__docusaurus/debug/globalData', '47c'),
    exact: true
  },
  {
    path: '/actual-community-docs/__docusaurus/debug/metadata',
    component: ComponentCreator('/actual-community-docs/__docusaurus/debug/metadata', '359'),
    exact: true
  },
  {
    path: '/actual-community-docs/__docusaurus/debug/registry',
    component: ComponentCreator('/actual-community-docs/__docusaurus/debug/registry', 'ed6'),
    exact: true
  },
  {
    path: '/actual-community-docs/__docusaurus/debug/routes',
    component: ComponentCreator('/actual-community-docs/__docusaurus/debug/routes', '30e'),
    exact: true
  },
  {
    path: '/actual-community-docs/markdown-page',
    component: ComponentCreator('/actual-community-docs/markdown-page', '9a5'),
    exact: true
  },
  {
    path: '/actual-community-docs/',
    component: ComponentCreator('/actual-community-docs/', '42f'),
    routes: [
      {
        path: '/actual-community-docs/',
        component: ComponentCreator('/actual-community-docs/', 'e00'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Accounts/addaccount',
        component: ComponentCreator('/actual-community-docs/Accounts/addaccount', '438'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Accounts/connecting-your-bank',
        component: ComponentCreator('/actual-community-docs/Accounts/connecting-your-bank', '580'),
        exact: true
      },
      {
        path: '/actual-community-docs/Accounts/importing-trans',
        component: ComponentCreator('/actual-community-docs/Accounts/importing-trans', '17b'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Accounts/overview',
        component: ComponentCreator('/actual-community-docs/Accounts/overview', '6db'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Accounts/payees',
        component: ComponentCreator('/actual-community-docs/Accounts/payees', '1ad'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Accounts/transfers',
        component: ComponentCreator('/actual-community-docs/Accounts/transfers', '787'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Backup-Restore/Backups',
        component: ComponentCreator('/actual-community-docs/Backup-Restore/Backups', '029'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Backup-Restore/Restore',
        component: ComponentCreator('/actual-community-docs/Backup-Restore/Restore', 'c93'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Budgeting/categories',
        component: ComponentCreator('/actual-community-docs/Budgeting/categories', 'f1c'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Budgeting/creditcards',
        component: ComponentCreator('/actual-community-docs/Budgeting/creditcards', '3ca'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Budgeting/howitworks',
        component: ComponentCreator('/actual-community-docs/Budgeting/howitworks', '75f'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Budgeting/reconcile',
        component: ComponentCreator('/actual-community-docs/Budgeting/reconcile', 'b78'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Budgeting/returnsandreimbursements',
        component: ComponentCreator('/actual-community-docs/Budgeting/returnsandreimbursements', 'a70'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Budgeting/rules/',
        component: ComponentCreator('/actual-community-docs/Budgeting/rules/', '917'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Budgeting/rules/rules-custom',
        component: ComponentCreator('/actual-community-docs/Budgeting/rules/rules-custom', 'a26'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Budgeting/schedules',
        component: ComponentCreator('/actual-community-docs/Budgeting/schedules', '500'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/category/backup--restore',
        component: ComponentCreator('/actual-community-docs/category/backup--restore', '5a5'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/category/developers',
        component: ComponentCreator('/actual-community-docs/category/developers', 'ab9'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/category/getting-started',
        component: ComponentCreator('/actual-community-docs/category/getting-started', '625'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/category/installing-actual',
        component: ComponentCreator('/actual-community-docs/category/installing-actual', '3c0'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/category/troubleshooting',
        component: ComponentCreator('/actual-community-docs/category/troubleshooting', '9ca'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Developers/ActualQL',
        component: ComponentCreator('/actual-community-docs/Developers/ActualQL', '0b9'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Developers/API',
        component: ComponentCreator('/actual-community-docs/Developers/API', 'dae'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Developers/Building-Windows',
        component: ComponentCreator('/actual-community-docs/Developers/Building-Windows', 'f29'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Developers/project-layout',
        component: ComponentCreator('/actual-community-docs/Developers/project-layout', 'f12'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Developers/using-the-API',
        component: ComponentCreator('/actual-community-docs/Developers/using-the-API', '120'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/FAQ',
        component: ComponentCreator('/actual-community-docs/FAQ', '078'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/Docker',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/Docker', '0d3'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/fly/Fly-git',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/fly/Fly-git', '3c7'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/fly/Fly-image',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/fly/Fly-image', '1c5'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/fly/Fly-persisting',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/fly/Fly-persisting', 'a13'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/fly/Fly-prerequisites',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/fly/Fly-prerequisites', '5cb'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/fly/Fly-terraform',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/fly/Fly-terraform', 'b8d'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/fly/Fly-updating',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/fly/Fly-updating', 'c87'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/fly/Fly.io',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/fly/Fly.io', 'a63'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/Pikapods',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/Pikapods', 'd5b'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/synology/',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/synology/', 'eb0'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/synology/synology-reverse-proxy',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/synology/synology-reverse-proxy', 'bc2'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/synology/synology-watchtower',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/synology/synology-watchtower', '36c'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/Terraform',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/Terraform', 'bda'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/Installing/Unraid',
        component: ComponentCreator('/actual-community-docs/Getting-Started/Installing/Unraid', '632'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/managefiles',
        component: ComponentCreator('/actual-community-docs/Getting-Started/managefiles', '615'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/migration/migration-intro',
        component: ComponentCreator('/actual-community-docs/Getting-Started/migration/migration-intro', '81f'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/migration/nynab',
        component: ComponentCreator('/actual-community-docs/Getting-Started/migration/nynab', '232'),
        exact: true
      },
      {
        path: '/actual-community-docs/Getting-Started/migration/ynab4',
        component: ComponentCreator('/actual-community-docs/Getting-Started/migration/ynab4', '609'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/sync',
        component: ComponentCreator('/actual-community-docs/Getting-Started/sync', '905'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Getting-Started/tipstricks',
        component: ComponentCreator('/actual-community-docs/Getting-Started/tipstricks', '446'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Reports/overview',
        component: ComponentCreator('/actual-community-docs/Reports/overview', 'fa5'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/actual-community-docs/Troubleshooting/Troubleshooting-Edge',
        component: ComponentCreator('/actual-community-docs/Troubleshooting/Troubleshooting-Edge', '06b'),
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
