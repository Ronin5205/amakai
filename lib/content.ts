import type { Icon } from "@phosphor-icons/react"
import {
  BlueprintIcon,
  ChartLineUpIcon,
  CubeIcon,
  FlowArrowIcon,
  MapTrifoldIcon,
  PlugsConnectedIcon,
  RobotIcon,
  SquaresFourIcon,
  WrenchIcon,
} from "@phosphor-icons/react/ssr"

/**
 * Every word on the marketing page lives here so copy can be edited without
 * touching components. Icons are stored as component references (not string
 * keys) so sections can render them directly.
 */

export interface NavItem {
  label: string
  href: string
}

export interface CtaLink {
  label: string
  href: string
}

export interface WorkflowNode {
  /** Short uppercase label rendered above the node, e.g. "Trigger", "Step 02". */
  meta: string
  label: string
}

export interface ServiceItem {
  title: string
  description: string
  Icon: Icon
}

export interface ProcessStep {
  /** Zero-padded index for tabular display, e.g. "01". */
  step: string
  title: string
  description: string
  duration: string
  Icon: Icon
}

export interface FaqItem {
  /** Accordion item value. Pass in an array to `defaultValue`. */
  value: string
  question: string
  answer: string
}

export interface FooterColumn {
  title: string
  links: NavItem[]
}

/** Portal destinations. Every call to action on the page points at one of these. */
export const portalRoutes = {
  signIn: "/login",
  signUp: "/signup",
} as const

export const siteConfig = {
  name: "Amakai",
  tagline: "Automation and custom software for teams that outgrew their spreadsheets.",
  description:
    "Amakai builds done-for-you automations, AI assistants and internal software for small and mid-size businesses, so your team stops copying and pasting between apps.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://amakai.com",
  email: "hello@amakai.com",
  locale: "en_US",
  keywords: [
    "business process automation",
    "workflow automation agency",
    "custom internal tools",
    "AI agents for business",
    "custom SaaS development",
    "n8n consultant",
  ],
  nav: [
    { label: "Services", href: "#services" },
    { label: "Process", href: "#process" },
    { label: "FAQ", href: "#faq" },
  ] as NavItem[],
  /** Labelled portal links for the header. */
  portal: {
    signIn: { label: "Sign in", href: portalRoutes.signIn },
    signUp: { label: "Get started", href: portalRoutes.signUp },
  } satisfies Record<string, CtaLink>,
}

export interface PortalPageCopy {
  /** Doubles as the page `<h1>` and the metadata title. */
  title: string
  description: string
  /** Prompt above the link across to the other portal route. */
  crossLinkPrompt: string
  crossLink: CtaLink
}

/**
 * Copy for the `/login` and `/signup` stubs. Both pages share the badge and the
 * two buttons, so those live once at the top level.
 */
export const portal = {
  badge: "Portal opening soon",
  metaDescription: `The ${siteConfig.name} client portal is opening soon.`,
  emailCta: {
    label: `Email ${siteConfig.email}`,
    href: `mailto:${siteConfig.email}`,
  } satisfies CtaLink,
  backCta: { label: "Back to the site", href: "/" } satisfies CtaLink,
  signIn: {
    title: "Sign in",
    description:
      "Accounts are not live yet — we are still wiring up the client portal. Until it opens, email us and a person picks it up directly.",
    crossLinkPrompt: "Not working with us yet?",
    crossLink: { label: "Start an account", href: portalRoutes.signUp },
  } satisfies PortalPageCopy,
  signUp: {
    title: "Create an account",
    description:
      "Sign-up is not open yet. Email us the process that wastes the most time and we will map it for you before the portal launches — no sales call, no charge.",
    crossLinkPrompt: "Already working with us?",
    crossLink: { label: "Sign in", href: portalRoutes.signIn },
  } satisfies PortalPageCopy,
}

export const hero = {
  eyebrow: "Automation studio",
  title: "Stop paying people to copy and paste.",
  description:
    "Amakai builds the automations and internal software your team keeps saying somebody should get around to. We map the manual work, wire up the tools you already pay for, and hand back systems that run without anyone watching them.",
  primaryCta: { label: "Create an account", href: portalRoutes.signUp } satisfies CtaLink,
  secondaryCta: { label: "Sign in", href: portalRoutes.signIn } satisfies CtaLink,
  note: "No sales call to get started. Open an account and tell us which process hurts most.",
  /** Trigger → three steps → outcome, rendered as the hero's workflow diagram. */
  workflow: {
    trigger: { meta: "Trigger", label: "Order lands in the store" } satisfies WorkflowNode,
    steps: [
      { meta: "Step 01", label: "Check stock, flag the exceptions" },
      { meta: "Step 02", label: "Raise the invoice in accounting" },
      { meta: "Step 03", label: "Post the handover to the ops channel" },
    ] satisfies WorkflowNode[],
    outcome: { meta: "Outcome", label: "Nobody opens a spreadsheet" } satisfies WorkflowNode,
    stat: {
      value: "14 hrs",
      label: "handed back to the team every week",
    },
  },
}

export const trustStrip = {
  label: "Built on tooling you already own",
  items: ["n8n", "Make", "OpenAI", "Supabase", "Stripe"],
}

export const services = {
  id: "services",
  eyebrow: "What we build",
  title: "Six ways we take work off your team.",
  description:
    "Most engagements start with one of these and grow from there. Everything is built on your accounts, in your stack, and handed over documented.",
  items: [
    {
      title: "Workflow automation",
      description:
        "The repetitive path between your apps — orders, onboarding, approvals, invoicing — rebuilt as a workflow that runs on its own and pings a human only when something genuinely needs judgement.",
      Icon: FlowArrowIcon,
    },
    {
      title: "AI agents and assistants",
      description:
        "Assistants for the messy inputs: inbound email, supplier PDFs, support tickets, half-filled forms. They read, classify, draft and route, and they escalate instead of guessing.",
      Icon: RobotIcon,
    },
    {
      title: "App and data integrations",
      description:
        "Your CRM, accounting, inventory and spreadsheets finally talking to each other, with one record of the truth instead of five that quietly disagree.",
      Icon: PlugsConnectedIcon,
    },
    {
      title: "Internal tools and dashboards",
      description:
        "The admin screen your team actually needs — search, edit, approve, export — shaped around how they work rather than what an off-the-shelf product happens to allow.",
      Icon: SquaresFourIcon,
    },
    {
      title: "Reporting pipelines",
      description:
        "Numbers that assemble themselves. Scheduled pulls from every source, checks that catch the gaps, and the report sitting in your inbox before Monday's meeting.",
      Icon: ChartLineUpIcon,
    },
    {
      title: "Custom SaaS builds",
      description:
        "When the way you work is the advantage, we build the product around it — accounts, billing, permissions and the rest of the boring foundations included.",
      Icon: CubeIcon,
    },
  ] satisfies ServiceItem[],
}

/**
 * Named `processSection` rather than `process` so importing it never shadows
 * Node's global `process`.
 */
export const processSection = {
  id: "process",
  eyebrow: "How it works",
  title: "Map it, price it, build it, run it.",
  description:
    "Four stages, no open-ended discovery bill. You know the scope and the cost before anyone writes code.",
  steps: [
    {
      step: "01",
      title: "Map",
      description:
        "We sit with the people doing the work and write down every step, click and workaround. It usually takes a week, and the map is yours whether or not you hire us to build anything.",
      duration: "Week 1",
      Icon: MapTrifoldIcon,
    },
    {
      step: "02",
      title: "Blueprint",
      description:
        "A written plan: what gets automated first, which systems it touches, what it costs, and the hours it should give back. Fixed scope, fixed price, no surprises invoiced later.",
      duration: "Week 2",
      Icon: BlueprintIcon,
    },
    {
      step: "03",
      title: "Build",
      description:
        "We build in short passes and put each piece in front of your team as it lands, so the awkward edge cases surface while they are still cheap to fix.",
      duration: "Weeks 3-6",
      Icon: WrenchIcon,
    },
    {
      step: "04",
      title: "Run",
      description:
        "We watch it in production, fix what breaks, then hand over the keys with documentation and alerting. Keep us on retainer or take it in-house — the code is yours either way.",
      duration: "Ongoing",
      Icon: FlowArrowIcon,
    },
  ] satisfies ProcessStep[],
}

export const faq = {
  id: "faq",
  eyebrow: "Questions",
  title: "The things people ask before they start.",
  description:
    "If your question is not here, open an account and ask it directly — a person answers.",
  items: [
    {
      value: "item-1",
      question: "What size of problem is worth automating?",
      answer:
        "If a task eats more than about two hours a week and follows rules someone can write down, it is worth a look. First projects are deliberately narrow — one painful process, not your whole operation — so you see the return before committing to anything bigger.",
    },
    {
      value: "item-2",
      question: "How long does a first project take?",
      answer:
        "Most first builds ship in four to six weeks: roughly a week mapping the process, a week agreeing the blueprint, then two to four weeks building and testing alongside your team. A single integration can be live in days.",
    },
    {
      value: "item-3",
      question: "Do we have to replace the software we already use?",
      answer:
        "Almost never. We build on top of what you own, so your CRM, accounting and spreadsheets stay exactly where they are. We work with tools like n8n, Make, Supabase, Stripe and the OpenAI API, and we will tell you when an off-the-shelf product would be cheaper than anything we could build for you.",
    },
    {
      value: "item-4",
      question: "Who owns the code and the automations?",
      answer:
        "You do, outright. Everything is built in your accounts and your repositories with no lock-in clause. If we stopped working together tomorrow, nothing switches off and any competent developer can pick it up.",
    },
    {
      value: "item-5",
      question: "What happens to our data?",
      answer:
        "It stays in systems you control. We work with least-privilege access, remove our own when a project ends, and keep your customer data out of model training. We will sign your NDA and data processing agreement, and if a workflow has to stay entirely inside your infrastructure, we build it that way.",
    },
    {
      value: "item-6",
      question: "What happens after handover?",
      answer:
        "You get documentation, a walkthrough with your team and a recording of it. Automations tend to fail quietly, so every build ships with alerting that tells you the moment something stops. From there you can run it yourself or keep us on a support retainer — most teams start with a month and decide after that.",
    },
  ] satisfies FaqItem[],
}

export const finalCta = {
  id: "get-started",
  eyebrow: "Get started",
  title: "Find out what your manual work is costing you.",
  description:
    "Open an account and describe the process that wastes the most time. We will come back with a map of it, an honest estimate of the hours it is eating, and what it would take to automate — before you spend anything.",
  primaryCta: { label: "Create an account", href: portalRoutes.signUp } satisfies CtaLink,
  secondaryCta: { label: "Sign in", href: portalRoutes.signIn } satisfies CtaLink,
  note: "Free to set up. No card, no sales call.",
}

export const footer = {
  tagline: siteConfig.tagline,
  columns: [
    {
      title: "Explore",
      links: [
        { label: "Services", href: "#services" },
        { label: "Process", href: "#process" },
        { label: "FAQ", href: "#faq" },
      ],
    },
    {
      title: "Portal",
      links: [
        { label: "Sign in", href: portalRoutes.signIn },
        { label: "Create an account", href: portalRoutes.signUp },
      ],
    },
    {
      title: "Contact",
      links: [{ label: siteConfig.email, href: `mailto:${siteConfig.email}` }],
    },
  ] satisfies FooterColumn[],
  copyright: (year: number) => `© ${year} ${siteConfig.name}. All rights reserved.`,
}
