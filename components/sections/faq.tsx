import { Section } from "@/components/section"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { faq } from "@/lib/content"

export function Faq() {
  return (
    <Section
      id={faq.id}
      eyebrow={faq.eyebrow}
      title={faq.title}
      description={faq.description}
      bordered
      contentClassName="max-w-3xl"
    >
      <Accordion
        defaultValue={[faq.items[0].value]}
        className="border-y border-border"
      >
        {faq.items.map((item) => (
          <AccordionItem key={item.value} value={item.value}>
            <AccordionTrigger className="gap-4 py-4 sm:text-sm">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="max-w-2xl text-pretty text-xs/relaxed text-muted-foreground sm:text-sm/relaxed">
                {item.answer}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  )
}
