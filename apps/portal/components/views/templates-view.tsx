import { PlusIcon } from "@phosphor-icons/react/dist/ssr"

import { SectionPage } from "@/components/section-page"
import type { WorkflowTemplate } from "@/lib/domain/template"
import { Badge } from "@amakai/shared/components/ui/badge"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"

export interface TemplatesViewProps {
  templates: WorkflowTemplate[]
}

export function TemplatesView({ templates }: TemplatesViewProps) {
  return (
    <SectionPage
      eyebrow="Design"
      title="Templates"
      description="Start from proven workflow templates across finance, sales, support, and operations."
      actions={
        <Button size="sm" disabled>
          <PlusIcon data-icon="inline-start" />
          Create template
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{template.category}</Badge>
                <span className="text-xs text-muted-foreground">
                  {template.nodeCount} nodes
                </span>
                <span className="text-xs text-muted-foreground">
                  {template.usageCount.toLocaleString("en-US")} uses
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {template.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" disabled className="w-full">
                Use template
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </SectionPage>
  )
}
