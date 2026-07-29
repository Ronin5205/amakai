import { Section } from "@/components/section"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"
import { services } from "@/lib/content"

export function Services() {
  return (
    <Section
      id={services.id}
      eyebrow={services.eyebrow}
      title={services.title}
      description={services.description}
      bordered
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.items.map(({ title, description, Icon }) => (
          <li key={title} className="flex">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>{title}</CardTitle>
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
    </Section>
  )
}
