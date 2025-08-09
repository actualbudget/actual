// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const { themes } = require('prism-react-renderer');

const defaultOptions = {
  editUrl: 'https://github.com/actualbudget/docs/tree/master/',
  beforeDefaultRemarkPlugins: [require('./src/remark/mentions')],
};

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  title: 'Actual Budget Documentation',
  tagline: 'Your finances - made simple',
  url: 'https://actualbudget.org/',
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

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./docs-sidebar.js'),
          ...defaultOptions,
        },
        blog: {
          ...defaultOptions,
          feedOptions: {
            type: 'rss',
            title: 'Actual Budget Blog',
            description:
              'Stay updated with the latest blog posts from Actual Budget',
            copyright: `Copyright © ${new Date().getFullYear()} Actual Budget. All rights reserved.`,
          },
          onUntruncatedBlogPosts: 'ignore',
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
            label: 'Features',
            position: 'left',
          },
          {
            type: 'doc',
            docId: 'index',
            label: 'Docs',
            position: 'left',
          },
          {
            to: 'blog',
            label: 'Blog',
            position: 'left',
          },
          {
            to: '/contact',
            label: 'Contact',
            position: 'left',
          },
          {
            to: '/download',
            label: 'Download',
            position: 'left',
          },
          {
            href: 'https://opencollective.com/actual',
            label: 'Donate',
            position: 'left',
          },
          {
            href: 'https://discord.gg/8JfAXSgfRf',
            label: 'Discord',
            position: 'right',
          },
          {
            href: 'https://github.com/actualbudget/actual',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            label: 'Discord',
            href: 'https://discord.gg/8JfAXSgfRf',
          },
          {
            label: 'GitHub',
            href: 'https://github.com/actualbudget/actual',
          },
          {
            href: 'https://opencollective.com/actual',
            label: 'Donate',
          },
          {
            label: 'Website Source',
            href: 'https://github.com/actualbudget/docs',
          },
          {
            label: 'Privacy Policy',
            to: '/docs/privacy-policy',
          },
          {
            label: 'RSS Feed',
            href: 'https://actualbudget.org/blog/rss.xml',
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Actual Budget. Built with Docusaurus.`,
      },
      prism: {
        theme: themes.github,
        darkTheme: themes.dracula,
        additionalLanguages: ['nginx'],
      },

      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },

      zoom: {
        // See: https://github.com/timmywil/panzoom for available options
        disableZoom: true,
        // A list of selectors to look for elements to enable pan and zoom
        selectors: [
          'div.mermaid[data-processed="true"]:not(.panzoom-exclude *)',
          'div.docusaurus-mermaid-container:not(.panzoom-exclude *)',
          '.drawio',
          '.panzoom-example',
        ],

        // Whether to wrap the panzoom items in a div with overflow:hidden
        // This constrains the pan zoom detail into the original container
        wrap: true,

        // The amount of time to wait in MS before the plugin client module tries to look for
        // and alter pan zoom elements. Some renders take a little bit before they appear in the
        // dom to find.
        timeout: 2000,
        excludeClass: 'panzoom-exclude',

        toolbar: {
          enabled: true,
        },
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
    '@r74tech/docusaurus-plugin-panzoom',
  ],
};
