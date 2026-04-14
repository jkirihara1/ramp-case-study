import { useState } from "react";
import { useApp } from "../App";
import { glMappings, bankReconData } from "../data/seedData";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Download,
} from "lucide-react";

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function SubledgerReview() {
  const { entries, selectedPeriod, allEntries, openExceptions } = useApp();
  const [filterEntity, setFilterEntity] = useState("All");
  const [filterEventType, setFilterEventType] = useState("All");
  const [filterDataSource, setFilterDataSource] = useState("All");

  const validEntries = entries.filter((e) => e.status === "valid");

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalDR = validEntries.reduce(
    (s, e) => s + e.lines.reduce((a, l) => a + l.debit, 0),
    0
  );
  const totalCR = validEntries.reduce(
    (s, e) => s + e.lines.reduce((a, l) => a + l.credit, 0),
    0
  );
  const balanced = Math.abs(totalDR - totalCR) < 0.01;

  // ── Unique values for filters ──────────────────────────────────────────────
  const entities = [...new Set(entries.map((e) => e.entity))];
  const eventTypes = [...new Set(entries.map((e) => e.event_type))];
  const dataSources = [...new Set(entries.map((e) => e.data_source).filter(Boolean))];

  // ── Filter entries ─────────────────────────────────────────────────────────
  const filteredEntries = validEntries.filter((e) => {
    if (filterEntity !== "All" && e.entity !== filterEntity) return false;
    if (filterEventType !== "All" && e.event_type !== filterEventType)
      return false;
    if (filterDataSource !== "All" && e.data_source !== filterDataSource)
      return false;
    return true;
  });

  // ── Group by account ───────────────────────────────────────────────────────
  function groupByAccount() {
    const groups = {};
    for (const e of filteredEntries) {
      for (const l of e.lines) {
        const ak = l.account;
        if (!groups[ak])
          groups[ak] = { label: ak, debit: 0, credit: 0, count: 0 };
        groups[ak].debit += l.debit;
        groups[ak].credit += l.credit;
        groups[ak].count += 1;
      }
    }
    return Object.values(groups).sort((a, b) => {
      const aGL = glMappings.find((m) => m.subledgerAccount === a.label)?.glNumber ?? 99999;
      const bGL = glMappings.find((m) => m.subledgerAccount === b.label)?.glNumber ?? 99999;
      return aGL - bGL;
    });
  }

  const grouped = groupByAccount();

  // ── Flux (prior period comparison) ─────────────────────────────────────────
  function computeFlux() {
    const priorPeriod =
      selectedPeriod === "2026-03"
        ? "2026-02"
        : selectedPeriod === "2026-02"
        ? "2026-01"
        : null;
    if (!priorPeriod) return [];

    const priorEntries = allEntries.filter(
      (e) => e.posted_period === priorPeriod && e.status === "valid"
    );

    // Compare by account
    const currentByAcct = {};
    const priorByAcct = {};

    for (const e of filteredEntries) {
      for (const l of e.lines) {
        if (!currentByAcct[l.account])
          currentByAcct[l.account] = { debit: 0, credit: 0 };
        currentByAcct[l.account].debit += l.debit;
        currentByAcct[l.account].credit += l.credit;
      }
    }
    for (const e of priorEntries) {
      for (const l of e.lines) {
        if (!priorByAcct[l.account])
          priorByAcct[l.account] = { debit: 0, credit: 0 };
        priorByAcct[l.account].debit += l.debit;
        priorByAcct[l.account].credit += l.credit;
      }
    }

    // Collect all accounts from both periods so every row appears regardless of activity
    const allAccounts = new Set([
      ...Object.keys(currentByAcct),
      ...Object.keys(priorByAcct),
    ]);
    const fluxRows = [];
    for (const acct of allAccounts) {
      const curr = currentByAcct[acct] || { debit: 0, credit: 0 };
      const prior = priorByAcct[acct] || { debit: 0, credit: 0 };
      const currNet = curr.debit - curr.credit;
      const priorNet = prior.debit - prior.credit;
      const change = currNet - priorNet;
      const pctChange =
        priorNet !== 0 ? ((change / Math.abs(priorNet)) * 100) : currNet !== 0 ? 100 : 0;
      const significant = Math.abs(pctChange) > 15;

      fluxRows.push({
        account: acct,
        current: currNet,
        prior: priorNet,
        change,
        pctChange,
        significant,
      });
    }
    return fluxRows.sort((a, b) => {
      const aGL = glMappings.find((m) => m.subledgerAccount === a.account)?.glNumber ?? 99999;
      const bGL = glMappings.find((m) => m.subledgerAccount === b.account)?.glNumber ?? 99999;
      return aGL - bGL;
    });
  }

  const fluxData = computeFlux();

  // ── Validations ────────────────────────────────────────────────────────────
  const periodMismatch = entries.filter(
    (e) =>
      e.status === "valid" &&
      e.effective_date &&
      !e.effective_date.startsWith(selectedPeriod)
  );

  const nullGLMappings = entries.filter((e) =>
    e.lines.some((l) => l.gl_account === null)
  );

  const zeroAmountEntries = entries.filter((e) =>
    e.lines.every((l) => l.debit === 0 && l.credit === 0)
  );

  const aggregateExposure = openExceptions.reduce((s, e) => s + e.impact, 0);

  const validations = [
    {
      label: "Balance",
      desc: "Total DR = Total CR",
      status: balanced ? "pass" : "fail",
      detail: balanced
        ? `Balanced at ${fmt(totalDR)}`
        : `DR ${fmt(totalDR)} ≠ CR ${fmt(totalCR)}, variance ${fmt(Math.abs(totalDR - totalCR))}`,
    },
    {
      label: "Unresolved Exceptions",
      desc: "All exceptions resolved before export",
      status: openExceptions.length === 0 ? "pass" : "fail",
      detail:
        openExceptions.length === 0
          ? "No open exceptions"
          : `${openExceptions.length} open exception${openExceptions.length !== 1 ? "s" : ""} — ${fmt(aggregateExposure)} aggregate exposure`,
    },
    {
      label: "Period Boundary",
      desc: "No entries with effective dates outside posted period",
      status: periodMismatch.length === 0 ? "pass" : "warning",
      detail:
        periodMismatch.length === 0
          ? "All effective dates within period"
          : `${periodMismatch.length} entries with out-of-period effective dates`,
    },
    (() => {
      const sigCount = fluxData.filter((f) => f.significant).length;
      return {
        label: "Flux Analysis",
        desc: "Period-over-period movements >15%",
        status: sigCount === 0 ? "pass" : "warning",
        detail:
          sigCount === 0
            ? "No significant variances"
            : `${sigCount} account${sigCount !== 1 ? "s" : ""} with significant movement`,
      };
    })(),
    (() => {
      const interchangeRevenue = validEntries.reduce(
        (s, e) => s + e.lines.filter((l) => l.account === "Interchange Revenue").reduce((a, l) => a + l.credit - l.debit, 0), 0
      );
      const cardSpend = validEntries
        .filter((e) => e.event_type === "card_transaction")
        .reduce((s, e) => s + (e.lines.find((l) => l.account === "Card Accounts Receivable")?.debit || 0), 0);
      const rate = cardSpend > 0 ? (interchangeRevenue / cardSpend) * 100 : 0;
      const rateOk = rate >= 1.0 && rate <= 3.0;
      return {
        label: "Interchange Rate Check",
        desc: "Interchange revenue / card spend volume should be 1-3%",
        status: rateOk ? "pass" : "warning",
        detail: `${fmt(interchangeRevenue)} / ${fmt(cardSpend)} = ${rate.toFixed(2)}%${!rateOk ? " — outside expected range" : ""}`,
      };
    })(),
    {
      label: "Zero-Amount Entries",
      desc: "Entries where all lines are $0",
      status: zeroAmountEntries.length === 0 ? "pass" : "warning",
      detail:
        zeroAmountEntries.length === 0
          ? "None found"
          : `${zeroAmountEntries.length} zero-amount entries`,
    },
    (() => {
      const bankAccounts = bankReconData[selectedPeriod] || [];
      const reconItemCount = bankAccounts.reduce((s, a) => s + a.reconItems.length, 0);
      const totalReconAmt = bankAccounts.reduce(
        (s, a) => s + a.reconItems.reduce((t, r) => t + Math.abs(r.amount), 0), 0
      );
      return {
        label: "Bank Reconciliation",
        desc: "Cash accounts reconciled to bank/processor balances",
        status: reconItemCount === 0 ? "pass" : "warning",
        detail:
          reconItemCount === 0
            ? "All bank accounts reconciled with no open items"
            : `${reconItemCount} reconciling item${reconItemCount !== 1 ? "s" : ""} — ${fmt(totalReconAmt)} gross exposure`,
      };
    })(),
  ];

  const statusIcon = {
    pass: <CheckCircle size={16} className="text-green-600" />,
    warning: <AlertTriangle size={16} className="text-amber-600" />,
    fail: <XCircle size={16} className="text-red-600" />,
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Subledger Accounting Review
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {selectedPeriod} &middot; Validate financial accuracy before JE
          generation
        </p>
      </div>

      {/* ── Warning if exceptions exist ─────────────────────────────────── */}
      {openExceptions.length > 0 && (
        <div className="mb-6 rounded-lg px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle size={14} className="inline mr-1" />
          Exception Review has {openExceptions.length} unresolved exception
          {openExceptions.length !== 1 ? "s" : ""}. You can still review the
          subledger, but exceptions should be addressed before exporting.
        </div>
      )}

      {/* ── Balance status ─────────────────────────────────────────────── */}
      <div
        className={`mb-6 rounded-lg px-4 py-3 flex items-center gap-2 text-sm font-medium ${
          balanced
            ? "bg-green-50 text-green-800 border border-green-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}
      >
        {balanced ? (
          <>
            <CheckCircle size={16} /> DR = CR — Period is balanced at{" "}
            {fmt(totalDR)}
          </>
        ) : (
          <>
            <XCircle size={16} /> DR ≠ CR — Variance of{" "}
            {fmt(Math.abs(totalDR - totalCR))}
          </>
        )}
      </div>

      {/* ── Filters + group-by ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Filter size={16} className="text-gray-400" />
          <div>
            <label className="text-xs text-gray-500 mr-1">Entity:</label>
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="All">All</option>
              {entities.map((en) => (
                <option key={en} value={en}>
                  {en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mr-1">Event Type:</label>
            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="All">All</option>
              {eventTypes.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mr-1">Data Source:</label>
            <select
              value={filterDataSource}
              onChange={(e) => setFilterDataSource(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="All">All</option>
              {dataSources.map((ds) => (
                <option key={ds} value={ds}>
                  {ds}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Grouped summary table ──────────────────────────────────── */}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <th className="pb-2 pr-4">Account</th>
              <th className="pb-2 pr-4 text-right">Lines</th>
              <th className="pb-2 pr-4 text-right">Total DR</th>
              <th className="pb-2 text-right">Total CR</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <tr
                key={g.label}
                className="border-b border-gray-50 last:border-0"
              >
                <td className="py-2 pr-4 font-medium text-gray-900">
                  {g.label}
                </td>
                <td className="py-2 pr-4 text-right text-gray-600">
                  {g.count}
                </td>
                <td className="py-2 pr-4 text-right text-gray-600">
                  {fmt(g.debit)}
                </td>
                <td className="py-2 text-right text-gray-600">
                  {fmt(g.credit)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 font-semibold">
              <td className="py-2 pr-4 text-gray-900">Total</td>
              <td className="py-2 pr-4 text-right text-gray-900">
                {grouped.reduce((s, g) => s + g.count, 0)}
              </td>
              <td className="py-2 pr-4 text-right text-gray-900">
                {fmt(
                  grouped.reduce((s, g) => s + g.debit, 0)
                )}
              </td>
              <td className="py-2 text-right text-gray-900">
                {fmt(
                  grouped.reduce((s, g) => s + g.credit, 0)
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Flux analysis detail ───────────────────────────────────────── */}
      {fluxData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Flux Analysis — vs. Prior Period
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-2 pr-4">Account</th>
                <th className="pb-2 pr-4 text-right">Current Period</th>
                <th className="pb-2 pr-4 text-right">Prior Period</th>
                <th className="pb-2 pr-4 text-right">Change</th>
                <th className="pb-2 text-right">% Change</th>
              </tr>
            </thead>
            <tbody>
              {fluxData.map((f) => (
                <tr
                  key={f.account}
                  className={`border-b border-gray-50 last:border-0 ${f.significant ? "bg-amber-50" : ""}`}
                >
                  <td className="py-2 pr-4 font-medium text-gray-900">
                    {f.account}
                    {f.significant && (
                      <AlertTriangle size={12} className="inline ml-1.5 text-amber-600" />
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-600">
                    {fmt(f.current)}
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-600">
                    {fmt(f.prior)}
                  </td>
                  <td
                    className={`py-2 pr-4 text-right font-medium ${
                      f.significant
                        ? f.change > 0 ? "text-red-600" : "text-green-600"
                        : "text-gray-600"
                    }`}
                  >
                    {f.change > 0 ? "+" : ""}
                    {fmt(f.change)}
                  </td>
                  <td
                    className={`py-2 text-right font-medium ${
                      f.significant
                        ? Math.abs(f.pctChange) > 20
                          ? "text-red-600"
                          : "text-amber-600"
                        : "text-gray-600"
                    }`}
                  >
                    {f.pctChange > 0 ? "+" : ""}
                    {f.pctChange.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Validation panel ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Validation Checks
        </h3>
        <div className="space-y-2">
          {validations.map((v) => (
            <div
              key={v.label}
              className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"
            >
              <div className="mt-0.5">{statusIcon[v.status]}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{v.label}</p>
                <p className="text-xs text-gray-500">{v.desc}</p>
              </div>
              <p className="text-sm text-gray-600 text-right max-w-xs">
                {v.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Subledger detail download ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Subledger Entry Detail
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {filteredEntries.length} entries &middot; Full line-level detail including accounts, GL mappings, and dimensions
          </p>
        </div>
        <button
          onClick={() => {
            const header = "Entry_ID,Event_ID,Event_Type,Effective_Date,Created_Date,Posted_Period,Entity,Data_Source,Business_ID,Business_Name,Merchant_Name,Processor_ID,Processor_Name,Account,GL_Account,GL_Number,Debit,Credit,Status\n";
            const rows = filteredEntries.flatMap((e) =>
              e.lines.map((l) =>
                [
                  e.entry_id,
                  e.event_id,
                  e.event_type,
                  e.effective_date,
                  e.created_date,
                  e.posted_period,
                  `"${e.entity}"`,
                  `"${e.data_source}"`,
                  e.business_id,
                  `"${e.business_name}"`,
                  `"${e.merchant_name || ""}"`,
                  e.processor_id || "",
                  `"${e.processor_name || ""}"`,
                  `"${l.account}"`,
                  `"${l.gl_account || "UNMAPPED"}"`,
                  l.gl_account || "",
                  l.debit.toFixed(2),
                  l.credit.toFixed(2),
                  e.status,
                ].join(",")
              )
            );
            const blob = new Blob(["\uFEFF" + header + rows.join("\n")], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `subledger-detail-${selectedPeriod}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Download size={16} />
          Download CSV
        </button>
      </div>
    </div>
  );
}
