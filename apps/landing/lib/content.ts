import type { Icon } from "@phosphor-icons/react"
import {
  BrainIcon,
  ChartLineUpIcon,
  ChatCircleTextIcon,
  CloudArrowUpIcon,
  CodeIcon,
  CpuIcon,
  FlowArrowIcon,
  GaugeIcon,
  GraphIcon,
  HeadsetIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  PackageIcon,
  PlugsConnectedIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  StorefrontIcon,
  TreeStructureIcon,
  UsersThreeIcon,
  WrenchIcon,
} from "@phosphor-icons/react/ssr"

import {
  portalRoutes,
  siteConfig as baseSiteConfig,
} from "@amakai/shared/lib/site-config"

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

export interface CapabilityItem {
  title: string
  description: string
  Icon: Icon
}

export interface HowItWorksStep {
  /** Zero-padded index for tabular display, e.g. "01". */
  step: string
  title: string
  description: string
  duration: string
  Icon: Icon
}

export interface UseCaseItem {
  persona: string
  headline: string
  description: string
  Icon: Icon
}

export interface PlatformTeamItem {
  role: string
  description: string
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

export { portalRoutes }

export const siteConfig = {
  ...baseSiteConfig,
  nav: [
    { label: "Capabilities", href: "#capabilities" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Use cases", href: "#use-cases" },
    { label: "FAQ", href: "#faq" },
  ] as NavItem[],
  /** Labelled portal links for the header — point at the portal app's domain. */
  portal: {
    signIn: { label: "Sign in", href: portalRoutes.signIn },
    signUp: { label: "Get started", href: portalRoutes.signUp },
  } satisfies Record<string, CtaLink>,
}

export const hero = {
  eyebrow: "AI Workflow Assembly Platform",
  title: "Describe a workflow. Deploy it in minutes.",
  description:
    "AmakAI is an intelligent automation operating system that assembles workflows from predefined, reusable components — not generated code. Describe your requirements in natural language, and the platform configures, validates, deploys, and monitors production-ready pipelines for you.",
  primaryCta: { label: "Start building", href: portalRoutes.signUp } satisfies CtaLink,
  secondaryCta: { label: "Sign in", href: portalRoutes.signIn } satisfies CtaLink,
  note: "Free to start. Describe your first workflow and see it assembled.",
  /** NL input → assembly steps → outcome, rendered as the hero's workflow diagram. */
  workflow: {
    trigger: {
      meta: "Input",
      label: "When a support ticket is tagged urgent…",
    } satisfies WorkflowNode,
    steps: [
      { meta: "Step 01", label: "AI selects matching components" },
      { meta: "Step 02", label: "Auto-configures APIs, auth, and retries" },
      { meta: "Step 03", label: "Validates the graph before deploy" },
    ] satisfies WorkflowNode[],
    outcome: {
      meta: "Outcome",
      label: "Live in production — monitored and optimized",
    } satisfies WorkflowNode,
    stat: {
      value: "Minutes",
      label: "from description to deployed workflow",
    },
  },
}

export const trustStrip = {
  label: "Powered by a growing component ecosystem",
  items: ["n8n", "Make", "OpenAI", "Supabase", "Stripe"],
}

export const capabilities = {
  id: "capabilities",
  eyebrow: "Platform capabilities",
  title: "From requirement to optimized automation — automatically.",
  description:
    "Every stage of the workflow lifecycle is handled by the platform. You describe the outcome; AmakAI assembles, configures, validates, deploys, and keeps it running.",
  items: [
    {
      title: "Natural language input",
      description:
        "Describe business needs in plain English. The AI extracts objectives, identifies missing details, and asks clarifying questions when needed.",
      Icon: ChatCircleTextIcon,
    },
    {
      title: "Workflow graph generation",
      description:
        "Requirements become visual, executable pipeline graphs — sequential, parallel, conditional, or event-driven — ready to inspect before anything runs.",
      Icon: GraphIcon,
    },
    {
      title: "Smart component matching",
      description:
        "The platform searches a library of predefined components, ranks them by suitability, resolves dependency conflicts, and ensures version compatibility.",
      Icon: MagnifyingGlassIcon,
    },
    {
      title: "Auto-configuration",
      description:
        "Endpoints, authentication, prompt templates, retry policies, timeouts, rate limits, and input/output mappings are filled in automatically.",
      Icon: SlidersHorizontalIcon,
    },
    {
      title: "Pre-deploy validation",
      description:
        "Correctness checks catch conflicts, missing credentials, and incompatible connections before a workflow reaches production.",
      Icon: ShieldCheckIcon,
    },
    {
      title: "One-click deployment",
      description:
        "Push validated pipelines to production with minimal setup. No manual wiring between services or hand-written integration glue.",
      Icon: RocketLaunchIcon,
    },
    {
      title: "Live execution monitoring",
      description:
        "Real-time visibility into every workflow run — step status, errors, retries, and human-in-the-loop checkpoints as they happen.",
      Icon: GaugeIcon,
    },
    {
      title: "Performance optimization",
      description:
        "Continuous analysis surfaces bottlenecks, failed steps, and tuning opportunities so workflows get faster and more reliable over time.",
      Icon: LightningIcon,
    },
    {
      title: "Operational analytics",
      description:
        "Dashboards, metrics, and actionable insights across your entire automation estate — volume, latency, success rates, and cost.",
      Icon: ChartLineUpIcon,
    },
  ] satisfies CapabilityItem[],
}

export const howItWorks = {
  id: "how-it-works",
  eyebrow: "How it works",
  title: "Describe, assemble, deploy, optimize.",
  description:
    "Five steps from a plain-language requirement to a production workflow that monitors and improves itself.",
  steps: [
    {
      step: "01",
      title: "Describe",
      description:
        "State your automation need in natural language — who triggers it, what systems it touches, and what the outcome should be.",
      duration: "Instant",
      Icon: ChatCircleTextIcon,
    },
    {
      step: "02",
      title: "Assemble",
      description:
        "AI selects and connects predefined components from the library into a workflow graph you can review and adjust.",
      duration: "Seconds",
      Icon: TreeStructureIcon,
    },
    {
      step: "03",
      title: "Configure & validate",
      description:
        "Parameters are auto-filled, credentials mapped, and the graph validated for correctness before anything goes live.",
      duration: "Automatic",
      Icon: ShieldCheckIcon,
    },
    {
      step: "04",
      title: "Deploy",
      description:
        "Push the validated pipeline to production with one action. No manual integration work or deployment scripts.",
      duration: "One click",
      Icon: CloudArrowUpIcon,
    },
    {
      step: "05",
      title: "Monitor & optimize",
      description:
        "Track every execution in real time. Analytics and optimization suggestions keep workflows fast and reliable.",
      duration: "Ongoing",
      Icon: ChartLineUpIcon,
    },
  ] satisfies HowItWorksStep[],
}

export const useCases = {
  id: "use-cases",
  eyebrow: "Built for your team",
  title: "Automation for every role, not just engineers.",
  description:
    "Whether you run a small business or an enterprise platform team, AmakAI turns natural-language requirements into workflows that fit how you work.",
  items: [
    {
      persona: "Small & medium businesses",
      headline: "Onboard new clients without manual data entry",
      description:
        "Describe the onboarding flow once. The platform assembles CRM updates, welcome emails, and task assignments into a pipeline that runs on every new signup.",
      Icon: StorefrontIcon,
    },
    {
      persona: "Enterprise organizations",
      headline: "Cross-department approval chains with audit trails",
      description:
        "Build multi-step approval workflows with conditional branching, parallel reviews, and a complete execution history for compliance.",
      Icon: UsersThreeIcon,
    },
    {
      persona: "Marketing agencies",
      headline: "Campaign reporting pipelines that assemble themselves",
      description:
        "Pull data from ad platforms, analytics, and CRMs into scheduled reports — assembled from components, not stitched together by hand.",
      Icon: MegaphoneIcon,
    },
    {
      persona: "Customer support teams",
      headline: "Route, classify, and escalate tickets automatically",
      description:
        "Describe your routing rules in plain language. AI classifies inbound tickets, assigns priority, and escalates when a human is needed.",
      Icon: HeadsetIcon,
    },
    {
      persona: "Sales organizations",
      headline: "Lead enrichment and CRM sync on every inbound form",
      description:
        "Every form submission triggers enrichment, deduplication, and CRM updates — validated and deployed without writing integration code.",
      Icon: FlowArrowIcon,
    },
    {
      persona: "Software developers",
      headline: "Extend workflows with custom components and APIs",
      description:
        "Publish reusable building blocks to the component library and wire them into AI-assembled graphs alongside prebuilt integrations.",
      Icon: CodeIcon,
    },
    {
      persona: "IT administrators",
      headline: "Provision accounts and enforce policies across systems",
      description:
        "Automate user provisioning, access reviews, and policy enforcement across your stack with auditable, monitored workflows.",
      Icon: WrenchIcon,
    },
  ] satisfies UseCaseItem[],
}

export const platformTeams = {
  id: "platform-teams",
  eyebrow: "For platform teams",
  title: "Govern, extend, and operate at scale.",
  description:
    "Administrative roles get the controls they need to manage the platform, its components, and the workflows running on it.",
  items: [
    {
      role: "Platform administrators",
      description:
        "Org-wide governance, roles, environment control, and policy enforcement across every team and workflow.",
      Icon: UsersThreeIcon,
    },
    {
      role: "Component developers",
      description:
        "Publish, version, and maintain reusable workflow building blocks in the shared component library.",
      Icon: PackageIcon,
    },
    {
      role: "AI engineers",
      description:
        "Tune models, prompts, and intelligent configuration rules that power auto-assembly and parameter generation.",
      Icon: BrainIcon,
    },
    {
      role: "DevOps engineers",
      description:
        "Deployment pipelines, scaling policies, and infrastructure hooks for reliable workflow execution at volume.",
      Icon: CpuIcon,
    },
    {
      role: "Security administrators",
      description:
        "Access control, audit logs, credential management, and compliance posture across the entire platform.",
      Icon: ShieldCheckIcon,
    },
    {
      role: "System operators",
      description:
        "Uptime monitoring, incident response, and operational dashboards for every workflow in production.",
      Icon: GaugeIcon,
    },
  ] satisfies PlatformTeamItem[],
  cta: {
    label: "Talk to us about enterprise",
    href: `mailto:${baseSiteConfig.email}`,
  } satisfies CtaLink,
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
      question: "How is this different from writing code or using Zapier?",
      answer:
        "AmakAI assembles workflows from a library of predefined, tested components — it does not generate arbitrary code. Unlike manual wiring in integration tools, the platform uses AI to select components, configure parameters, and validate the graph before deployment. You describe the outcome; the platform handles the assembly.",
    },
    {
      value: "item-2",
      question: "What can I describe in natural language?",
      answer:
        "Business processes, triggers, systems involved, and desired outcomes — for example, \"When a support ticket is tagged urgent, classify it, notify the on-call lead, and create a Slack thread.\" The AI extracts objectives, estimates complexity, and asks clarifying questions when details are missing.",
    },
    {
      value: "item-3",
      question: "What happens before a workflow goes live?",
      answer:
        "Every workflow passes through pre-deploy validation: dependency checks, credential mapping, conflict detection, and a preview of the execution graph. You review the assembled pipeline before deploying, and rollback is available if something needs adjusting after launch.",
    },
    {
      value: "item-4",
      question: "Can I use my existing tools?",
      answer:
        "Yes. The component ecosystem includes integrations for tools like n8n, Make, OpenAI, Supabase, Stripe, and more. Workflows connect to the systems you already use — the platform assembles the pipeline; your tools stay where they are.",
    },
    {
      value: "item-5",
      question: "How do I monitor workflows after deployment?",
      answer:
        "Every deployed workflow gets real-time execution monitoring — step status, errors, retries, and human-in-the-loop checkpoints. Operational analytics dashboards show volume, latency, success rates, and optimization suggestions across your entire automation estate.",
    },
    {
      value: "item-6",
      question: "Who owns the workflows and data?",
      answer:
        "You do. Workflows run in your environment with your credentials and your data. AmakAI does not lock you in — components are reusable building blocks, and you retain full ownership of every pipeline the platform assembles.",
    },
  ] satisfies FaqItem[],
}

export const finalCta = {
  id: "get-started",
  eyebrow: "Get started",
  title: "Describe your first workflow. See it assembled.",
  description:
    "Open an account, describe a process in plain language, and watch the platform select components, configure parameters, and build an executable workflow graph — before you deploy anything.",
  primaryCta: { label: "Start building", href: portalRoutes.signUp } satisfies CtaLink,
  secondaryCta: { label: "Sign in", href: portalRoutes.signIn } satisfies CtaLink,
  note: "Free to start. No card required.",
}

export const footer = {
  tagline: siteConfig.tagline,
  columns: [
    {
      title: "Explore",
      links: [
        { label: "Capabilities", href: "#capabilities" },
        { label: "How it works", href: "#how-it-works" },
        { label: "Use cases", href: "#use-cases" },
        { label: "FAQ", href: "#faq" },
        { label: "Platform teams", href: "#platform-teams" },
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
