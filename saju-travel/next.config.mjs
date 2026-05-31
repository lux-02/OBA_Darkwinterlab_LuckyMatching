/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["react-simple-maps", "d3-geo", "d3-array", "d3-scale"],
  experimental: {
    serverComponentsExternalPackages: ["@modelcontextprotocol/sdk"],
  },
};

export default nextConfig;
