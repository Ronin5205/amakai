import path from "node:path"

import { loadEnvConfig } from "@next/env"
import type { NextConfig } from "next"

// Load shared env from the monorepo root (.env, .env.local, etc.)
loadEnvConfig(path.join(__dirname, "../.."))

const nextConfig: NextConfig = {
  transpilePackages: ["@amakai/shared"],
  env: {
    NEXT_PUBLIC_APP: "landing",
  },
}

export default nextConfig
