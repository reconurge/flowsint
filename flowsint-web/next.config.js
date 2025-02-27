/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        authInterrupts: true,
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
