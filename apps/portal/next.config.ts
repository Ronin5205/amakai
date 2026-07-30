import path from "node:path"

import { loadEnvConfig } from "@next/env"
import type { NextConfig } from "next"

// Load shared env from the monorepo root (.env, .env.local, etc.)
loadEnvConfig(path.join(__dirname, "../.."))

const nextConfig: NextConfig = {
  transpilePackages: ["@amakai/shared"],
  env: {
    NEXT_PUBLIC_APP: "portal",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
}

export default nextConfig
