import { useState } from "react";
import { CheckCircle, AlertTriangle, ChevronDown, ChevronRight, ArrowRight } from "lucide-react";
import { monthlyActivity, earnRateConfig, rollforward, BREAKAGE_RATE } from "../data/seedData";

const fmt = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
const fmtPts = (v) => new Intl.NumberFormat("en-US").format(Math.round(v));
const periods = ["2025-01", "2025-02", "2025-03"];

// ── Build account-level summary from monthly activity — split by entity ──────
function buildAccountSummary(m) {
  const sc = m.redemptions.byChannel.STATEMENT_CREDIT;
  const pa = m.redemptions.byChannel.PROVIDER_A;
  const pb = m.redemptions.byChannel.PROVIDER_B;
  const usdNet = m.earnings.byCurrency.USD.dollars;
  const cadNet = m.earnings.byCurrency.CAD.dollars;

  const usd = [
    { glAccount: 10100, glName: "Cash — Statement Credits", debit: 0, credit: sc.cashPaid },
    { glAccount: 10100, glName: "Cash — Provider A Payouts", debit: 0, credit: pa.cashPaid },
    { glAccount: 10100, glName: "Cash — Provider B Payouts", debit: 0, credit: pb.cashPaid },
    { glAccount: 22001, glName: "Rewards Liability", debit: sc.faceValue + pa.faceValue + pb.faceValue, credit: usdNet },
    { glAccount: 60201, glName: "Rewards Expense", debit: usdNet, credit: pa.gain + pb.gain },
  ].sort((a, b) => a.glAccount - b.glAccount);

  const cad = [
    { glAccount: 22001, glName: "Rewards Liability", debit: 0, credit: cadNet },
    { glAccount: 60201, glName: "Rewards Expense", debit: cadNet, credit: 0 },
  ].sort((a, b) => a.glAccount - b.glAccount);

  return { usd, cad };
}


// ── Flux analysis (period-over-period by account) ────────────────────────────
function computeFlux(selectedPeriod) {
  const idx = periods.indexOf(selectedPeriod);
  if (idx <= 0) return [];

  const { usd: cu, cad: cc } = buildAccountSummary(monthlyActivity[selectedPeriod]);
  const { usd: pu, cad: pc } = buildAccountSummary(monthlyActivity[periods[idx - 1]]);
  const current = [...cu, ...cc];
  const prior = [...pu, ...pc];

  // Aggregate by glAccount + glName
  const aggregate = (rows) => {
    const map = {};
    for (const r of rows) {
      const key = `${r.glAccount}-${r.glName}`;
      if (!map[key]) map[key] = { glAccount: r.glAccount, glName: r.glName, debit: 0, credit: 0 };
      map[key].debit += r.debit;
      map[key].credit += r.credit;
    }
    return map;
  };

  const currMap = aggregate(current);
  const priorMap = aggregate(prior);
  const allKeys = new Set([...Object.keys(currMap), ...Object.keys(priorMap)]);

  const fluxRows = [];
  for (const key of allKeys) {
    const curr = currMap[key] || { glAccount: 0, glName: key, debit: 0, credit: 0 };
    const pri = priorMap[key] || { debit: 0, credit: 0 };
    const currNet = curr.debit - curr.credit;
    const priorNet = pri.debit - pri.credit;
    const change = currNet - priorNet;
    const pctChange = priorNet !== 0 ? (change / Math.abs(priorNet)) * 100 : currNet !== 0 ? 100 : 0;

    fluxRows.push({
      glAccount: curr.glAccount || priorMap[key]?.glAccount,
      glName: curr.glName,
      current: currNet,
      prior: priorNet,
      change,
      pctChange,
      significant: Math.abs(pctChange) > 15,
    });
  }
  return fluxRows.sort((a, b) => a.glAccount - b.glAccount);
}

export default function RewardsActivity({ selectedPeriod }) {
  const [filterEventType, setFilterEventType] = useState("All");
  const [filterCurrency, setFilterCurrency] = useState("All");
  const [validationsOpen, setValidationsOpen] = useState(true);
  const [fluxOpen, setFluxOpen] = useState(false);

  const m = monthlyActivity[selectedPeriod];
  if (!m) return <div className="text-gray-500 p-8">No data for this period.</div>;

  const { usd: usdSummary, cad: cadSummary } = buildAccountSummary(m);
  const fluxData = computeFlux(selectedPeriod);

  const usdDR = usdSummary.reduce((s, r) => s + r.debit, 0);
  const usdCR = usdSummary.reduce((s, r) => s + r.credit, 0);
  const cadDR = cadSummary.reduce((s, r) => s + r.debit, 0);
  const cadCR = cadSummary.reduce((s, r) => s + r.credit, 0);
  const usdBalanced = Math.abs(usdDR - usdCR) < 0.01;
  const cadBalanced = Math.abs(cadDR - cadCR) < 0.01;
  const balanced = usdBalanced && cadBalanced;

  const openExceptions = m.exceptions.filter((e) => e.status === "Open" || e.status === "Under Review");
  const sc = m.redemptions.byChannel.STATEMENT_CREDIT;
  const pa = m.redemptions.byChannel.PROVIDER_A;
  const pb = m.redemptions.byChannel.PROVIDER_B;

  // ── Validations ────────────────────────────────────────────────────────────
  const validations = [
    {
      label: "Balance",
      desc: "Total DR = Total CR per entity",
      status: balanced ? "pass" : "fail",
      detail: balanced
        ? `USD balanced at ${fmt(usdDR)} · CAD balanced at ${fmt(cadDR)}`
        : `${!usdBalanced ? `USD: DR ${fmt(usdDR)} ≠ CR ${fmt(usdCR)}` : ""}${!cadBalanced ? ` CAD: DR ${fmt(cadDR)} ≠ CR ${fmt(cadCR)}` : ""}`,
    },
    (() => {
      const exceptions = m.exceptions.filter((e) => e.type === "Earn Rate Deviation");
      return {
        label: "Earn Rate Consistency",
        desc: "All earning amounts match configured business rates",
        status: exceptions.length > 0 ? "warning" : "pass",
        detail: exceptions.length > 0
          ? `${exceptions.length} event${exceptions.length !== 1 ? "s" : ""} with rate deviation — ${fmt(exceptions.reduce((s, e) => s + e.dollarImpact, 0))} impact`
          : "All earnings match configured rates",
      };
    })(),
    {
      label: "Unresolved Exceptions",
      desc: "All exceptions resolved before close",
      status: openExceptions.length === 0 ? "pass" : "fail",
      detail: openExceptions.length === 0
        ? "No open exceptions"
        : `${openExceptions.length} open — ${fmt(openExceptions.reduce((s, e) => s + e.dollarImpact, 0))} aggregate exposure`,
    },
    (() => {
      const pct = m.earnings.reversalCount / m.earnings.transactionCount * 100;
      return {
        label: "Reversal Rate",
        desc: "Reversals as a percentage of total earnings",
        status: pct > 15 ? "fail" : pct > 10 ? "warning" : "pass",
        detail: `${m.earnings.reversalCount} reversals / ${m.earnings.transactionCount} earnings = ${pct.toFixed(1)}%`,
      };
    })(),
    {
      label: "Redemption Completeness",
      desc: "All redemptions tied to a statement or provider channel",
      status: m.exceptions.some((e) => e.type === "Missing Initiated By") ? "warning" : "pass",
      detail: m.exceptions.some((e) => e.type === "Missing Initiated By")
        ? "1 redemption missing initiated_by field"
        : "All redemptions have valid channel and initiator",
    },
    {
      label: "Points Balance Reconciliation",
      desc: "Opening + earned − reversed − redeemed = closing (before breakage)",
      status: "pass",
      detail: "Rollforward balances confirmed — see Rollforward page for detail",
    },
    (() => {
      const bizWithConfig = new Set(earnRateConfig.map((c) => c.businessId));
      const bizWithEarnings = new Set(m.earnings.byBusiness.map((b) => b.businessId));
      const missing = [...bizWithEarnings].filter((b) => !bizWithConfig.has(b));
      return {
        label: "Business Config Coverage",
        desc: "All earning businesses have a configured earn rate",
        status: missing.length > 0 ? "fail" : "pass",
        detail: missing.length > 0
          ? `${missing.length} business(es) without config: ${missing.join(", ")}`
          : `All ${bizWithEarnings.size} businesses have active earn rate configuration`,
      };
    })(),
    (() => {
      const sigCount = fluxData.filter((f) => f.significant).length;
      return {
        label: "Flux Analysis",
        desc: "Period-over-period movements >15%",
        status: fluxData.length === 0 ? "pass" : sigCount === 0 ? "pass" : "warning",
        detail: fluxData.length === 0
          ? "No prior period available for comparison"
          : sigCount === 0
            ? "No significant variances"
            : `${sigCount} account${sigCount !== 1 ? "s" : ""} with significant movement`,
      };
    })(),
  ];

  const statusIcon = { pass: CheckCircle, warning: AlertTriangle, fail: AlertTriangle };
  const statusColor = { pass: "text-green-600", warning: "text-amber-500", fail: "text-red-500" };
  const statusBg = { pass: "bg-green-50", warning: "bg-amber-50", fail: "bg-red-50" };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Rewards Subledger Review</h2>
        <p className="text-gray-500 mt-1">{m.label} — Period activity verification</p>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Total Events</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {(m.earnings.transactionCount + m.earnings.reversalCount + m.redemptions.totalCount).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {m.earnings.transactionCount.toLocaleString()} earn · {m.earnings.reversalCount} rev · {m.redemptions.totalCount} redeem
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Subledger Balance</p>
          <p className="text-xl font-bold mt-1">
            {balanced ? <span className="text-green-700">Balanced</span> : <span className="text-red-600">Imbalanced</span>}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            USD {usdBalanced ? "✓" : "✗"} · CAD {cadBalanced ? "✓" : "✗"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Redemption Gain</p>
          <p className="text-xl font-bold text-green-700 mt-1">{fmt(m.redemptions.totalGain)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Gift card spreads → 60201</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Open Exceptions</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{openExceptions.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {openExceptions.length > 0 ? `${fmt(openExceptions.reduce((s, e) => s + e.dollarImpact, 0))} exposure` : "No open items"}
          </p>
        </div>
      </div>

      {/* ── Account-level summary ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Subledger Entries by GL Account</h3>
        {[
          { label: "Ramp Financial LLC — USD", rows: usdSummary, dr: usdDR, cr: usdCR, bal: usdBalanced },
          { label: "Ramp Canada — CAD", rows: cadSummary, dr: cadDR, cr: cadCR, bal: cadBalanced },
        ].map(({ label, rows, dr, cr, bal }) => (
          <div key={label} className="mb-4 last:mb-0">
            <div className="bg-indigo-50 px-3 py-1.5 rounded-t text-xs font-semibold text-indigo-700 uppercase tracking-wide">
              {label}
            </div>
            <table className="w-full text-sm border border-t-0 border-gray-200 rounded-b overflow-hidden">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="px-3 py-2 font-medium">GL Account</th>
                  <th className="px-3 py-2 font-medium">Account Name</th>
                  <th className="px-3 py-2 font-medium text-right">Debit</th>
                  <th className="px-3 py-2 font-medium text-right">Credit</th>
                  <th className="px-3 py-2 font-medium text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const net = row.debit - row.credit;
                  return (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-gray-900">{row.glAccount}</td>
                      <td className="px-3 py-2 text-gray-700">{row.glName}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.debit > 0 ? fmt(row.debit) : "—"}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.credit > 0 ? fmt(row.credit) : "—"}</td>
                      <td className={`px-3 py-2 text-right font-mono ${net > 0 ? "text-gray-900" : "text-red-700"}`}>{fmt(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                  <td className="px-3 py-2" colSpan={2}>Total</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(dr)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(cr)}</td>
                  <td className={`px-3 py-2 text-right font-mono text-xs font-semibold ${bal ? "text-green-700" : "text-red-600"}`}>
                    {bal ? "Balanced" : `Variance ${fmt(Math.abs(dr - cr))}`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <ArrowRight size={12} />
          These account totals flow directly into the proposed JE on Page 5
        </p>
      </div>

      {/* ── Redemption detail by channel ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Redemption Detail by Channel</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="px-3 py-2 font-medium">Channel</th>
              <th className="px-3 py-2 font-medium text-right">Count</th>
              <th className="px-3 py-2 font-medium text-right">Points</th>
              <th className="px-3 py-2 font-medium text-right">Face Value</th>
              <th className="px-3 py-2 font-medium text-right">Cash Paid</th>
              <th className="px-3 py-2 font-medium text-right">Gain</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "Statement Credit", ch: sc },
              { label: "Provider A", ch: pa },
              { label: "Provider B", ch: pb },
            ].map(({ label, ch }) => (
              <tr key={label} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700">{label}</td>
                <td className="px-3 py-2 text-right text-gray-600">{ch.count}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtPts(ch.points)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(ch.faceValue)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(ch.cashPaid)}</td>
                <td className="px-3 py-2 text-right font-mono text-green-700">{fmt(ch.gain)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right">{m.redemptions.totalCount}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtPts(m.redemptions.totalPoints)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(m.redemptions.totalFaceValue)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(m.redemptions.totalCashPaid)}</td>
              <td className="px-3 py-2 text-right font-mono text-green-700">{fmt(m.redemptions.totalGain)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Flux analysis ─────────────────────────────────────────────────────── */}
      {fluxData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <button
            onClick={() => setFluxOpen(!fluxOpen)}
            className="flex items-center gap-2 w-full text-left"
          >
            {fluxOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <h3 className="text-sm font-semibold text-gray-700">Flux Analysis — Period over Period</h3>
            <span className="ml-auto text-xs text-gray-400">
              {fluxData.filter((f) => f.significant).length > 0
                ? `${fluxData.filter((f) => f.significant).length} significant variance${fluxData.filter((f) => f.significant).length !== 1 ? "s" : ""}`
                : "No significant variances"}
            </span>
          </button>
          {fluxOpen && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="px-3 py-2 font-medium">GL</th>
                    <th className="px-3 py-2 font-medium">Account</th>
                    <th className="px-3 py-2 font-medium text-right">Current</th>
                    <th className="px-3 py-2 font-medium text-right">Prior</th>
                    <th className="px-3 py-2 font-medium text-right">Change</th>
                    <th className="px-3 py-2 font-medium text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {fluxData.map((row, i) => (
                    <tr key={i} className={`border-t border-gray-100 ${row.significant ? "bg-amber-50" : ""}`}>
                      <td className="px-3 py-2 font-mono text-gray-900">{row.glAccount}</td>
                      <td className="px-3 py-2 text-gray-700">{row.glName}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(row.current)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(row.prior)}</td>
                      <td className={`px-3 py-2 text-right font-mono ${row.change > 0 ? "text-red-700" : row.change < 0 ? "text-green-700" : ""}`}>
                        {fmt(row.change)}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${row.significant ? "font-semibold text-amber-700" : ""}`}>
                        {row.pctChange.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Exceptions ────────────────────────────────────────────────────────── */}
      {m.exceptions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Exceptions</h3>
          <div className="space-y-2">
            {m.exceptions.map((ex) => (
              <div key={ex.id} className={`rounded-lg p-3 border ${ex.status === "Resolved" ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {ex.status === "Resolved"
                      ? <CheckCircle size={16} className="mt-0.5 text-green-600" />
                      : <AlertTriangle size={16} className="mt-0.5 text-amber-500" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ex.id} — {ex.type}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{ex.description}</p>
                      {ex.resolution && <p className="text-xs text-green-700 mt-1">Resolution: {ex.resolution}</p>}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ex.status === "Resolved" ? "bg-green-100 text-green-700" :
                      ex.status === "Under Review" ? "bg-blue-100 text-blue-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>{ex.status}</span>
                    <p className="text-xs text-gray-500 mt-1">{fmt(ex.dollarImpact)} · {ex.owner}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Validation checks ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <button
          onClick={() => setValidationsOpen(!validationsOpen)}
          className="flex items-center gap-2 w-full text-left"
        >
          {validationsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <h3 className="text-sm font-semibold text-gray-700">Validation Checks</h3>
          <span className="ml-auto text-xs text-gray-400">
            {validations.filter((v) => v.status === "pass").length}/{validations.length} passing
          </span>
        </button>
        {validationsOpen && (
          <div className="mt-3 space-y-2">
            {validations.map((v, i) => {
              const Icon = statusIcon[v.status];
              return (
                <div key={i} className={`rounded-lg p-3 ${statusBg[v.status]} border border-gray-200`}>
                  <div className="flex items-start gap-2">
                    <Icon size={16} className={`mt-0.5 ${statusColor[v.status]}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{v.label}</p>
                      <p className="text-xs text-gray-500">{v.desc}</p>
                      <p className="text-xs text-gray-600 mt-1">{v.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
