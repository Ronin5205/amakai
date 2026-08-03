import { NextResponse } from "next/server"

import { consumeOAuthState } from "@/lib/data/secrets"
import { saveOutlookOAuthSecret } from "@/lib/integrations/auth/outlook-oauth"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  if (error) {
    return NextResponse.redirect(
      `${origin}/resources/secrets?error=${encodeURIComponent(error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/resources/secrets?error=${encodeURIComponent("Missing OAuth code")}`
    )
  }

  try {
    const oauthState = await consumeOAuthState(state)
    if (!oauthState || oauthState.provider !== "outlook") {
      return NextResponse.redirect(
        `${origin}/resources/secrets?error=${encodeURIComponent("Invalid or expired OAuth state")}`
      )
    }

    await saveOutlookOAuthSecret({
      code,
      secretName: oauthState.secretName,
    })

    const redirect = oauthState.redirectPath.startsWith("/")
      ? oauthState.redirectPath
      : "/resources/secrets"

    return NextResponse.redirect(
      `${origin}${redirect}?connected=outlook`
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to connect Outlook"
    return NextResponse.redirect(
      `${origin}/resources/secrets?error=${encodeURIComponent(message)}`
    )
  }
}
