/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    webpack: (config) => {
        // This is necessary for graphology to work with Next.js
        config.resolve.fallback = {
            fs: false,
            path: false,
        };

        return config;
    },
    experimental: {
        authInterrupts: true,
        reactCompiler: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
        ],
    },
};

module.exports = nextConfig;
