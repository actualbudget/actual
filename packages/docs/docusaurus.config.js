// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const { themes } = require('prism-react-renderer');

const docVersions = require('./doc-versions.json');

const DOCS_DOMAIN = 'https://actualbudget.org';
const CURRENT_DOCS_URL = `${DOCS_DOMAIN}/docs/`;

const isDeployPreview = process.env.CONTEXT === 'deploy-preview';
const DOCS_URL =
  (isDeployPreview && process.env.DEPLOY_PRIME_URL) || DOCS_DOMAIN;

const isDev = process.env.NODE_ENV === 'development';
// DOCS_NEXT is set by the workflow that deploys master to next--
const isNext = isDev || isDeployPreview || process.env.DOCS_NEXT === 'true';
const activeVersion = isNext ? 'next' : docVersions.current;
// Only the current release on actualbudget.org is indexed. DOCS_PRODUCTION is
// set by the release workflow; CONTEXT covers Netlify's own production builds.
const isProduction =
  process.env.DOCS_PRODUCTION === 'true' ||
  process.env.CONTEXT === 'production';

const versionDropdownItems = Object.entries(docVersions.versions || {}).map(
  ([version, url]) => {
    const isCurrent = version === activeVersion;
    const label = version === 'next' ? 'Next' : `v${version}`;
    const key = isCurrent ? 'to' : 'href';
    const link = isCurrent ? '/docs/' : url;

    return { label, [key]: link };
  },
);

const defaultOptions = {
  editUrl: 'https://github.com/actualbudget/actual/tree/master/packages/docs',
  beforeDefaultRemarkPlugins: [
    require('./src/remark/mentions'),
    require('./src/remark/enforce-doc-links'),
  ],
};

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  title: 'Actual Budget',
  tagline: 'Your finances - made simple',
  url: `${DOCS_URL}/`,
  baseUrl: '/',
  noIndex: !isProduction,
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  favicon: 'img/favicon.ico',

  projectName: 'actualbudget.github.io',
  organizationName: 'actualbudget',
  deploymentBranch: 'main',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  customFields: {
    mainHost: new URL(DOCS_DOMAIN).hostname,
    currentDocsUrl: CURRENT_DOCS_URL,
    docVersion: docVersions.current,
    isNext,
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
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
          blogSidebarTitle: 'All posts',
          blogSidebarCount: 'ALL',
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
      image: 'img/og.webp',
      navbar: {
        title: 'Actual Budget',
        logo: {
          alt: 'Actual Open Source',
          src: 'img/logo.webp',
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
            type: 'docSidebar',
            sidebarId: 'tourSidebar',
            label: 'Tour',
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
            type: 'docSidebar',
            sidebarId: 'communitySidebar',
            label: 'Community',
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
          ...(activeVersion
            ? [
                {
                  type: 'dropdown',
                  position: 'right',
                  label:
                    activeVersion === 'next' ? 'Next' : `v${activeVersion}`,
                  items: versionDropdownItems,
                },
              ]
            : []),
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
            href: 'https://github.com/actualbudget/actual/tree/master/packages/docs',
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
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            from: '/contact',
            to: '/docs/community/',
          },
          {
            from: '/docs/actual-server-repo-move',
            to: '/docs/install/',
          },
        ],
      },
    ],
    [
      '@docusaurus/plugin-ideal-image',
      {
        quality: 70,
        max: 1030, // max resized image's size.
        min: 640, // min resized image's size. if original is lower, use that size.
        steps: 2, // the max number of images generated between min and max (inclusive)
        disableInDev: false,
      },
    ],
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        hashed: true,
        indexDocs: true,
        indexPages: false,
        language: 'en',
      }),
    ],
    '@r74tech/docusaurus-plugin-panzoom',
  ],
};
