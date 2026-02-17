/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const fallbackBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function resolveBackendOrigin() {
  try {
    if (/^https?:\/\//i.test(apiUrl)) {
      return new URL(apiUrl).origin;
    }
  } catch (_) {
    // fallback used below
  }

  return fallbackBackendUrl.replace(/\/+$/, '');
}

const backendOrigin = resolveBackendOrigin();

const nextConfig = {
  reactStrictMode: true,
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
