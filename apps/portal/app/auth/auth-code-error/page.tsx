import type { Metadata } from "next"
import Link from "next/link"

import { portalRoutes } from "@/lib/content"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"

export const metadata: Metadata = {
  title: "Sign-in failed",
  robots: { index: false, follow: false },
}

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-5 py-16">
      <Card className="w-full max-w-md gap-6">
        <CardHeader className="gap-3">
          <CardTitle className="text-lg">
            <h1>Could not sign you in</h1>
          </CardTitle>
          <CardDescription className="text-sm/relaxed">
            The authentication link expired or was already used. Try signing in
            again, or contact support if the problem continues.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            size="lg"
            className="w-full"
            render={<Link href={portalRoutes.signIn} />}
            nativeButton={false}
          >
            Back to sign in
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
