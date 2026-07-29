import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@amakai/shared"],
  env: {
    NEXT_PUBLIC_APP: "portal",
  },
}

export default nextConfig
