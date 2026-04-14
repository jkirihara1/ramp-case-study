import { CheckCircle, Users, Code, ArrowRight, GitBranch, Info } from "lucide-react";

const phases = [
  {
    num: 1,
    title: "Co-Design",
    icon: Users,
    color: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600",
    items: [
      "Partner with all stakeholders who rely on the rewards subledger — accounting (JE owner), FP&A (reporting), treasury (liability exposure management)",
      "Map every JE line to its source event and accounting rule",
      "Document unwritten assumptions, edge cases, and downstream reporting needs",
      "Stakeholders are design partners — their expertise is the input, not something the system replaces",
    ],
    outcome: "Handler specification reviewed and approved by all stakeholders",
  },
  {
    num: 2,
    title: "Build & Shadow",
    icon: Code,
    color: "bg-indigo-50 border-indigo-200",
    iconColor: "text-indigo-600",
    items: [
      "Build handlers for each rewards event type",
      "Run handlers against historical data and compare output to the manual JE",
      "Accountant validates side-by-side — every difference is investigated",
    ],
    outcome: "Handler output reconciles to manual JE within materiality",
  },
  {
    num: 3,
    title: "Parallel Run",
    icon: GitBranch,
    color: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
    items: [
      "Both processes run simultaneously for 1–2 close cycles",
      "Differences reconciled — each one surfaces a bug or undocumented rule",
      "All stakeholders (accounting, FP&A, treasury) validate output meets their needs",
    ],
    outcome: "Two consecutive periods with zero unexplained differences",
  },
  {
    num: 4,
    title: "Primary Cutover",
    icon: CheckCircle,
    color: "bg-green-50 border-green-200",
    iconColor: "text-green-600",
    items: [
      "System becomes primary; accountant shifts to reviewer and approver",
      "Manual 56-line JE process formally retired",
    ],
    outcome: "Accounting owns the review; engineering owns the platform",
  },
];

const solutionComponents = [
  {
    label: "Event Types",
    items: [
      { text: "Rewards Earning (incl. reversals)", note: null },
      { text: "Redemption (3 channels)", note: null },
    ],
    footnote: null,
  },
  {
    label: "Handlers",
    items: [
      { text: "Earning → Rewards Expense + Rewards Liability", note: null },
      { text: "Statement Credit → Rewards Liability + Cash", note: null },
      { text: "Gift Card (A/B) → Rewards Liability + Cash + Gain", note: null },
    ],
    footnote: null,
  },
  {
    label: "GL Accounts",
    items: [
      { text: "10100 — Cash (settlements)", note: null },
      { text: "22001 — Rewards Liability", note: null },
      { text: "60201 — Rewards Expense", note: null },
    ],
    footnote: null,
  },
];

export default function Approach() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Rewards Onboarding: Approach</h2>
        <p className="text-gray-500 mt-1">
          Replacing the 56-line manual monthly JE with event-driven subledger entries
        </p>
      </div>

      {/* ── Section A: Proposed Solution Design ────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Section A — Conceptual Solution Design</h3>
        <p className="text-sm text-gray-500 mb-4">
          Rewards can fit into the same architecture as Part 1, but with new source systems for rewards data.
          Onboarding these sources requires defining data models for the new event types (earnings, redemptions)
          and building data pipelines to integrate them into the subledger solution.
        </p>

        {/* Architecture flow */}
        <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
          {["Source Event", "Handler", "Subledger Entry", "JE Line", "GL Post"].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-700">
                {step}
              </div>
              {i < 4 && <ArrowRight size={14} className="text-gray-400" />}
            </div>
          ))}
        </div>

        {/* Component grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {solutionComponents.map((comp) => (
            <div key={comp.label} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">{comp.label}</h4>
              <ul className="space-y-1">
                {comp.items.map((item, j) => (
                  <li key={j} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-gray-400 mt-px">›</span>
                    <span className="font-mono">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Breakage callout */}
        <div className="mt-4 bg-amber-50 rounded-lg border border-amber-200 p-3 flex items-start gap-2.5">
          <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            <strong>Breakage Reserve</strong> is not event-driven — it is a portfolio-level accounting estimate,
            not triggered by individual source events. Our solution will directly calculate the reserve balance
            and generate the required true-up journal entry each period. See the
            Breakage Reserve page for our proposed methodology and calculation approach.
          </p>
        </div>

        {/* Multi-entity callout */}
        <div className="mt-3 bg-blue-50 rounded-lg border border-blue-200 p-3 flex items-start gap-2.5">
          <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            <strong>Multi-entity:</strong> Entity is derived from currency — USD = Ramp Financial LLC, CAD = Ramp Canada.
            Handlers and entry templates are currency-agnostic; the entity dimension flows through from the
            source event and determines GL mapping at JE generation time.
          </p>
        </div>
      </div>

      {/* ── Section B: Implementation Approach ─────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Section B — Implementation Approach</h3>
        <p className="text-sm text-gray-500 mb-4">
          A phased rollout emphasizing cross-functional co-design and gradual trust-building.
          Stakeholders who rely on the rewards subledger — accounting, FP&A, treasury — are design
          partners whose expertise shapes the system. Trust is earned through demonstrated accuracy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {phases.map((phase) => (
            <div key={phase.num} className={`rounded-lg border p-4 ${phase.color}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${phase.iconColor}`}>
                  <phase.icon size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    Phase {phase.num}: {phase.title}
                  </h4>
                  <ul className="mt-1.5 space-y-0.5">
                    {phase.items.map((item, j) => (
                      <li key={j} className="text-xs text-gray-700 flex items-start gap-1.5">
                        <span className="text-gray-400 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Exit: {phase.outcome}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
