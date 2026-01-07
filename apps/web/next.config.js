/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
        domains: ['localhost'],
    },
    env: {
        API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    },
};

module.exports = nextConfig;
