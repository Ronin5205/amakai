"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { isValidUsername, normalizeUsername } from "@/lib/auth/user"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { portalRoutes } from "@/lib/content"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@amakai/shared/components/ui/button"
import { Input } from "@amakai/shared/components/ui/input"

interface SignUpFormProps {
  crossLinkPrompt: string
  crossLinkLabel: string
}

export function SignUpForm({
  crossLinkPrompt,
  crossLinkLabel,
}: SignUpFormProps) {
  const router = useRouter()

  const [username, setUsername] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const normalizedUsername = normalizeUsername(username)

    if (!isValidUsername(normalizedUsername)) {
      setErrorMessage(
        "Username must be 3–30 characters and use only letters, numbers, or underscores."
      )
      setIsSubmitting(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: normalizedUsername,
          display_name: normalizedUsername,
        },
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    if (data.session) {
      router.push("/")
      router.refresh()
      return
    }

    setSuccessMessage(
      "Check your email for a confirmation link before signing in."
    )
    setIsSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <OAuthButtons nextPath="/" />

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sign-up-username" className="text-xs font-medium">
            Username
          </label>
          <Input
            id="sign-up-username"
            type="text"
            autoComplete="username"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]{3,30}"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="your_username"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sign-up-email" className="text-xs font-medium">
            Email
          </label>
          <Input
            id="sign-up-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sign-up-password" className="text-xs font-medium">
            Password
          </label>
          <Input
            id="sign-up-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        {errorMessage ? (
          <p className="text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="text-xs text-muted-foreground" role="status">
            {successMessage}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account with email"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {crossLinkPrompt}{" "}
        <Link
          href={portalRoutes.signIn}
          className="text-foreground underline underline-offset-4"
        >
          {crossLinkLabel}
        </Link>
      </p>
    </div>
  )
}
