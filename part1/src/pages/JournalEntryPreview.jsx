import { useState } from "react";
import { useApp } from "../App";
import { glMappings, bankReconData } from "../data/seedData";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  FileCheck,
  RotateCcw,
} from "lucide-react";

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const DATA_SOURCE_CODES = {
  "Transaction Canonical": "TXN_CANONICAL",
  "Financial Data Platform": "FIN_DATA",
};

export default function JournalEntryPreview() {
  const {
    entries,
    selectedPeriod,
    openExceptions,
    periodStatuses,
    setPeriodStatuses,
    exportHistory,
    setExportHistoryData,
    currentStatus,
  } = useApp();
  const [acknowledged, setAcknowledged] = useState(false);
  const [bankReconAcknowledged, setBankReconAcknowledged] = useState(false);
  const [exportedSources, setExportedSources] = useState(new Set());
  const [confirming, setConfirming] = useState(false);
  const [confirmRefs, setConfirmRefs] = useState({});

  const validEntries = entries.filter((e) => e.status === "valid");

  // ── Group entries by data source ──────────────────────────────────────────
  const dataSources = [...new Set(validEntries.map((e) => e.data_source).filter(Boolean))].sort();

  // ── Build JE lines from subledger entries ──────────────────────────────────
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
            entryCount: 0,
          };
        }
        lineMap[key].debit += line.debit;
        lineMap[key].credit += line.credit;
        lineMap[key].entryCount += 1;
      }
    }
    return Object.values(lineMap).sort((a, b) => a.glNumber - b.glNumber);
  }

  // ── Build subledger summary for reconciliation ─────────────────────────────
  function buildSubledgerSummary(entryList) {
    const acctMap = {};
    for (const entry of entryList) {
      for (const line of entry.lines) {
        const key = `${line.account}-${entry.entity}`;
        if (!acctMap[key]) {
          acctMap[key] = {
            account: line.account,
            entity: entry.entity,
            debit: 0,
            credit: 0,
          };
        }
        acctMap[key].debit += line.debit;
        acctMap[key].credit += line.credit;
      }
    }
    return Object.values(acctMap);
  }

  // ── Per-source JE data ────────────────────────────────────────────────────
  const sourceJEs = dataSources.map((ds) => {
    const sourceEntries = validEntries.filter((e) => e.data_source === ds);
    const jeLines = buildJELines(sourceEntries);
    const slSummary = buildSubledgerSummary(sourceEntries);
    const jeTotalDR = jeLines.reduce((s, l) => s + l.debit, 0);
    const jeTotalCR = jeLines.reduce((s, l) => s + l.credit, 0);
    const slTotalDR = slSummary.reduce((s, l) => s + l.debit, 0);
    const slTotalCR = slSummary.reduce((s, l) => s + l.credit, 0);
    const reconciled =
      Math.abs(jeTotalDR - slTotalDR) < 0.01 &&
      Math.abs(jeTotalCR - slTotalCR) < 0.01;
    const code = DATA_SOURCE_CODES[ds] || ds.replace(/\s+/g, "_").toUpperCase();
    const defaultRef = `JE-${selectedPeriod}-${code}-001`;
    // Use the ref from export history if one exists (may have been edited during confirmation)
    const historyRecord = exportHistory.find(
      (exp) => exp.period === selectedPeriod && exp.dataSource === ds && exp.status !== "Cancelled"
    );
    const jeRef = historyRecord?.netsuiteRef || defaultRef;

    return {
      dataSource: ds,
      code,
      jeRef,
      entries: sourceEntries,
      jeLines,
      slSummary,
      jeTotalDR,
      jeTotalCR,
      slTotalDR,
      slTotalCR,
      reconciled,
    };
  });

  const allReconciled = sourceJEs.every((s) => s.reconciled);

  // ── Download CSV for a single JE ────────────────────────────────────────
  function downloadCSV(sje) {
    const memo = `Subledger auto-generated - ${sje.dataSource} - ${sje.entries.length} entries`;
    const csvMemoLine = `# Memo: ${memo}\n`;
    const csvHeader =
      "JE_Reference,Date,GL_Account_Number,GL_Account_Name,Subsidiary,Debit,Credit\n";
    const csvRows = sje.jeLines
      .map(
        (l) =>
          `${sje.jeRef},${selectedPeriod}-01,${l.glNumber},"${l.glAccount}","${l.entity}",${l.debit.toFixed(2)},${l.credit.toFixed(2)}`
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvMemoLine + csvHeader + csvRows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sje.jeRef}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Record export in history ──────────────────────────────────────────────
  function recordExport(sje, seqOffset = 0) {
    return {
      exportId: `EXP-${String(exportHistory.length + 1 + seqOffset).padStart(3, "0")}`,
      period: selectedPeriod,
      dataSource: sje.dataSource,
      exportDate: new Date().toISOString(),
      exportedBy: "James Kirihara",
      entryCount: sje.entries.length,
      netsuiteRef: sje.jeRef,
      status: "Exported",
      acknowledgedExceptions: openExceptions.length,
      acknowledgedNote:
        [
          openExceptions.length > 0
            ? `${openExceptions.length} exception(s) with $${openExceptions.reduce((s, e) => s + e.impact, 0).toFixed(2)} aggregate impact acknowledged.`
            : null,
          bankReconItems.length > 0
            ? `${bankReconItems.length} bank recon item(s) with $${bankReconNetExposure.toFixed(2)} net exposure acknowledged.`
            : null,
        ].filter(Boolean).join(" ") || undefined,
    };
  }

  // ── Export a single data source JE (individual button) ────────────────────
  function handleExportSource(sje) {
    downloadCSV(sje);
    setExportedSources((prev) => new Set([...prev, sje.dataSource]));
    setExportHistoryData((prev) => [recordExport(sje), ...prev]);
  }

  // ── Export all sources as a single combined CSV ────────────────────────────
  function handleExportAll() {
    const toExport = sourceJEs.filter((sje) => !exportedSources.has(sje.dataSource));
    const newRecords = toExport.map((sje, i) => recordExport(sje, i));

    const memo = `Subledger auto-generated - ${selectedPeriod} - ${toExport.map((s) => s.dataSource).join(", ")} - ${toExport.reduce((s, sje) => s + sje.entries.length, 0)} entries`;
    const csvMemoLine = `# Memo: ${memo}\n`;
    const csvHeader =
      "JE_Reference,Data_Source,Date,GL_Account_Number,GL_Account_Name,Subsidiary,Debit,Credit\n";
    const csvRows = toExport.flatMap((sje) =>
      sje.jeLines.map(
        (l) =>
          `${sje.jeRef},"${sje.dataSource}",${selectedPeriod}-01,${l.glNumber},"${l.glAccount}","${l.entity}",${l.debit.toFixed(2)},${l.credit.toFixed(2)}`
      )
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csvMemoLine + csvHeader + csvRows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `JE-${selectedPeriod}-all-sources.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setExportedSources((prev) => new Set([...prev, ...toExport.map((s) => s.dataSource)]));
    setExportHistoryData((prev) => [...newRecords.reverse(), ...prev]);
    setPeriodStatuses((prev) => ({
      ...prev,
      [selectedPeriod]: "Exported",
    }));
  }

  // ── Cancel export ─────────────────────────────────────────────────────────
  function handleCancelExport() {
    // Mark this period's export records as Cancelled
    setExportHistoryData((prev) =>
      prev.map((exp) =>
        exp.period === selectedPeriod && exp.status === "Exported"
          ? { ...exp, status: "Cancelled", cancelledDate: new Date().toISOString() }
          : exp
      )
    );
    setExportedSources(new Set());
    setAcknowledged(false);
    setBankReconAcknowledged(false);
    setPeriodStatuses((prev) => ({
      ...prev,
      [selectedPeriod]: "In Review",
    }));
  }

  // ── Confirm in NetSuite ───────────────────────────────────────────────────
  function startConfirm() {
    // Pre-populate editable refs from current export history
    const refs = {};
    for (const exp of exportHistory) {
      if (exp.period === selectedPeriod && exp.status === "Exported") {
        refs[exp.exportId] = exp.netsuiteRef;
      }
    }
    setConfirmRefs(refs);
    setConfirming(true);
  }

  function handleConfirm() {
    setExportHistoryData((prev) =>
      prev.map((exp) =>
        exp.period === selectedPeriod && exp.status === "Exported"
          ? {
              ...exp,
              netsuiteRef: confirmRefs[exp.exportId] || exp.netsuiteRef,
              status: "Confirmed in NetSuite",
              confirmedDate: new Date().toISOString(),
            }
          : exp
      )
    );
    setPeriodStatuses((prev) => ({
      ...prev,
      [selectedPeriod]: "Closed",
    }));
    setConfirming(false);
  }

  // Bank recon items for this period
  const bankAccounts = bankReconData[selectedPeriod] || [];
  const bankReconItems = bankAccounts.flatMap((a) => a.reconItems);
  const bankReconNetExposure = bankReconItems.reduce((s, r) => s + r.amount, 0);

  const isOpenPeriod = currentStatus === "Open";
  const isExported = currentStatus === "Exported";
  const isClosed = currentStatus === "Closed";
  const allExported = dataSources.length > 0 && dataSources.every((ds) => exportedSources.has(ds));
  const canExport =
    allReconciled &&
    !isOpenPeriod &&
    !isExported &&
    !isClosed &&
    !allExported &&
    (openExceptions.length === 0 || acknowledged) &&
    (bankReconItems.length === 0 || bankReconAcknowledged);

  const aggregateExposure = openExceptions.reduce((s, e) => s + e.impact, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            GL Journal Entry Preview
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {selectedPeriod} &middot; {dataSources.length} journal{dataSources.length !== 1 ? "s" : ""} by data source
          </p>
        </div>
      </div>

      {/* ── Overall reconciliation status ────────────────────────────────── */}
      <div
        className={`mb-6 rounded-lg px-4 py-3 flex items-center gap-2 text-sm font-medium ${
          allReconciled
            ? "bg-green-50 text-green-800 border border-green-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}
      >
        {allReconciled ? (
          <>
            <CheckCircle size={16} /> All subledger totals match proposed JEs — reconciled
          </>
        ) : (
          <>
            <XCircle size={16} /> Reconciliation variance detected in one or more JEs — review before approving
          </>
        )}
      </div>

      {/* ── Exception warning ────────────────────────────────────────────── */}
      {openExceptions.length > 0 && !allExported && !isExported && !isClosed && (
        <div className="mb-6 rounded-lg px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">
                {openExceptions.length} unresolved exception
                {openExceptions.length !== 1 ? "s" : ""} ({fmt(aggregateExposure)}{" "}
                aggregate impact)
              </p>
              <p className="mt-1">
                To approve this export, you must acknowledge the open exceptions.
              </p>
              <label className="mt-2 flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I acknowledge {openExceptions.length} open exception
                  {openExceptions.length !== 1 ? "s" : ""} with{" "}
                  {fmt(aggregateExposure)} aggregate impact and am proceeding
                  with the JE export.
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── Bank recon warning ─────────────────────────────────────────── */}
      {bankReconItems.length > 0 && !allExported && !isExported && !isClosed && (
        <div className="mb-6 rounded-lg px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">
                {bankReconItems.length} bank reconciliation item{bankReconItems.length !== 1 ? "s" : ""} ({fmt(bankReconNetExposure)}{" "}
                net exposure)
              </p>
              <p className="mt-1">
                To approve this export, you must acknowledge the outstanding bank reconciliation differences.
              </p>
              <label className="mt-2 flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bankReconAcknowledged}
                  onChange={(e) => setBankReconAcknowledged(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I acknowledge {bankReconItems.length} bank reconciling item{bankReconItems.length !== 1 ? "s" : ""} with{" "}
                  {fmt(bankReconNetExposure)} net exposure and am proceeding
                  with the JE export.
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── Exported banner ──────────────────────────────────────────────── */}
      {(allExported || isExported) && !isClosed && (
        <div className="mb-6 rounded-lg px-4 py-3 bg-purple-50 border border-purple-200 text-purple-800 text-sm font-medium flex items-center gap-2">
          <FileCheck size={16} /> This period has been exported. Confirm the upload in NetSuite or cancel to make changes.
        </div>
      )}

      {/* ── Closed banner ────────────────────────────────────────────────── */}
      {isClosed && (
        <div className="mb-6 rounded-lg px-4 py-3 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium flex items-center gap-2">
          <CheckCircle size={16} /> This period has been confirmed in NetSuite and is closed.
        </div>
      )}

      {/* ── Per-source JE sections ───────────────────────────────────────── */}
      {sourceJEs.map((sje) => {
        const sourceExported = exportedSources.has(sje.dataSource) || isExported || isClosed;
        return (
          <div key={sje.dataSource} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {sje.jeRef}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Source: {sje.dataSource} &middot; {sje.entries.length} entries
                </p>
              </div>
              <div className="flex items-center gap-2">
                {sje.reconciled ? (
                  <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 font-medium flex items-center gap-1">
                    <CheckCircle size={12} /> Reconciled
                  </span>
                ) : (
                  <span className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 font-medium flex items-center gap-1">
                    <XCircle size={12} /> Variance
                  </span>
                )}
                {sourceExported && (
                  <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5 font-medium">
                    {isClosed ? "Confirmed" : "Exported"}
                  </span>
                )}
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <th className="pb-2 pr-3">GL #</th>
                  <th className="pb-2 pr-3">GL Account</th>
                  <th className="pb-2 pr-3">Entity</th>
                  <th className="pb-2 pr-3 text-right">JE Debit</th>
                  <th className="pb-2 pr-3 text-right">JE Credit</th>
                  <th className="pb-2 pr-3 text-center border-l border-gray-200">
                    Subledger Source
                  </th>
                  <th className="pb-2 pr-3 text-right">SL Debit</th>
                  <th className="pb-2 text-right">SL Credit</th>
                </tr>
              </thead>
              <tbody>
                {sje.jeLines.map((line, i) => {
                  const slMatch = sje.slSummary.find(
                    (s) =>
                      s.entity === line.entity &&
                      s.account === line.subledgerAccount
                  );
                  return (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs text-gray-500">
                        {line.glNumber}
                      </td>
                      <td className="py-2 pr-3 font-medium text-gray-900">
                        {line.glAccount}
                      </td>
                      <td className="py-2 pr-3 text-gray-600 text-xs">
                        {line.entity.replace("Ramp ", "")}
                      </td>
                      <td className="py-2 pr-3 text-right text-gray-700">
                        {line.debit > 0 ? fmt(line.debit) : ""}
                      </td>
                      <td className="py-2 pr-3 text-right text-gray-700">
                        {line.credit > 0 ? fmt(line.credit) : ""}
                      </td>
                      <td className="py-2 pr-3 text-center border-l border-gray-100 text-xs text-indigo-600">
                        {line.subledgerAccount}
                      </td>
                      <td className="py-2 pr-3 text-right text-gray-700">
                        {slMatch && slMatch.debit > 0 ? fmt(slMatch.debit) : ""}
                      </td>
                      <td className="py-2 text-right text-gray-700">
                        {slMatch && slMatch.credit > 0 ? fmt(slMatch.credit) : ""}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-200 font-semibold">
                  <td colSpan={3} className="py-2 pr-3 text-gray-900">
                    Total
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-900">
                    {fmt(sje.jeTotalDR)}
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-900">
                    {fmt(sje.jeTotalCR)}
                  </td>
                  <td className="py-2 pr-3 border-l border-gray-100"></td>
                  <td className="py-2 pr-3 text-right text-gray-900">
                    {fmt(sje.slTotalDR)}
                  </td>
                  <td className="py-2 text-right text-gray-900">
                    {fmt(sje.slTotalCR)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        {isOpenPeriod && (
          <span className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            Period in progress — export available after period close
          </span>
        )}

        {/* Pre-export: Approve & Export */}
        {!isExported && !isClosed && !isOpenPeriod && (
          <button
            onClick={handleExportAll}
            disabled={!canExport}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-colors ${
              canExport
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Download size={16} />
            Approve & Export All to NetSuite ({dataSources.length} JEs)
          </button>
        )}

        {/* Post-export: Cancel + Confirm */}
        {isExported && !confirming && (
          <>
            <button
              onClick={handleCancelExport}
              className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <RotateCcw size={16} />
              Cancel Export
            </button>
            <button
              onClick={startConfirm}
              className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <CheckCircle size={16} />
              Confirm in NetSuite
            </button>
          </>
        )}
      </div>

      {/* ── Confirm panel — verify/edit JE references ────────────────────── */}
      {confirming && (
        <div className="bg-white rounded-xl border-2 border-green-300 p-5 mt-4">
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            Confirm NetSuite Upload
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Verify or update the JE references used in NetSuite, then confirm.
          </p>
          <div className="space-y-3 mb-5">
            {Object.entries(confirmRefs).map(([exportId, ref]) => {
              const exp = exportHistory.find((e) => e.exportId === exportId);
              return (
                <div key={exportId} className="flex items-center gap-3">
                  <span className="text-xs text-indigo-600 font-medium w-48 truncate">
                    {exp?.dataSource || "Unknown"}
                  </span>
                  <input
                    value={ref}
                    onChange={(e) =>
                      setConfirmRefs((prev) => ({ ...prev, [exportId]: e.target.value }))
                    }
                    className="flex-1 text-sm font-mono border border-gray-300 rounded px-3 py-1.5 focus:border-green-500 focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setConfirming(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <CheckCircle size={16} />
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
