import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr"

import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { portal } from "@/lib/content"
import { Badge } from "@amakai/shared/components/ui/badge"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"

export const metadata: Metadata = {
  title: portal.resetPassword.title,
  description: portal.metaDescription,
  robots: { index: false, follow: true },
}

export default function ResetPasswordPage() {
  const copy = portal.resetPassword

  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-6">
        <CardHeader className="gap-3">
          <Badge variant="outline">{portal.badge}</Badge>
          <CardTitle className="text-lg">
            <h1>{copy.title}</h1>
          </CardTitle>
          <CardDescription className="text-sm/relaxed">
            {copy.description}
          </CardDescription>
        </CardHeader>

        <div className="px-6 pb-2">
          <Suspense fallback={<p className="text-xs text-muted-foreground">Loading…</p>}>
            <ResetPasswordForm
              crossLinkPrompt={copy.crossLinkPrompt}
              crossLinkLabel={copy.crossLink.label}
            />
          </Suspense>
        </div>

        <CardFooter>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            render={<Link href={portal.backCta.href} />}
            nativeButton={false}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {portal.backCta.label}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
