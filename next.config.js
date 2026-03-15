/** @type {import('next').NextConfig} */
const defaultLocalApiBaseUrl = 'http://localhost:5000/api';
const apiBaseUrl = String(
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  defaultLocalApiBaseUrl
).replace(/\/+$/, '');
const fallbackBackendUrl = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:5000';

function resolveBackendOrigin() {
  try {
    if (/^https?:\/\//i.test(apiBaseUrl)) {
      return new URL(apiBaseUrl).origin;
    }
  } catch (_) {
    // fallback used below
  }

  return fallbackBackendUrl.replace(/\/+$/, '');
}

const backendOrigin = resolveBackendOrigin();

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    webpackBuildWorker: false,
    workerThreads: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
    NEXT_PUBLIC_BACKEND_ORIGIN: backendOrigin
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com'
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/storage/:path*',
        destination: `${backendOrigin}/storage/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
