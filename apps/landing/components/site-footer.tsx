import Link from "next/link"

import { footer, siteConfig } from "@/lib/content"
import { Logo } from "@amakai/shared/components/logo"
import { Separator } from "@amakai/shared/components/ui/separator"

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="section-shell flex flex-col gap-12 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              aria-label={`${siteConfig.name} home`}
              className="w-fit outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Logo />
            </Link>
            <p className="max-w-xs text-sm/relaxed text-muted-foreground">
              {footer.tagline}
            </p>
          </div>

          {footer.columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-4">
              <h3 className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                {column.title}
              </h3>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator />

        <p className="text-xs text-muted-foreground tabular-nums">
          {footer.copyright(new Date().getFullYear())}
        </p>
      </div>
    </footer>
  )
}
