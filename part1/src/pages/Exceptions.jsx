import { useState } from "react";
import { useApp } from "../App";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const typeColors = {
  "Unbalanced entry": "bg-red-50 text-red-700",
  "Missing GL mapping": "bg-amber-50 text-amber-700",
  "Period mismatch": "bg-blue-50 text-blue-700",
  "Duplicate event": "bg-purple-50 text-purple-700",
  "Missing dimension": "bg-orange-50 text-orange-700",
  "Orphaned event": "bg-gray-50 text-gray-700",
  "Orphaned reversal": "bg-pink-50 text-pink-700",
  "Incomplete/missing data": "bg-red-50 text-red-700",
};

const statusOptions = ["Open", "Under Review", "Resolved", "Accepted"];

export default function Exceptions() {
  const { exceptions, openExceptions, exceptionsData, setExceptionsData, selectedPeriod, currentStatus } =
    useApp();
  const [expandedId, setExpandedId] = useState(null);

  const aggregateImpact = openExceptions.reduce(
    (sum, ex) => sum + ex.impact,
    0
  );

  function updateException(id, updates) {
    setExceptionsData(
      exceptionsData.map((ex) =>
        ex.id === id ? { ...ex, ...updates } : ex
      )
    );
  }

  // ── Warning banner ─────────────────────────────────────────────────────────
  const showWarning =
    currentStatus === "Open" &&
    exceptions.length > 0;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Exception Handling Review
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {selectedPeriod} &middot; Review and resolve data quality issues before
          JE export
        </p>
      </div>

      {/* ── Aggregate exposure ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Total Exceptions
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {exceptions.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Open / Unresolved
          </p>
          <p
            className={`text-2xl font-bold ${
              openExceptions.length > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {openExceptions.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Aggregate $ Exposure
          </p>
          <p
            className={`text-2xl font-bold ${
              aggregateImpact > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {fmt(aggregateImpact)}
          </p>
        </div>
      </div>

      {/* ── Info banner ────────────────────────────────────────────────── */}
      {openExceptions.length > 0 && (
        <div className="mb-6 rounded-lg px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <p className="font-medium">
            {openExceptions.length} unresolved exception
            {openExceptions.length !== 1 ? "s" : ""} with {fmt(aggregateImpact)}{" "}
            aggregate impact.
          </p>
          <p className="mt-1 text-amber-700">
            You can proceed to JE Preview, but you will be asked to acknowledge
            open exceptions before approving the export.
          </p>
        </div>
      )}

      {exceptions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">
            No exceptions for this period.
          </p>
        </div>
      ) : (
        /* ── Exception list ──────────────────────────────────────────── */
        <div className="space-y-3">
          {exceptions.map((ex) => {
            const expanded = expandedId === ex.id;
            return (
              <div
                key={ex.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Header row */}
                <button
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() =>
                    setExpandedId(expanded ? null : ex.id)
                  }
                >
                  {expanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                  <span className="font-mono text-xs text-gray-500 w-20">
                    {ex.id}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      typeColors[ex.type] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {ex.type}
                  </span>
                  <span className="text-xs text-gray-500 w-24">
                    {ex.date}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 truncate">
                    {ex.rootCause.slice(0, 80)}...
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {fmt(ex.impact)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ex.status === "Open"
                        ? "bg-red-100 text-red-700"
                        : ex.status === "Resolved"
                        ? "bg-green-100 text-green-700"
                        : ex.status === "Accepted"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {ex.status}
                  </span>
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Root Cause
                        </h4>
                        <p className="text-sm text-gray-700">
                          {ex.rootCause}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Recommended Action
                        </h4>
                        <p className="text-sm text-gray-700">
                          {ex.recommendedAction}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Affected Entries
                      </h4>
                      <p className="text-sm font-mono text-indigo-600">
                        {ex.affectedEntries?.join(", ") || "—"}
                      </p>
                    </div>

                    <div className="mt-4 flex items-end gap-4">
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                          Status
                        </label>
                        <select
                          value={ex.status}
                          onChange={(e) =>
                            updateException(ex.id, {
                              status: e.target.value,
                            })
                          }
                          className="text-sm border border-gray-300 rounded px-2 py-1.5 w-full"
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={ex.notes}
                          onChange={(e) =>
                            updateException(ex.id, {
                              notes: e.target.value,
                            })
                          }
                          placeholder="Document your decision..."
                          className="text-sm border border-gray-300 rounded px-2 py-1.5 w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
