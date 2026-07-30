"use client"

import * as React from "react"

import { getAuthCallbackUrl, oauthProviders } from "@/lib/auth/providers"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@amakai/shared/components/ui/button"
import { Separator } from "@amakai/shared/components/ui/separator"

interface OAuthButtonsProps {
  nextPath?: string
}

export function OAuthButtons({ nextPath = "/" }: OAuthButtonsProps) {
  const [pendingProvider, setPendingProvider] = React.useState<string | null>(
    null
  )
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  async function handleOAuthSignIn(provider: (typeof oauthProviders)[number]["id"]) {
    setPendingProvider(provider)
    setErrorMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getAuthCallbackUrl(nextPath),
        ...(provider === "google"
          ? {
              queryParams: {
                access_type: "offline",
                prompt: "consent",
              },
            }
          : {}),
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setPendingProvider(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {oauthProviders.map((provider) => {
        const Icon = provider.icon
        const isPending = pendingProvider === provider.id

        return (
          <Button
            key={provider.id}
            type="button"
            variant="outline"
            size="lg"
            disabled={pendingProvider !== null}
            onClick={() => handleOAuthSignIn(provider.id)}
          >
            <Icon data-icon="inline-start" />
            {isPending ? "Redirecting…" : provider.label}
          </Button>
        )
      })}

      {errorMessage ? (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>
    </div>
  )
}
