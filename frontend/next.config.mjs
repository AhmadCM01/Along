/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  allowedDevOrigins: process.env.LAN_ORIGIN ? [process.env.LAN_ORIGIN] : [],
};

export default nextConfig;

