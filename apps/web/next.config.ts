import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  async redirects() {
    return [
      {
        source: "/builder/:id",
        destination: "/projects/:id",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
