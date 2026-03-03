/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");
const withPWA = require("next-pwa")({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
    register: true,
    skipWaiting: true,
    swSrc: "src/worker/index.ts", // Path to custom service worker if needed
});

const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ["@apex-os/ui", "@apex-os/types"],
    // Required for production Docker image (stage 3 copies .next/standalone)
    // output: "standalone",
    experimental: {
        typedRoutes: true,
    },
};

module.exports = withPWA(withSentryConfig(
    nextConfig,
    {
        silent: true,
        org: "apex-os",
        project: "web-fleet",
    },
    {
        widenClientFileUpload: true,
        transpileClientSDK: true,
        tunnelRoute: "/monitoring",
        hideSourceMaps: true,
        disableLogger: true,
    }
));
