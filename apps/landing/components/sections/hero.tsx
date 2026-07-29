import Link from "next/link"

import type { Icon as PhosphorIcon } from "@phosphor-icons/react"
import {
  ArrowRightIcon,
  CheckCircleIcon,
  GearSixIcon,
  LightningIcon,
} from "@phosphor-icons/react/ssr"

import { Badge } from "@amakai/shared/components/ui/badge"
import { Button } from "@amakai/shared/components/ui/button"
import { Card, CardContent, CardFooter } from "@amakai/shared/components/ui/card"
import { Separator } from "@amakai/shared/components/ui/separator"
import { hero, trustStrip } from "@/lib/content"
import { cn } from "@amakai/shared/lib/utils"

/**
 * Staggered entrance shared by every hero element. Only opacity and a 0.5rem
 * translate animate, so nothing reflows; `fill-mode-both` keeps each element
 * hidden through its delay instead of flashing first.
 */
const enter =
  "animate-in fade-in slide-in-from-bottom-2 fill-mode-both ease-out animation-duration-500 motion-reduce:animate-none"

/** Keeps a subtree from running its own color transitions during theme flips. */
const themeSkip = "theme-skip"

type FlowNode = {
  meta: string
  label: string
  kind: "trigger" | "step" | "outcome"
  Icon: PhosphorIcon
}

const flow: FlowNode[] = [
  {
    ...hero.workflow.trigger,
    kind: "trigger",
    Icon: LightningIcon,
  },
  ...hero.workflow.steps.map((step) => ({
    ...step,
    kind: "step" as const,
    Icon: GearSixIcon,
  })),
  {
    ...hero.workflow.outcome,
    kind: "outcome",
    Icon: CheckCircleIcon,
  },
]

function WorkflowNode({ node }: { node: FlowNode }) {
  const { Icon, kind } = node
  const isOutcome = kind === "outcome"

  return (
    <div
      className={cn(
        "flex items-start gap-3 border border-border px-3 py-2.5",
        isOutcome && "border-primary/50"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-6 shrink-0 place-items-center border border-border text-muted-foreground",
          isOutcome && "border-primary bg-primary text-primary-foreground"
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[0.625rem] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {node.meta}
        </span>
        <span className="text-pretty text-xs font-medium">{node.label}</span>
      </span>
    </div>
  )
}

export function Hero() {
  const { stat } = hero.workflow

  return (
    <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-24 sm:pb-20 lg:pt-28 lg:pb-24">
      <div
        aria-hidden="true"
        className="hairline-grid fade-edges pointer-events-none absolute inset-0 -z-10 [--hairline-size:5rem]"
      />
      <div className="section-shell">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-16">
          <div className="flex flex-col items-start gap-6">
            <Badge variant="outline" className={enter}>
              <LightningIcon data-icon="inline-start" />
              {hero.eyebrow}
            </Badge>
            <h1
              className={cn(
                "max-w-2xl text-balance font-heading text-4xl font-medium tracking-tight sm:text-5xl",
                enter,
                "delay-75"
              )}
            >
              {hero.title}
            </h1>
            <p
              className={cn(
                "max-w-xl text-pretty text-sm/relaxed text-muted-foreground sm:text-base/relaxed",
                enter,
                "delay-150"
              )}
            >
              {hero.description}
            </p>
            <div className={cn("flex flex-wrap items-center gap-3", enter, "delay-200")}>
              <Button
                size="lg"
                render={<Link href={hero.primaryCta.href} />}
                nativeButton={false}
              >
                {hero.primaryCta.label}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                render={<Link href={hero.secondaryCta.href} />}
                nativeButton={false}
              >
                {hero.secondaryCta.label}
              </Button>
            </div>
            <p className={cn("max-w-md text-xs text-muted-foreground", enter, "delay-300")}>
              {hero.note}
            </p>
          </div>

          <Card className={cn("w-full", themeSkip, enter, "delay-300")}>
            <CardContent>
              <ol className="flex flex-col">
                {flow.map((node, index) => (
                  <li key={node.meta} className="flex flex-col">
                    {index > 0 ? (
                      <span
                        aria-hidden="true"
                        className="ms-6 h-4 w-px shrink-0 bg-border"
                      />
                    ) : null}
                    <WorkflowNode node={node} />
                  </li>
                ))}
              </ol>
            </CardContent>
            <CardFooter className="items-baseline justify-between gap-4">
              <span className="font-heading text-2xl font-medium tabular-nums">
                {stat.value}
              </span>
              <span className="max-w-[12rem] text-pretty text-end text-xs text-muted-foreground">
                {stat.label}
              </span>
            </CardFooter>
          </Card>
        </div>

        <div className={cn("mt-16 flex flex-col gap-5 sm:mt-20", enter, "delay-1000")}>
          <Separator />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <span className="shrink-0 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              {trustStrip.label}
            </span>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {trustStrip.items.map((item) => (
                <li
                  key={item}
                  className="font-heading text-sm font-medium text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
