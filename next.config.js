const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
})

const withSerwist = require("@serwist/next").default({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable static export for Tauri builds
    output: process.env.BUILD_TARGET === 'tauri' ? 'export' : undefined,

    images: {
        // Use unoptimized images for static export (Tauri)
        unoptimized: process.env.BUILD_TARGET === 'tauri' || undefined,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
        ],
    },
    // Empty turbopack config to silence warning (Serwist uses webpack)
    turbopack: {},
};

module.exports = withBundleAnalyzer(withSerwist(nextConfig));
