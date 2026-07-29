"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRightIcon, ListIcon } from "@phosphor-icons/react/ssr"

import { cn } from "@amakai/shared/lib/utils"
import { siteConfig } from "@/lib/content"
import { Logo } from "@amakai/shared/components/logo"
import { ThemeToggle } from "@amakai/shared/components/theme-toggle"
import { Button, buttonVariants } from "@amakai/shared/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@amakai/shared/components/ui/sheet"

/**
 * Sticky top bar. It stays transparent over the top of the hero and picks up a
 * hairline rule plus a translucent backdrop once the page has scrolled.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-sm"
          : "border-transparent"
      )}
    >
      <div className="section-shell flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          aria-label={`${siteConfig.name} home`}
          className="shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {siteConfig.nav.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              render={<Link href={item.href} />}
              nativeButton={false}
            >
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Button
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
            render={<Link href={siteConfig.portal.signIn.href} />}
            nativeButton={false}
          >
            {siteConfig.portal.signIn.label}
          </Button>

          <Button
            size="sm"
            className="hidden md:inline-flex"
            render={<Link href={siteConfig.portal.signUp.href} />}
            nativeButton={false}
          >
            {siteConfig.portal.signUp.label}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>

          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="md:hidden"
                  aria-label="Open menu"
                />
              }
            >
              <ListIcon />
            </SheetTrigger>

            <SheetContent side="right">
              <SheetHeader className="border-b border-border">
                <Logo />
                <SheetTitle className="sr-only">Site navigation</SheetTitle>
                <SheetDescription className="sr-only">
                  Jump to a section of the page or open the client portal.
                </SheetDescription>
              </SheetHeader>

              <nav aria-label="Mobile" className="flex flex-col">
                {siteConfig.nav.map((item) => (
                  <SheetClose
                    key={item.href}
                    render={<Link href={item.href} />}
                    nativeButton={false}
                    className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    {item.label}
                    <ArrowRightIcon className="size-4 text-muted-foreground" />
                  </SheetClose>
                ))}
              </nav>

              <SheetFooter className="border-t border-border">
                <SheetClose
                  render={<Link href={siteConfig.portal.signUp.href} />}
                  nativeButton={false}
                  className={buttonVariants({
                    size: "lg",
                    className: "w-full",
                  })}
                >
                  {siteConfig.portal.signUp.label}
                </SheetClose>
                <SheetClose
                  render={<Link href={siteConfig.portal.signIn.href} />}
                  nativeButton={false}
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className: "w-full",
                  })}
                >
                  {siteConfig.portal.signIn.label}
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
