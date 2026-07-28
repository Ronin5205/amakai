import { Cta } from "@/components/sections/cta"
import { Faq } from "@/components/sections/faq"
import { Hero } from "@/components/sections/hero"
import { Process } from "@/components/sections/process"
import { Services } from "@/components/sections/services"

export default function Page() {
  return (
    <>
      <Hero />
      <Services />
      <Process />
      <Faq />
      <Cta />
    </>
  )
}
