"use client"

import * as React from "react"
import Link from "next/link"

import { getAuthCallbackUrl } from "@/lib/auth/providers"
import { portalRoutes } from "@/lib/content"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@amakai/shared/components/ui/button"
import { Input } from "@amakai/shared/components/ui/input"

interface ForgotPasswordFormProps {
  crossLinkPrompt: string
  crossLinkLabel: string
}

export function ForgotPasswordForm({
  crossLinkPrompt,
  crossLinkLabel,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthCallbackUrl(portalRoutes.resetPassword),
    })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    setSuccessMessage(
      "Check your email for a password reset link. It may take a few minutes to arrive."
    )
    setIsSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="forgot-password-email" className="text-xs font-medium">
            Email
          </label>
          <Input
            id="forgot-password-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
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
          {isSubmitting ? "Sending link…" : "Send reset link"}
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
