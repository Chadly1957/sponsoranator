/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@napi-rs/canvas', 'sharp', '@prisma/client'],
  },
};

export default nextConfig;
