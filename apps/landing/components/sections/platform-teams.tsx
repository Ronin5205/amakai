import Link from "next/link"

import { Section } from "@/components/section"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"
import { platformTeams } from "@/lib/content"

export function PlatformTeams() {
  return (
    <Section
      id={platformTeams.id}
      eyebrow={platformTeams.eyebrow}
      title={platformTeams.title}
      description={platformTeams.description}
      bordered
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platformTeams.items.map(({ role, description, Icon }) => (
          <li key={role} className="flex">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base">{role}</CardTitle>
                <CardAction>
                  <span
                    aria-hidden="true"
                    className="grid size-8 place-items-center border border-border bg-muted text-foreground"
                  >
                    <Icon className="size-4" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex justify-center sm:mt-12">
        <Button
          variant="outline"
          render={<Link href={platformTeams.cta.href} />}
          nativeButton={false}
        >
          {platformTeams.cta.label}
        </Button>
      </div>
    </Section>
  )
}
