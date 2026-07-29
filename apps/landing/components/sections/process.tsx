import { Section } from "@/components/section"
import { Badge } from "@amakai/shared/components/ui/badge"
import { processSection } from "@/lib/content"

export function Process() {
  return (
    <Section
      id={processSection.id}
      eyebrow={processSection.eyebrow}
      title={processSection.title}
      description={processSection.description}
      bordered
    >
      <ol className="grid gap-10 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-6">
        {processSection.steps.map(({ step, title, description, duration, Icon }) => (
          <li
            key={step}
            className="relative flex flex-col gap-4 border-t border-border pt-6"
          >
            {/* Accent tick sitting on the timeline rule. */}
            <span
              aria-hidden="true"
              className="absolute top-0 left-0 h-px w-10 bg-primary"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="font-heading text-xs font-medium tabular-nums text-muted-foreground">
                {step}
              </span>
              <Badge variant="outline" className="tabular-nums">
                {duration}
              </Badge>
            </div>
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center border border-border bg-muted text-foreground"
            >
              <Icon className="size-4" />
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-medium tracking-tight">
                {title}
              </h3>
              <p className="text-pretty text-xs/relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  )
}
