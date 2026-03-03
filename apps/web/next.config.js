/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ["@apex-os/ui", "@apex-os/types"],
    // Required for production Docker image (stage 3 copies .next/standalone)
    output: "standalone",
    experimental: {
        typedRoutes: true,
    },
};

module.exports = nextConfig;
