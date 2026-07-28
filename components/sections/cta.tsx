import Link from "next/link"

import { ArrowRightIcon } from "@phosphor-icons/react/ssr"

import { Section } from "@/components/section"
import { Button } from "@/components/ui/button"
import { finalCta } from "@/lib/content"

export function Cta() {
  return (
    <Section
      id={finalCta.id}
      eyebrow={finalCta.eyebrow}
      title={finalCta.title}
      description={finalCta.description}
      align="center"
      bordered
      className="relative isolate overflow-hidden"
      contentClassName="flex flex-col items-center gap-5"
    >
      <div
        aria-hidden="true"
        className="hairline-dots fade-edges pointer-events-none absolute inset-0 -z-10 [--hairline-size:1.75rem]"
      />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          render={<Link href={finalCta.primaryCta.href} />}
          nativeButton={false}
        >
          {finalCta.primaryCta.label}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          render={<Link href={finalCta.secondaryCta.href} />}
          nativeButton={false}
        >
          {finalCta.secondaryCta.label}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{finalCta.note}</p>
    </Section>
  )
}
