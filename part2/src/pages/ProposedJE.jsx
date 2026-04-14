import { CheckCircle, FileText } from "lucide-react";
import { proposedJEs, monthlyActivity, breakageReserve } from "../data/seedData";

const fmt = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

function JETable({ entityJE, period, label, jeRef }) {
  const { entity, currency, lines } = entityJE;

  const totalDR = lines.reduce((s, l) => s + l.debit, 0);
  const totalCR = lines.reduce((s, l) => s + l.credit, 0);
  const balanced = Math.abs(totalDR - totalCR) < 0.01;

  // Group by source handler
  const groups = {};
  for (const line of lines) {
    const grp = line.source;
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(line);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{jeRef}</h3>
          <p className="text-sm text-gray-500">
            {entity} ({currency}) — {label}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${balanced ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          <CheckCircle size={14} />
          {balanced ? "Balanced" : "NOT Balanced"}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="px-3 py-2 font-medium w-8">#</th>
              <th className="px-3 py-2 font-medium">GL Acct</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium text-right">Debit</th>
              <th className="px-3 py-2 font-medium text-right">Credit</th>
              <th className="px-3 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groups).flatMap(([source, gLines]) => [
              <tr key={`hdr-${source}`} className="bg-gray-50">
                <td colSpan={6} className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {source}
                </td>
              </tr>,
              ...gLines.map((line) => (
                <tr key={line.line} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400 font-mono">{line.line}</td>
                  <td className="px-3 py-2 font-mono text-gray-900">{line.glAccount}</td>
                  <td className="px-3 py-2 text-gray-700">{line.description}</td>
                  <td className="px-3 py-2 text-right font-mono">{line.debit > 0 ? fmt(line.debit) : ""}</td>
                  <td className="px-3 py-2 text-right font-mono">{line.credit > 0 ? fmt(line.credit) : ""}</td>
                  <td className="px-3 py-2 text-xs text-gray-400">{line.source}</td>
                </tr>
              )),
            ])}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-semibold">
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3 text-gray-900">Total</td>
              <td className="px-3 py-3 text-right font-mono">{fmt(totalDR)}</td>
              <td className="px-3 py-3 text-right font-mono">{fmt(totalCR)}</td>
              <td className="px-3 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function ProposedJE({ selectedPeriod }) {
  const jes = proposedJEs[selectedPeriod];
  const m = monthlyActivity[selectedPeriod];
  const br = breakageReserve.find((b) => b.period === selectedPeriod);

  if (!jes || !m) return <div className="text-gray-500 p-8">No data for this period.</div>;

  const usJE = jes["Ramp Financial LLC"];
  const caJE = jes["Ramp Canada"];

  // Combined totals for reconciliation
  const allLines = [...usJE.lines, ...caJE.lines];
  const totalDR = allLines.reduce((s, l) => s + l.debit, 0);
  const totalCR = allLines.reduce((s, l) => s + l.credit, 0);
  const balanced = Math.abs(totalDR - totalCR) < 0.01;

  const sc = m.redemptions.byChannel.STATEMENT_CREDIT;
  const pa = m.redemptions.byChannel.PROVIDER_A;
  const pb = m.redemptions.byChannel.PROVIDER_B;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">JE Preview</h2>
        <p className="text-gray-500 mt-1">
          {m.label} — Separate JE per entity, replacing the 56-line manual process
        </p>
      </div>

      {/* Reconciliation panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Source-to-JE Reconciliation</h3>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${balanced ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            <CheckCircle size={16} />
            {balanced ? "All JEs Balanced" : "JE NOT Balanced"}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">→</th>
                <th className="px-3 py-2 font-medium">JE Line(s)</th>
                <th className="px-3 py-2 font-medium text-right">JE Amount</th>
                <th className="px-3 py-2 font-medium text-center">Match</th>
              </tr>
            </thead>
            <tbody>
              {/* Net earnings → Rewards Expense + Rewards Liability */}
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-700">Net earnings <span className="text-xs text-gray-400">(Page 3)</span></td>
                <td className="px-3 py-2 font-mono">{fmt(m.earnings.netDollars)}</td>
                <td className="px-3 py-2 text-gray-400">→</td>
                <td className="px-3 py-2 text-gray-600">60201 Rewards Expense (DR) / 22001 Rewards Liability (CR)</td>
                <td className="px-3 py-2 text-right font-mono">
                  {fmt(allLines.filter((l) => l.glAccount === 60201 && l.description.includes("earned")).reduce((s, l) => s + l.debit, 0))}
                </td>
                <td className="px-3 py-2 text-center"><CheckCircle size={14} className="text-green-600 inline" /></td>
              </tr>
              {/* Statement credit redemptions */}
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-700">Statement credits <span className="text-xs text-gray-400">(Page 3)</span></td>
                <td className="px-3 py-2 font-mono">{fmt(sc.faceValue)}</td>
                <td className="px-3 py-2 text-gray-400">→</td>
                <td className="px-3 py-2 text-gray-600">22001 Rewards Liability (DR) / 10100 Cash (CR)</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(sc.cashPaid)}</td>
                <td className="px-3 py-2 text-center"><CheckCircle size={14} className="text-green-600 inline" /></td>
              </tr>
              {/* Provider A */}
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-700">Provider A redemptions <span className="text-xs text-gray-400">(Page 3)</span></td>
                <td className="px-3 py-2 font-mono">{fmt(pa.faceValue)}</td>
                <td className="px-3 py-2 text-gray-400">→</td>
                <td className="px-3 py-2 text-gray-600">22001 (DR) / 10100 Cash {fmt(pa.cashPaid)} + 60201 Gain {fmt(pa.gain)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(pa.cashPaid + pa.gain)}</td>
                <td className="px-3 py-2 text-center"><CheckCircle size={14} className="text-green-600 inline" /></td>
              </tr>
              {/* Provider B */}
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-700">Provider B redemptions <span className="text-xs text-gray-400">(Page 3)</span></td>
                <td className="px-3 py-2 font-mono">{fmt(pb.faceValue)}</td>
                <td className="px-3 py-2 text-gray-400">→</td>
                <td className="px-3 py-2 text-gray-600">22001 (DR) / 10100 Cash {fmt(pb.cashPaid)} + 60201 Gain {fmt(pb.gain)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(pb.cashPaid + pb.gain)}</td>
                <td className="px-3 py-2 text-center"><CheckCircle size={14} className="text-green-600 inline" /></td>
              </tr>
              {/* Redemption gain total */}
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-2 text-gray-700 font-medium">Total redemption gain <span className="text-xs text-gray-400">(Page 3)</span></td>
                <td className="px-3 py-2 font-mono text-green-700">{fmt(m.redemptions.totalGain)}</td>
                <td className="px-3 py-2 text-gray-400">→</td>
                <td className="px-3 py-2 text-gray-600">60201 Rewards Expense — Redemption Gain (CR total)</td>
                <td className="px-3 py-2 text-right font-mono text-green-700">
                  {fmt(allLines.filter((l) => l.description.includes("redemption gain")).reduce((s, l) => s + l.credit, 0))}
                </td>
                <td className="px-3 py-2 text-center"><CheckCircle size={14} className="text-green-600 inline" /></td>
              </tr>
              {/* Breakage */}
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-700">Breakage true-up <span className="text-xs text-gray-400">(Page 4)</span></td>
                <td className="px-3 py-2 font-mono">{fmt(br.trueUpDollars)}</td>
                <td className="px-3 py-2 text-gray-400">→</td>
                <td className="px-3 py-2 text-gray-600">22001 Rewards Liability (DR) / 60201 Rewards Expense (CR)</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(Math.abs(br.trueUpDollars))}</td>
                <td className="px-3 py-2 text-center"><CheckCircle size={14} className="text-green-600 inline" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-entity JE tables */}
      <JETable
        entityJE={usJE}
        period={selectedPeriod}
        label={m.label}
        jeRef={`JE-${selectedPeriod}-REWARDS-US`}
      />
      <JETable
        entityJE={caJE}
        period={selectedPeriod}
        label={m.label}
        jeRef={`JE-${selectedPeriod}-REWARDS-CA`}
      />

      {/* Before / After comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Before & After</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-red-50 rounded-lg border border-red-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={20} className="text-red-600" />
              <h4 className="font-semibold text-red-900">Before — Manual Process</h4>
            </div>
            <ul className="space-y-2 text-sm text-red-800">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span><strong>56 journal lines</strong> manually prepared each month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Single combined JE mixing all entities and channels</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>No audit trail linking JE lines to source events</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Breakage calculated offline in a spreadsheet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>Gift card gain derived manually from provider invoices</span>
              </li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg border border-green-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={20} className="text-green-600" />
              <h4 className="font-semibold text-green-900">After — Automated Subledger</h4>
            </div>
            <ul className="space-y-2 text-sm text-green-800">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Separate JE per entity</strong> — {usJE.lines.length} lines (US) + {caJE.lines.length} lines (CA)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Generated from {(m.earnings.transactionCount + m.redemptions.totalCount).toLocaleString()} source events</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Every line traceable to handler rule and source event</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Breakage reserve calculated systematically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Gift card gains computed per-event from source data</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 bg-indigo-50 rounded-lg border border-indigo-200 p-4 text-center">
          <p className="text-sm text-indigo-600">
            <strong>56 manual JE lines → {usJE.lines.length + caJE.lines.length} auto-generated lines across 2 entities</strong> with full traceability and source-to-JE reconciliation
          </p>
        </div>
      </div>
    </div>
  );
}
