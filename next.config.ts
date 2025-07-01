import analyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';
import ReactComponentName from 'react-scan/react-component-name/webpack';

const isProd = process.env.NODE_ENV === 'production';
const buildWithDocker = process.env.DOCKER === 'true';
const isDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP_APP === '1';
const enableReactScan = !!process.env.REACT_SCAN_MONITOR_API_KEY;
const isUsePglite = process.env.NEXT_PUBLIC_CLIENT_DB === 'pglite';

// Helper function to wrap config
const nowrapper = (config: NextConfig) => config;
const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === 'true',
});

// if you need to proxy the api endpoint to remote server

const basePath = process.env.NEXT_PUBLIC_BASE_PATH;
const isStandaloneMode = buildWithDocker || isDesktop;

const standaloneConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: { '*': ['public/**/*', '.next/static/**/*'] },
};

const nextConfig: NextConfig = {
  ...(isStandaloneMode ? standaloneConfig : {}),
  basePath,
  compress: isProd,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: [
      'emoji-mart',
      '@emoji-mart/react',
      '@emoji-mart/data',
      '@icons-pack/react-simple-icons',
      '@lobehub/ui',
      'gpt-tokenizer',
      'lucide-react',
      'antd',
      '@ant-design/icons',
      'framer-motion',
      'react-pdf',
      'pdfjs-dist',
      'xlsx',
      'mammoth',
      'officeparser',
      '@codesandbox/sandpack-react',
      'recharts',
      '@lobehub/charts',
    ],

    preloadEntriesOnStart: false,
    // oidc provider depend on constructor.name
    // but swc minification will remove the name
    // so we need to disable it
    // refs: https://github.com/lobehub/lobe-chat/pull/7430
    serverMinification: false,
    serverSourceMaps: false,
    webVitalsAttribution: ['CLS', 'LCP'],
    webpackMemoryOptimizations: true,
  },
  async headers() {
    return [
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/icons/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/images/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/videos/(.*).(mp4|webm|ogg|avi|mov|wmv|flv|mkv)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/screenshots/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/og/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/favicon.ico',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/favicon-32x32.ico',
      },
      {
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        source: '/apple-touch-icon.png',
      },
    ];
  },
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  redirects: async () => [
    {
      destination: '/sitemap-index.xml',
      permanent: true,
      source: '/sitemap.xml',
    },
    {
      destination: '/sitemap-index.xml',
      permanent: true,
      source: '/sitemap-0.xml',
    },
    {
      destination: '/manifest.webmanifest',
      permanent: true,
      source: '/manifest.json',
    },
    {
      destination: '/discover/assistant/:slug',
      has: [
        {
          key: 'agent',
          type: 'query',
          value: '(?<slug>.*)',
        },
      ],
      permanent: true,
      source: '/market',
    },
    {
      destination: '/discover/assistants',
      permanent: true,
      source: '/discover/assistant',
    },
    {
      destination: '/discover/models',
      permanent: true,
      source: '/discover/model',
    },
    {
      destination: '/discover/plugins',
      permanent: true,
      source: '/discover/plugin',
    },
    {
      destination: '/discover/providers',
      permanent: true,
      source: '/discover/provider',
    },
    {
      destination: '/settings/common',
      permanent: true,
      source: '/settings',
    },
    {
      destination: '/chat',
      permanent: true,
      source: '/welcome',
    },
    // TODO: 等 V2 做强制跳转吧
    // {
    //   destination: '/settings/provider/volcengine',
    //   permanent: true,
    //   source: '/settings/provider/doubao',
    // },
    // we need back /repos url in the further
    {
      destination: '/files',
      permanent: false,
      source: '/repos',
    },
  ],
  // when external packages in dev mode with turbopack, this config will lead to bundle error
  serverExternalPackages: isProd ? ['@electric-sql/pglite'] : undefined,

  transpilePackages: ['pdfjs-dist', 'mermaid'],

  typescript: {
    ignoreBuildErrors: true,
  },

  webpack(config) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };

    // 开启该插件会导致 pglite 的 fs bundler 被改表
    if (enableReactScan && !isUsePglite) {
      config.plugins.push(ReactComponentName({}));
    }

    // to fix shikiji compile error
    // refs: https://github.com/antfu/shikiji/issues/23
    config.module.rules.push({
      resolve: {
        fullySpecified: false,
      },
      test: /\.m?js$/,
      type: 'javascript/auto',
    });
    // https://github.com/pinojs/pino/issues/688#issuecomment-637763276
    config.externals.push('pino-pretty');

    config.resolve.alias.canvas = false;

    // to ignore epub2 compile error
    // refs: https://github.com/lobehub/lobe-chat/discussions/6769
    config.resolve.fallback = {
      ...config.resolve.fallback,
      constants: false,
      crypto: false,
      domain: false,
      events: false,
      fs: false,
      os: false,
      path: false,
      punycode: false,
      querystring: false,
      string_decoder: false,
      sys: false,
      timers: false,
      tty: false,
      url: false,
      vm: false,
      zipfile: false,
      zlib: false,
    };

    return config;
  },
};

const withPWA =
  isProd && !isDesktop
    ? withSerwistInit({
        register: false,
        swDest: 'public/sw.js',
        swSrc: 'src/app/sw.ts',
      })
    : nowrapper;
const hasSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
const withSentry =
  isProd && hasSentry
    ? (c: NextConfig) =>
        withSentryConfig(
          c,
          {
            org: process.env.sentry_org,
            project: process.env.sentry_project,
            // for all available options,
            silent: true,
          },
          {
            // enables automatic instrumentation of vercel cron monitors.
            // see the following for more
            //
            automaticVercelMonitors: true,

            // automatically tree-shake sentry logger statements to reduce bundle size
            disableLogger: true,

            // hides source maps from generated client bundles
            hideSourceMaps: true,

            // transpiles sdk to be compatible with ie11 (increases bundle size)
            transpileClientSDK: true,

            // routes browser requests to sentry through a next.js rewrite to circumvent ad-blockers. (increases server load)
            // Note: check that the configured route will not match with your next.js middleware, otherwise reporting of client-
            // side errors will fail.
            tunnelRoute: '/monitoring',

            // for all available options, see:
            // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
            // upload a larger set of source maps for prettier stack traces (increases build time)
            widenClientFileUpload: true,
          },
        )
    : nowrapper;

export default withBundleAnalyzer(withPWA(withSentry(nextConfig) as NextConfig));
