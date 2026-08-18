/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@napi-rs/canvas', 'sharp', '@prisma/client'],
    // Without this, Next's client-side Router Cache can serve a stale RSC payload for up to
    // 30s when navigating back to a dynamic page (e.g. the sign templates/sets lists) right
    // after creating or editing something on it — making new data look like it "vanished"
    // until a hard refresh. These pages are cheap to re-render, so always refetch instead.
    staleTimes: { dynamic: 0 },
  },
};

export default nextConfig;
