/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
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
