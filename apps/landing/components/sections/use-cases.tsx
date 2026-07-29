import { Section } from "@/components/section"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"
import { useCases } from "@/lib/content"

export function UseCases() {
  return (
    <Section
      id={useCases.id}
      eyebrow={useCases.eyebrow}
      title={useCases.title}
      description={useCases.description}
      bordered
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {useCases.items.map(({ persona, headline, description, Icon }) => (
          <li
            key={persona}
            className="flex lg:last:col-span-3 lg:last:mx-auto lg:last:max-w-md"
          >
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base">{headline}</CardTitle>
                <CardAction>
                  <span
                    aria-hidden="true"
                    className="grid size-8 place-items-center border border-border bg-muted text-foreground"
                  >
                    <Icon className="size-4" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <span className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  {persona}
                </span>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  )
}
