import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { breakageReserve, rollforward, BREAKAGE_RATE } from "../data/seedData";

const fmt = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
const fmtPts = (v) => new Intl.NumberFormat("en-US").format(Math.round(v));

export default function BreakageReserve({ selectedPeriod }) {
  const br = breakageReserve.find((b) => b.period === selectedPeriod);
  const rf = rollforward.find((r) => r.period === selectedPeriod);
  const [comparativeOpen, setComparativeOpen] = useState(false);

  if (!br || !rf) return <div className="text-gray-500 p-8">No data for this period.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Breakage Reserve</h2>
        <p className="text-gray-500 mt-1">{br.label} — Rewards liability rollforward and breakage estimate</p>
      </div>

      {/* ── Section A: Rewards Rollforward (basis for breakage) ─────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rewards Liability Rollforward</h3>
        <p className="text-sm text-gray-500 mb-4">
          The outstanding points balance at period end is the basis for the breakage reserve calculation below.
        </p>
        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-4 py-3 font-medium w-8"></th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-right px-4 py-3 font-medium">Points</th>
                <th className="text-right px-4 py-3 font-medium">$ Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 font-semibold text-gray-900">Opening Balance</td>
                <td className="px-4 py-3 text-right font-mono">{fmtPts(rf.opening)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(rf.openingDollars)}</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 text-green-600 font-bold">+</td>
                <td className="px-4 py-3 text-gray-700">Points Earned</td>
                <td className="px-4 py-3 text-right font-mono text-green-700">{fmtPts(rf.earned)}</td>
                <td className="px-4 py-3 text-right font-mono text-green-700">{fmt(rf.earnedDollars)}</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 text-red-600 font-bold">−</td>
                <td className="px-4 py-3 text-gray-700">Points Reversed</td>
                <td className="px-4 py-3 text-right font-mono text-red-600">({fmtPts(Math.abs(rf.reversed))})</td>
                <td className="px-4 py-3 text-right font-mono text-red-600">({fmt(Math.abs(rf.reversedDollars))})</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 text-red-600 font-bold">−</td>
                <td className="px-4 py-3 text-gray-700">Points Redeemed</td>
                <td className="px-4 py-3 text-right font-mono text-red-600">({fmtPts(rf.redeemed)})</td>
                <td className="px-4 py-3 text-right font-mono text-red-600">({fmt(rf.redeemedDollars)})</td>
              </tr>
              <tr className="border-t-2 border-gray-300 bg-indigo-50 font-semibold">
                <td className="px-4 py-3 text-indigo-600">=</td>
                <td className="px-4 py-3 text-indigo-900">Closing Balance (Outstanding Points)</td>
                <td className="px-4 py-3 text-right font-mono">{fmtPts(rf.closing)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(rf.closingDollars)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3-Month comparative (collapsible) */}
        <div className="mt-4">
          <button
            onClick={() => setComparativeOpen(!comparativeOpen)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            {comparativeOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="font-medium">3-Month Comparative</span>
          </button>
          {comparativeOpen && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="px-4 py-3 font-medium w-8"></th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    {rollforward.map((r) => (
                      <th key={r.period} className={`px-4 py-3 font-medium text-right ${r.period === selectedPeriod ? "text-indigo-600" : ""}`}>
                        {r.label.replace(" 2025", "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 font-semibold">Opening Balance</td>
                    {rollforward.map((r) => (
                      <td key={r.period} className={`px-4 py-3 text-right font-mono ${r.period === selectedPeriod ? "bg-indigo-50" : ""}`}>
                        {fmt(r.openingDollars)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-4 py-3 text-green-600 font-bold">+</td>
                    <td className="px-4 py-3">Points Earned</td>
                    {rollforward.map((r) => (
                      <td key={r.period} className={`px-4 py-3 text-right font-mono text-green-700 ${r.period === selectedPeriod ? "bg-indigo-50" : ""}`}>
                        {fmt(r.earnedDollars)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-4 py-3 text-red-600 font-bold">−</td>
                    <td className="px-4 py-3">Points Reversed</td>
                    {rollforward.map((r) => (
                      <td key={r.period} className={`px-4 py-3 text-right font-mono text-red-600 ${r.period === selectedPeriod ? "bg-indigo-50" : ""}`}>
                        ({fmt(Math.abs(r.reversedDollars))})
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="px-4 py-3 text-red-600 font-bold">−</td>
                    <td className="px-4 py-3">Points Redeemed</td>
                    {rollforward.map((r) => (
                      <td key={r.period} className={`px-4 py-3 text-right font-mono text-red-600 ${r.period === selectedPeriod ? "bg-indigo-50" : ""}`}>
                        ({fmt(r.redeemedDollars)})
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t-2 border-gray-300 bg-indigo-50 font-semibold">
                    <td className="px-4 py-3 text-indigo-600">=</td>
                    <td className="px-4 py-3 text-indigo-900">Closing Balance</td>
                    {rollforward.map((r) => (
                      <td key={r.period} className={`px-4 py-3 text-right font-mono ${r.period === selectedPeriod ? "bg-indigo-100" : ""}`}>
                        {fmt(r.closingDollars)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Section B: Methodology ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Methodology</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">1</div>
              <div>
                <p className="text-sm font-medium text-gray-900">Breakage Rate Assumption</p>
                <p className="text-sm text-gray-600">~5% of earned rewards points will never be redeemed, based on industry benchmarks and portfolio analysis</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">2</div>
              <div>
                <p className="text-sm font-medium text-gray-900">Portfolio-Level Basis</p>
                <p className="text-sm text-gray-600">Applied to total outstanding points balance across all businesses — not per-business or per-cohort</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">3</div>
              <div>
                <p className="text-sm font-medium text-gray-900">No Point Expiration</p>
                <p className="text-sm text-gray-600">Under current terms, rewards do not expire. Breakage is a behavioral estimate, not a contractual forfeiture.</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Formula</p>
            <div className="space-y-2 font-mono text-sm">
              <p className="text-gray-700">Outstanding Points × Breakage Rate = Reserve</p>
              <p className="text-gray-500 text-xs mt-2">Period true-up:</p>
              <p className="text-gray-700">Current Reserve − Prior Reserve = True-Up Amount</p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Rate should be reviewed quarterly based on actual redemption patterns. In practice,
                this would be supported by actuarial analysis or historical trend modeling.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section C: Current Period Calculation ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Period Calculation</h3>
        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-right px-4 py-3 font-medium">Points</th>
                <th className="text-right px-4 py-3 font-medium">$ Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 text-gray-700">Outstanding points balance (from rollforward above)</td>
                <td className="px-4 py-3 text-right font-mono">{fmtPts(br.outstandingPoints)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(br.outstandingDollars)}</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 text-gray-700">
                  Breakage rate
                  <span className="ml-2 text-xs text-gray-400">(configurable)</span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{(br.breakageRate * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right font-mono">—</td>
              </tr>
              <tr className="border-t-2 border-gray-300 font-semibold bg-indigo-50">
                <td className="px-4 py-3 text-indigo-900">Calculated Reserve</td>
                <td className="px-4 py-3 text-right font-mono">{fmtPts(br.calculatedReserve)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(br.calculatedReserveDollars)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section D: True-Up ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">True-Up Calculation</h3>
        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-4 py-3 font-medium w-8">Line</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-right px-4 py-3 font-medium">$ Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 font-mono text-gray-400">A</td>
                <td className="px-4 py-3 text-gray-700">Prior period reserve balance (from GL)</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(br.priorReserveDollars)}</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 font-mono text-gray-400">B</td>
                <td className="px-4 py-3 text-gray-700">Current period calculated reserve</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(br.calculatedReserveDollars)}</td>
              </tr>
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td className="px-4 py-3 font-mono text-gray-400">C</td>
                <td className="px-4 py-3 text-gray-900">
                  True-up amount (B − A)
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded ${br.trueUp >= 0 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                    {br.direction}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{fmt(br.trueUpDollars)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Directional guidance */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`rounded-lg p-3 border ${br.trueUp >= 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
            <p className="text-sm font-medium text-gray-700">If true-up is positive →</p>
            <p className="text-xs text-gray-500 mt-1">
              Additional reserve needed: DR Rewards Liability, CR Rewards Expense — Breakage
            </p>
          </div>
          <div className={`rounded-lg p-3 border ${br.trueUp < 0 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
            <p className="text-sm font-medium text-gray-700">If true-up is negative →</p>
            <p className="text-xs text-gray-500 mt-1">
              Reserve release: DR Rewards Expense — Breakage, CR Rewards Liability
            </p>
          </div>
        </div>

        {/* Cross-reference */}
        <div className="mt-4 flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg px-4 py-2 border border-indigo-200">
          <ArrowRight size={14} />
          <span>This true-up amount flows to the JE Preview (Page 5), breakage lines.</span>
        </div>
      </div>

    </div>
  );
}
