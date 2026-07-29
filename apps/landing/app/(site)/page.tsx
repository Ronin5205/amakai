import { Capabilities } from "@/components/sections/capabilities"
import { Cta } from "@/components/sections/cta"
import { Faq } from "@/components/sections/faq"
import { Hero } from "@/components/sections/hero"
import { HowItWorks } from "@/components/sections/how-it-works"
import { PlatformTeams } from "@/components/sections/platform-teams"
import { UseCases } from "@/components/sections/use-cases"

export default function Page() {
  return (
    <>
      <Hero />
      <Capabilities />
      <HowItWorks />
      <UseCases />
      <PlatformTeams />
      <Faq />
      <Cta />
    </>
  )
}
