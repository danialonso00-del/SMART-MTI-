/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,

  experimental: {
    // Tree-shake heavy libraries — reduces bundle size for recharts, lucide-react, etc.
    optimizePackageImports: ['recharts', 'lucide-react', '@radix-ui/react-icons'],
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
};

module.exports = nextConfig;
