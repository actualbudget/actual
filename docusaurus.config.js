// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  title: 'Actual Budget Documentation',
  tagline: 'Dinosaurs are cool',
  url: 'https://docs.actualbudget.org',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: 'docs/',
          sidebarPath: require.resolve('./docs-sidebar.js'),
          editUrl: 'https://github.com/actualbudget/docs/tree/master/',
          beforeDefaultRemarkPlugins: [require('./src/remark/rewrite-images')],
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        logo: {
          alt: 'Actual Open Source',
          src: 'img/actual.png',
        },
        items: [
          {
            to: '/#features',
            // never render as active
            activeBaseRegex: '^$',
            position: 'left',
            label: 'Features',
          },
          {
            type: 'doc',
            docId: 'index',
            position: 'left',
            label: 'Docs',
          },
          {
            to: '/contact',
            position: 'left',
            label: 'Contact',
          },
          {
            href: 'https://discord.gg/8JfAXSgfRf',
            label: 'Discord',
            position: 'right',
          },
          {
            href: 'https://github.com/actualbudget/docs',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'GitHub',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/actualbudget',
              },
            ],
          },
          {
            title: 'Discord',
            items: [
              {
                label: 'Discord',
                href: 'https://discord.gg/8JfAXSgfRf',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Actual Budget. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['nginx'],
      },
    }),
  plugins: [
    [
      require.resolve('@cmfcmf/docusaurus-search-local'),
      {
        indexDocs: true,
        indexDocSidebarParentCategories: 0,
        indexPages: false,
        language: 'en',
        style: undefined,
        maxSearchResults: 8,
        lunr: {
          tokenizerSeparator: /[\s\-]+/,

          b: 0.75,

          k1: 1.2,

          titleBoost: 5,
          contentBoost: 1,
          tagsBoost: 3,
          parentCategoriesBoost: 2, // Only used when indexDocSidebarParentCategories > 0
        },
      },
    ],
    ['@docusaurus/plugin-ideal-image', { disableInDev: false }],
  ],
};
