"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { portalRoutes } from "@/lib/content"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@amakai/shared/components/ui/button"
import { Input } from "@amakai/shared/components/ui/input"

interface ResetPasswordFormProps {
  crossLinkPrompt: string
  crossLinkLabel: string
}

export function ResetPasswordForm({
  crossLinkPrompt,
  crossLinkLabel,
}: ResetPasswordFormProps) {
  const router = useRouter()

  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [sessionState, setSessionState] = React.useState<
    "loading" | "missing" | "ready"
  >("loading")

  React.useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionState(session ? "ready" : "missing")
    })
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.")
      setIsSubmitting(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  if (sessionState === "loading") {
    return (
      <p className="text-xs text-muted-foreground" role="status">
        Checking your reset link…
      </p>
    )
  }

  if (sessionState === "missing") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground" role="alert">
          This reset link is invalid or has expired. Request a new one to continue.
        </p>
        <p className="text-center text-xs text-muted-foreground">
          {crossLinkPrompt}{" "}
          <Link
            href={portalRoutes.forgotPassword}
            className="text-foreground underline underline-offset-4"
          >
            {crossLinkLabel}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reset-password" className="text-xs font-medium">
            New password
          </label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reset-password-confirm" className="text-xs font-medium">
            Confirm new password
          </label>
          <Input
            id="reset-password-confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your new password"
          />
        </div>

        {errorMessage ? (
          <p className="text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Updating password…" : "Update password"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {crossLinkPrompt}{" "}
        <Link
          href={portalRoutes.forgotPassword}
          className="text-foreground underline underline-offset-4"
        >
          {crossLinkLabel}
        </Link>
      </p>
    </div>
  )
}
