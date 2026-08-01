/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["13.140.188.185", "localhost", "127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mainnet.qie.digital",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "testnet.qie.digital",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "coin-images.coingecko.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
