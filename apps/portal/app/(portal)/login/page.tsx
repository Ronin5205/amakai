import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeftIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react/ssr"

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
  title: portal.signIn.title,
  description: portal.metaDescription,
  robots: { index: false, follow: true },
}

export default function LoginPage() {
  const copy = portal.signIn

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
        <CardFooter className="flex-col items-stretch gap-2">
          <Button
            size="lg"
            render={<a href={portal.emailCta.href} />}
            nativeButton={false}
          >
            <EnvelopeSimpleIcon data-icon="inline-start" />
            {portal.emailCta.label}
          </Button>
          <Button
            variant="outline"
            size="lg"
            render={<Link href={portal.backCta.href} />}
            nativeButton={false}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {portal.backCta.label}
          </Button>
        </CardFooter>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        {copy.crossLinkPrompt}{" "}
        <Link
          href={copy.crossLink.href}
          className="text-foreground underline underline-offset-4"
        >
          {copy.crossLink.label}
        </Link>
      </p>
    </div>
  )
}
