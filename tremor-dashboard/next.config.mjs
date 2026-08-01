/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "asa-list.tinyman.org",
        pathname: "/assets/**",
      },
    ],
  },
};

export default nextConfig;
