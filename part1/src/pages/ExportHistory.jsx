import { useState } from "react";
import { useApp } from "../App";
import { glMappings } from "../data/seedData";
import {
  History,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  FileText,
} from "lucide-react";

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function ExportHistory() {
  const { exportHistory, allEntries, setExportHistoryData } = useApp();
  const [expandedId, setExpandedId] = useState(null);

  // ── Build JE lines from subledger entries (mirrors JE Preview logic) ──────
  function buildJELines(entryList) {
    const lineMap = {};
    for (const entry of entryList) {
      for (const line of entry.lines) {
        if (line.gl_account === null) continue;
        const mapping = glMappings.find(
          (m) =>
            m.subledgerAccount === line.account &&
            (m.entity === null || m.entity === entry.entity)
        ) || glMappings.find((m) => m.subledgerAccount === line.account);
        const glName = mapping ? mapping.glAccount : line.account;
        const glNum = line.gl_account;
        const key = `${glNum}-${entry.entity}`;
        if (!lineMap[key]) {
          lineMap[key] = {
            glNumber: glNum,
            glAccount: glName,
            entity: entry.entity,
            debit: 0,
            credit: 0,
            subledgerAccount: line.account,
          };
        }
        lineMap[key].debit += line.debit;
        lineMap[key].credit += line.credit;
      }
    }
    return Object.values(lineMap).sort((a, b) => a.glNumber - b.glNumber);
  }

  function buildSubledgerSummary(entryList) {
    const acctMap = {};
    for (const entry of entryList) {
      for (const line of entry.lines) {
        const key = `${line.account}-${entry.entity}`;
        if (!acctMap[key]) {
          acctMap[key] = { account: line.account, entity: entry.entity, debit: 0, credit: 0 };
        }
        acctMap[key].debit += line.debit;
        acctMap[key].credit += line.credit;
      }
    }
    return Object.values(acctMap);
  }

  if (exportHistory.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Export History</h2>
          <p className="text-sm text-gray-500 mt-1">
            Permanent audit trail of all JE exports
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <History size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No exports yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Exports will appear here once a period is approved and exported.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Export History</h2>
        <p className="text-sm text-gray-500 mt-1">
          Permanent audit trail of all JE exports — drill down to subledger
          entries
        </p>
      </div>

      <div className="space-y-3">
        {[...exportHistory].sort((a, b) => b.period.localeCompare(a.period) || b.exportDate.localeCompare(a.exportDate)).map((exp) => {
          const expanded = expandedId === exp.exportId;
          const periodEntries = allEntries.filter(
            (e) =>
              e.posted_period === exp.period &&
              e.status === "valid" &&
              (!exp.dataSource || e.data_source === exp.dataSource)
          );
          const totalDR = periodEntries.reduce(
            (s, e) => s + e.lines.reduce((a, l) => a + l.debit, 0),
            0
          );
          const totalCR = periodEntries.reduce(
            (s, e) => s + e.lines.reduce((a, l) => a + l.credit, 0),
            0
          );

          return (
            <div
              key={exp.exportId}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Summary row */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setExpandedId(expanded ? null : exp.exportId)
                }
              >
                {expanded ? (
                  <ChevronDown size={16} className="text-gray-400" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400" />
                )}
                <span className="font-mono text-xs text-gray-500 w-20">
                  {exp.exportId}
                </span>
                <span className="text-sm font-semibold text-gray-900 w-20">
                  {exp.period}
                </span>
                <span className="text-xs text-indigo-600 font-medium w-44 truncate">
                  {exp.dataSource || "All Sources"}
                </span>
                <span className="text-xs text-gray-500 w-40">
                  {new Date(exp.exportDate).toLocaleString()}
                </span>
                <span className="text-xs text-gray-600 w-32">
                  {exp.exportedBy}
                </span>
                <span className="text-xs text-gray-600 w-24">
                  {exp.entryCount} entries
                </span>
                <span className="flex-1 text-right text-xs font-mono text-gray-500">
                  {exp.netsuiteRef}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    exp.status === "Confirmed in NetSuite"
                      ? "bg-green-100 text-green-700"
                      : exp.status === "Cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {exp.status}
                </span>
              </button>

              {/* Expanded detail */}
              {expanded && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  {/* Export metadata */}
                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Period
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {exp.period}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Data Source
                      </p>
                      <p className="text-sm font-medium text-indigo-600">
                        {exp.dataSource || "All Sources"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Total DR
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {fmt(totalDR)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Total CR
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {fmt(totalCR)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        NetSuite Ref
                      </p>
                      <p className="text-sm font-mono text-gray-900">
                        {exp.netsuiteRef || "—"}
                      </p>
                    </div>
                  </div>

                  {/* GL-to-Subledger Reconciliation */}
                  {(() => {
                    const jeLines = buildJELines(periodEntries);
                    const slSummary = buildSubledgerSummary(periodEntries);
                    const jeTotalDR = jeLines.reduce((s, l) => s + l.debit, 0);
                    const jeTotalCR = jeLines.reduce((s, l) => s + l.credit, 0);
                    const slTotalDR = slSummary.reduce((s, l) => s + l.debit, 0);
                    const slTotalCR = slSummary.reduce((s, l) => s + l.credit, 0);
                    const reconciled =
                      Math.abs(jeTotalDR - slTotalDR) < 0.01 &&
                      Math.abs(jeTotalCR - slTotalCR) < 0.01;
                    return (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <CheckCircle size={12} /> GL-to-Subledger Reconciliation
                          {reconciled ? (
                            <span className="ml-2 text-green-600 normal-case font-medium">Reconciled</span>
                          ) : (
                            <span className="ml-2 text-red-600 normal-case font-medium">Variance</span>
                          )}
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-gray-500 uppercase tracking-wide border-b border-gray-100">
                                <th className="pb-1 pr-3">GL #</th>
                                <th className="pb-1 pr-3">GL Account</th>
                                <th className="pb-1 pr-3">Entity</th>
                                <th className="pb-1 pr-3 text-right">JE Debit</th>
                                <th className="pb-1 pr-3 text-right">JE Credit</th>
                                <th className="pb-1 pr-3 text-center border-l border-gray-200">Subledger Source</th>
                                <th className="pb-1 pr-3 text-right">SL Debit</th>
                                <th className="pb-1 text-right">SL Credit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jeLines.map((line, i) => {
                                const slMatch = slSummary.find(
                                  (s) => s.entity === line.entity && s.account === line.subledgerAccount
                                );
                                return (
                                  <tr key={i} className="border-b border-gray-50 last:border-0">
                                    <td className="py-1.5 pr-3 font-mono text-gray-500">{line.glNumber}</td>
                                    <td className="py-1.5 pr-3 font-medium text-gray-900">{line.glAccount}</td>
                                    <td className="py-1.5 pr-3 text-gray-600">{line.entity.replace("Ramp ", "")}</td>
                                    <td className="py-1.5 pr-3 text-right text-gray-700">{line.debit > 0 ? fmt(line.debit) : ""}</td>
                                    <td className="py-1.5 pr-3 text-right text-gray-700">{line.credit > 0 ? fmt(line.credit) : ""}</td>
                                    <td className="py-1.5 pr-3 text-center border-l border-gray-100 text-indigo-600">{line.subledgerAccount}</td>
                                    <td className="py-1.5 pr-3 text-right text-gray-700">{slMatch && slMatch.debit > 0 ? fmt(slMatch.debit) : ""}</td>
                                    <td className="py-1.5 text-right text-gray-700">{slMatch && slMatch.credit > 0 ? fmt(slMatch.credit) : ""}</td>
                                  </tr>
                                );
                              })}
                              <tr className="border-t-2 border-gray-200 font-semibold">
                                <td colSpan={3} className="py-1.5 pr-3 text-gray-900">Total</td>
                                <td className="py-1.5 pr-3 text-right text-gray-900">{fmt(jeTotalDR)}</td>
                                <td className="py-1.5 pr-3 text-right text-gray-900">{fmt(jeTotalCR)}</td>
                                <td className="py-1.5 pr-3 border-l border-gray-100"></td>
                                <td className="py-1.5 pr-3 text-right text-gray-900">{fmt(slTotalDR)}</td>
                                <td className="py-1.5 text-right text-gray-900">{fmt(slTotalCR)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Acknowledged exceptions */}
                  {exp.acknowledgedExceptions > 0 && (
                    <div className="mb-4 rounded-lg px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">
                          {exp.acknowledgedExceptions} exception
                          {exp.acknowledgedExceptions !== 1 ? "s" : ""}{" "}
                          acknowledged at export
                        </p>
                        {exp.acknowledgedNote && (
                          <p className="mt-1 text-amber-700">
                            {exp.acknowledgedNote}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Entries drill-down */}
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <FileText size={12} /> Subledger Entries Included
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500 uppercase tracking-wide border-b border-gray-100">
                          <th className="pb-1 pr-3">Entry ID</th>
                          <th className="pb-1 pr-3">Event ID</th>
                          <th className="pb-1 pr-3">Type</th>
                          <th className="pb-1 pr-3">Date</th>
                          <th className="pb-1 pr-3">Entity</th>
                          <th className="pb-1 pr-3">Business</th>
                          <th className="pb-1 pr-3 text-right">DR</th>
                          <th className="pb-1 text-right">CR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodEntries.slice(0, 50).map((e) => {
                          const dr = e.lines.reduce(
                            (s, l) => s + l.debit,
                            0
                          );
                          const cr = e.lines.reduce(
                            (s, l) => s + l.credit,
                            0
                          );
                          return (
                            <tr
                              key={e.entry_id}
                              className="border-b border-gray-50 last:border-0"
                            >
                              <td className="py-1.5 pr-3 font-mono text-indigo-600">
                                {e.entry_id}
                              </td>
                              <td className="py-1.5 pr-3 font-mono text-gray-500">
                                {e.event_id}
                              </td>
                              <td className="py-1.5 pr-3 text-gray-700">
                                {e.event_type}
                              </td>
                              <td className="py-1.5 pr-3 text-gray-600">
                                {e.effective_date}
                              </td>
                              <td className="py-1.5 pr-3 text-gray-600">
                                {e.entity.replace("Ramp ", "")}
                              </td>
                              <td className="py-1.5 pr-3 text-gray-600">
                                {e.business_name}
                              </td>
                              <td className="py-1.5 pr-3 text-right text-gray-700">
                                {fmt(dr)}
                              </td>
                              <td className="py-1.5 text-right text-gray-700">
                                {fmt(cr)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {periodEntries.length > 50 && (
                      <p className="text-xs text-gray-400 mt-2">
                        Showing first 50 of {periodEntries.length} entries
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
