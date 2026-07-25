/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Konva ships an optional Node "canvas" dependency used only for server-side
  // rendering. We render Konva exclusively on the client (ssr:false), so we tell
  // webpack not to try to bundle the native module.
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };
    return config;
  },
  eslint: {
    // Lint is run explicitly in CI via `pnpm lint`; don't fail production builds
    // on lint so a clean clone can always `next build`.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
