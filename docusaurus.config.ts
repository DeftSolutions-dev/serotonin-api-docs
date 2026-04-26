import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Serotonin Lua API',
  tagline: 'Runtime-verified reference for the Serotonin Lua sandbox',
  favicon: 'img/logo-hero.png',

  url: 'https://deftsolutions-dev.github.io',
  baseUrl: '/serotonin-api-docs/',

  organizationName: 'DeftSolutions-dev',
  projectName: 'serotonin-api-docs',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru'],
    localeConfigs: {
      en: { label: 'English', direction: 'ltr', htmlLang: 'en-US' },
      ru: { label: 'Русский', direction: 'ltr', htmlLang: 'ru-RU' },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/DeftSolutions-dev/serotonin-api-docs/tree/main/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: false,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        indexPages: true,
        docsRouteBasePath: '/docs',
        language: ['en', 'ru'],
        searchBarShortcutHint: false,
        searchResultLimits: 10,
        searchResultContextMaxLength: 60,
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  themeConfig: {
    image: 'img/logo.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Serotonin',
      logo: { alt: 'Serotonin', src: 'img/logo-animated.webp' },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/llms',
          label: 'npm + MCP',
          position: 'left',
        },
        {
          type: 'search',
          position: 'right',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/DeftSolutions-dev/serotonin-api-docs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Overview', to: '/docs/overview' },
            { label: 'Crash triggers', to: '/docs/crash-triggers' },
            { label: 'Libraries', to: '/docs/libraries/utility' },
          ],
        },
        {
          title: 'Resources',
          items: [
            { label: 'For LLMs (llms.txt)', to: '/docs/llms' },
            { label: 'Methodology', to: '/docs/methodology' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub', href: 'https://github.com/DeftSolutions-dev/serotonin-api-docs' },
            { label: 'Issues', href: 'https://github.com/DeftSolutions-dev/serotonin-api-docs/issues' },
          ],
        },
      ],
      copyright: `MIT License. Unofficial reference, not affiliated with Serotonin.`,
    },
    prism: {
      theme: prismThemes.vsLight,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['lua', 'bash', 'json', 'python'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
