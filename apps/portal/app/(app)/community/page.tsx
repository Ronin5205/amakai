import type { Metadata } from "next"
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr"

import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@amakai/shared/components/ui/empty"

export const metadata: Metadata = {
  title: "Community",
}

export default function CommunityPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
      <Empty className="max-w-sm border-0 bg-transparent p-0">
        <EmptyHeader className="max-w-none gap-4">
          <EmptyMedia
            variant="icon"
            className="size-12 rounded-none bg-muted/40 [&_svg:not([class*='size-'])]:size-5"
          >
            <UsersThreeIcon />
          </EmptyMedia>
          <EmptyTitle className="font-heading text-2xl font-medium tracking-tight text-foreground">
            Coming soon
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
