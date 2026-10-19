/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      "bufferutil": "bufferutil",
      "utf-8-validate": "utf-8-validate",
    });
    return config;
  },
};

module.exports = nextConfig;
