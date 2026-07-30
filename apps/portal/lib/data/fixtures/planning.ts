import type {
  ClarificationQuestion,
  PlanningStage,
  RequirementAnalysis,
} from "@/lib/domain/planning"

export const planningStageFixtures: PlanningStage[] = [
  {
    order: 1,
    name: "User Request Analysis",
    description:
      "Parse natural language input and establish context for the automation request",
    status: "complete",
  },
  {
    order: 2,
    name: "Intent Detection",
    description:
      "Determine business objective, automation type, and industry context",
    status: "complete",
  },
  {
    order: 3,
    name: "Requirement Extraction",
    description:
      "Extract actors, triggers, inputs, outputs, constraints, and goals",
    status: "complete",
  },
  {
    order: 4,
    name: "Capability Identification",
    description:
      "Map business requirements to technical capabilities and platform features",
    status: "complete",
  },
  {
    order: 5,
    name: "Task Decomposition",
    description:
      "Break down the automation into discrete, ordered tasks and decision points",
    status: "active",
  },
  {
    order: 6,
    name: "Component Discovery",
    description:
      "Search component repository, rank by suitability, and resolve dependency conflicts",
    status: "pending",
  },
  {
    order: 7,
    name: "Workflow Planning",
    description:
      "Construct execution graph with sequential, parallel, conditional, and approval nodes",
    status: "pending",
  },
  {
    order: 8,
    name: "Configuration Generation",
    description:
      "Generate API endpoints, auth, prompts, retry policies, and input/output mappings",
    status: "pending",
  },
  {
    order: 9,
    name: "Validation",
    description:
      "Run schema, dependency, security, and configuration validation checks",
    status: "pending",
  },
  {
    order: 10,
    name: "Deployment",
    description:
      "Review deployment plan with environment separation and version management",
    status: "pending",
  },
]

export const clarificationQuestionFixtures: ClarificationQuestion[] = [
  {
    id: "q-001",
    question:
      "What approval threshold should trigger manager review for expense reports?",
    answered: true,
  },
  {
    id: "q-002",
    question:
      "Should finance team review be required for all reports over $5,000, or only international expenses?",
    answered: false,
  },
  {
    id: "q-003",
    question:
      "Which payroll system should receive approved reimbursement requests (Workday, ADP, or custom API)?",
    answered: false,
  },
]

export const sampleAnalysisFixture: RequirementAnalysis = {
  intent:
    "Automate expense report submission, policy validation, multi-level approval, and reimbursement processing",
  domain: "Finance / HR Operations",
  complexity: "medium",
  objectives: [
    "Validate expense reports against company policy rules automatically",
    "Route reports through manager and finance approval based on amount thresholds",
    "Integrate with payroll system for reimbursement processing",
    "Send notifications at each approval stage",
    "Maintain audit trail for compliance",
  ],
  missingInfo: [
    "Finance review threshold amount and scope",
    "Target payroll system integration endpoint",
    "Notification channel preferences (email, Slack, or both)",
  ],
}
