import { ArrowRight, ArrowDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { rollforward, monthlyActivity } from "../data/seedData";

const fmt = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
const fmtPts = (v) => new Intl.NumberFormat("en-US").format(Math.round(v));

export default function Rollforward({ selectedPeriod }) {
  const rf = rollforward.find((r) => r.period === selectedPeriod);
  if (!rf) return <div className="text-gray-500 p-8">No data for this period.</div>;

  // Waterfall data for chart
  const waterfallData = [
    { name: "Opening", value: rf.openingDollars, fill: "#94a3b8" },
    { name: "Earned", value: rf.earnedDollars, fill: "#6366f1" },
    { name: "Reversed", value: rf.reversedDollars, fill: "#f87171" },
    { name: "Redeemed", value: -rf.redeemedDollars, fill: "#fb923c" },
    { name: "Breakage", value: -rf.breakageDollars, fill: "#fbbf24" },
    { name: "Closing", value: rf.closingDollars, fill: "#10b981" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Rewards Rollforward</h2>
        <p className="text-gray-500 mt-1">{rf.label} — Rewards liability activity rollforward</p>
      </div>

      {/* Current period rollforward */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Period Rollforward</h3>
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
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 text-red-600 font-bold">−</td>
                <td className="px-4 py-3 text-gray-700">
                  Breakage Applied
                  <span className="ml-2 text-xs text-gray-400">(5% of closing before breakage)</span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-red-600">({fmtPts(rf.breakageApplied)})</td>
                <td className="px-4 py-3 text-right font-mono text-red-600">({fmt(rf.breakageDollars)})</td>
              </tr>
              <tr className="border-t-2 border-gray-300 bg-indigo-50 font-semibold">
                <td className="px-4 py-3 text-indigo-600">=</td>
                <td className="px-4 py-3 text-indigo-900">Closing Balance</td>
                <td className="px-4 py-3 text-right font-mono">{fmtPts(rf.closing)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt(rf.closingDollars)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cross-references */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <ArrowRight size={12} className="text-indigo-500" />
            Closing balance ties to Outstanding Points Balance on Rewards Activity page
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <ArrowRight size={12} className="text-indigo-500" />
            Breakage Applied ties to True-Up amount on Breakage Reserve page
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <ArrowRight size={12} className="text-indigo-500" />
            All amounts flow into the Proposed Journal Entry (Page 6)
          </div>
        </div>
      </div>

      {/* 3-Month comparative */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">3-Month Comparative Rollforward</h3>
        <div className="overflow-x-auto">
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
              <tr className="border-t border-gray-200">
                <td className="px-4 py-3 text-red-600 font-bold">−</td>
                <td className="px-4 py-3">Breakage Applied</td>
                {rollforward.map((r) => (
                  <td key={r.period} className={`px-4 py-3 text-right font-mono text-red-600 ${r.period === selectedPeriod ? "bg-indigo-50" : ""}`}>
                    ({fmt(r.breakageDollars)})
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
      </div>

      {/* Visual waterfall */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Waterfall — {rf.label}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={waterfallData} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => fmt(Math.abs(v))} />
            <ReferenceLine y={0} stroke="#000" />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {waterfallData.map((entry, i) => (
                <rect key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
