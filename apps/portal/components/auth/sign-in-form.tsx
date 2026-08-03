"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { portalRoutes } from "@/lib/content"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@amakai/shared/components/ui/button"
import { Input } from "@amakai/shared/components/ui/input"

interface SignInFormProps {
  crossLinkPrompt: string
  crossLinkLabel: string
}

export function SignInForm({
  crossLinkPrompt,
  crossLinkLabel,
}: SignInFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") ?? "/"

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    router.push(nextPath)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <OAuthButtons nextPath={nextPath} />

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sign-in-email" className="text-xs font-medium">
            Email
          </label>
          <Input
            id="sign-in-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="sign-in-password" className="text-xs font-medium">
              Password
            </label>
            <Link
              href={portalRoutes.forgotPassword}
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="sign-in-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </div>

        {errorMessage ? (
          <p className="text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in with email"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {crossLinkPrompt}{" "}
        <Link
          href={portalRoutes.signUp}
          className="text-foreground underline underline-offset-4"
        >
          {crossLinkLabel}
        </Link>
      </p>
    </div>
  )
}
