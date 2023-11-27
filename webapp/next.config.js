/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  react: { useSuspense: false },
};

module.exports = nextConfig;
