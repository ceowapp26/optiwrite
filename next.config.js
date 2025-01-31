/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const isDev = process.env.APP_ENV === 'development';

const devOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'https://*.ngrok.io',
  'https://*.ngrok-free.app',
];

const origins = [
  'https://admin.shopify.com',
  'https://*.myshopify.com',
   process.env.SHOPIFY_APP_URL,
].concat(isDev ? devOrigins : [process.env.SHOPIFY_APP_URL]).filter(Boolean);

const nextConfig = {
  experimental: {
     turbo: {
       resolveAlias: {
         canvas: './empty-module.ts',
       },
     },
   },
   images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com'
      },
      {
        protocol: 'https',
        hostname: 'files.edgestore.dev'
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com'
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com'
      },
      {
        protocol: 'https',
        hostname: 'www.gravatar.com'
      },
      {
        protocol: 'https',
        hostname: 'images.ctfassets.net'
      },
      {
        protocol: 'https',
        hostname: 'e-cdns-images.dzcdn.net'
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com'
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { 
            key: "Access-Control-Allow-Credentials", 
            value: "true" 
          },
          { 
            key: "Access-Control-Allow-Origin", 
            value: origins.join(', ') 
          },
          { 
            key: "Access-Control-Allow-Methods", 
            value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" 
          },
          { 
            key: "Access-Control-Allow-Headers", 
            value: "Accept, Accept-Version, Content-Type, Content-MD5, Content-Length, Authorization, X-CSRF-Token, X-Requested-With, Date, X-Api-Version" 
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400"
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors https://*.myshopify.com https://admin.shopify.com https://partners.shopify.com;"
          },
          {
            key: "X-Frame-Options",
            value: "ALLOWALL"
          }
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { 
            key: "Access-Control-Allow-Credentials", 
            value: "true" 
          },
          { 
            key: "Access-Control-Allow-Origin", 
            value: origins.join(', ') 
          },
          { 
            key: "Access-Control-Allow-Methods", 
            value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" 
          },
          { 
            key: "Access-Control-Allow-Headers", 
            value: "Accept, Accept-Version, Content-Type, Content-MD5, Content-Length, Authorization, X-CSRF-Token, X-Requested-With, Date, X-Api-Version" 
          }
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }, 
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  webpack(config, { isServer }) {
    config.experiments = {
      asyncWebAssembly: true,
      syncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };

    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    if (!isServer) {
      config.output.environment = { ...config.output.environment, asyncFunction: true };
      config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm';
      config.resolve.fallback.worker_threads = false;
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        ws: false,
        dns: false,
        net: false,
        canvas: false,
        encoding: false,
        stream: false,
        crypto: false,
      };
    }
    return config;
  },
  env: {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
    SHOPIFY_HOST: process.env.SHOPIFY_HOST,
    SHOPIFY_API_URL: process.env.SHOPIFY_API_URL,
    SHOPIFY_APP_NAME: process.env.SHOPIFY_APP_NAME,
    AUTH_GOOGLE_CLIENT_SECRET: process.env.AUTH_GOOGLE_CLIENT_SECRET,
    AUTH_GOOGLE_CLIENT_ID: process.env.AUTH_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    APP_DOMAIN: process.env.APP_DOMAIN,
    NGROK_DOMAIN: process.env.NGROK_DOMAIN,
    NGROK_URL: process.env.NGROK_URL,
    UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,
    UNSPLASH_SECRET_KEY: process.env.UNSPLASH_SECRET_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
};

module.exports = withBundleAnalyzer(nextConfig);
