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
  productionBrowserSourceMaps: false,
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
    ],
    serverMinification: false,
    webVitalsAttribution: ['CLS', 'LCP'],
    webpackMemoryOptimizations: true,
    webpackBuildWorker: true,
  },
  compiler: {
    removeConsole: isProd ? true : false
  },
  async headers() {
    return [
      {
        headers: [{ key: 'x-robots-tag', value: 'all' }],
        source: '/:path*',
      },
      {
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
        source: '/icons/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Vercel-CDN-Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
        source: '/images/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Vercel-CDN-Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
        source: '/videos/(.*).(mp4|webm|ogg|avi|mov|wmv|flv|mkv)',
      },
      {
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Vercel-CDN-Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
        source: '/screenshots/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Vercel-CDN-Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
        source: '/og/(.*).(png|jpe?g|gif|svg|ico|webp)',
      },
      {
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
        source: '/favicon.ico',
      },
      {
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
        source: '/favicon-32x32.ico',
      },
      {
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'CDN-Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
        source: '/apple-touch-icon.png',
      },
    ];
  },
  logging: {
    fetches: { fullUrl: true, hmrRefreshes: true },
  },
  reactStrictMode: true,
  redirects: async () => [
    { destination: '/sitemap-index.xml', permanent: true, source: '/sitemap.xml' },
    { destination: '/sitemap-index.xml', permanent: true, source: '/sitemap-0.xml' },
    { destination: '/sitemap/plugins-1.xml', permanent: true, source: '/sitemap/plugins.xml' },
    {
      destination: '/sitemap/assistants-1.xml',
      permanent: true,
      source: '/sitemap/assistants.xml',
    },
    { destination: '/manifest.webmanifest', permanent: true, source: '/manifest.json' },
    { destination: '/discover/assistant', permanent: true, source: '/discover/assistants' },
    { destination: '/discover/plugin', permanent: true, source: '/discover/plugins' },
    { destination: '/discover/model', permanent: true, source: '/discover/models' },
    { destination: '/discover/provider', permanent: true, source: '/discover/providers' },
    { destination: '/settings/common', permanent: true, source: '/settings' },
    { destination: '/chat', permanent: true, source: '/welcome' },
    { destination: '/files', permanent: false, source: '/repos' },
  ],
  serverExternalPackages: isProd ? ['@electric-sql/pglite'] : undefined,

  transpilePackages: [
    'pdfjs-dist',
    'mermaid',
    '@lobechat/electron-client-ipc',
    '@lobechat/electron-server-ipc',
    '@lobechat/file-loaders',
    '@lobechat/web-crawler',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },

  webpack(config) {
    config.experiments = { asyncWebAssembly: true, layers: true };

    if (enableReactScan && !isUsePglite) {
      config.plugins.push(ReactComponentName({}));
    }

    config.module.rules.push({
      resolve: { fullySpecified: false },
      test: /\.m?js$/,
      type: 'javascript/auto',
    });

    config.externals.push('pino-pretty');
    config.resolve.alias.canvas = false;
    config.resolve.fallback = { ...config.resolve.fallback, zipfile: false };

    return config;
  },
};

const noWrapper = (config: NextConfig) => config;
const withBundleAnalyzer = process.env.ANALYZE === 'true' ? analyzer() : noWrapper;

const withPWA =
  isProd && !isDesktop
    ? withSerwistInit({ register: false, swDest: 'public/sw.js', swSrc: 'src/app/sw.ts' })
    : noWrapper;

const hasSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
const withSentry =
  isProd && hasSentry
    ? (c: NextConfig) =>
      withSentryConfig(
        c,
        {
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          silent: true,
        },
        {
          automaticVercelMonitors: true,
          disableLogger: true,
          hideSourceMaps: true,
          transpileClientSDK: true,
          tunnelRoute: '/monitoring',
          widenClientFileUpload: true,
        },
      )
    : noWrapper;

export default withBundleAnalyzer(withPWA(withSentry(nextConfig) as NextConfig));
