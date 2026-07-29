import type { Metadata, Viewport } from "next"
import { Instrument_Sans, Noto_Sans } from "next/font/google"

import { siteConfig } from "@amakai/shared/lib/site-config"
import { themeInitScript } from "@amakai/shared/lib/theme"
import { cn } from "@amakai/shared/lib/utils"

import "./globals.css"

const instrumentSansHeading = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
})

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} Portal`,
    template: `%s — ${siteConfig.name}`,
  },
  description: `The ${siteConfig.name} client portal.`,
  applicationName: `${siteConfig.name} Portal`,
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090b0c" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        notoSans.variable,
        instrumentSansHeading.variable,
        "font-sans"
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
