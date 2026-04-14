import { useState } from "react";
import { useApp } from "../App";
import { bankReconData } from "../data/seedData";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Landmark,
} from "lucide-react";

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function BankReconciliation() {
  const { selectedPeriod } = useApp();
  const [expandedAcct, setExpandedAcct] = useState(null);

  const accounts = bankReconData[selectedPeriod] || [];
  const hasActivity = accounts.some((a) => a.slDebit > 0 || a.slCredit > 0 || a.bankBalance !== 0);
  const allReconciled = accounts.every((a) => Math.abs(a.variance) < 0.01);
  const totalReconItems = accounts.reduce((s, a) => s + a.reconItems.length, 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Bank Reconciliation
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {selectedPeriod} &middot; Cash account balances vs. bank/processor reported balances
        </p>
      </div>

      {/* Overall status */}
      {hasActivity && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 flex items-center gap-2 text-sm font-medium ${
            allReconciled
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {allReconciled ? (
            <>
              <CheckCircle size={16} /> All bank accounts reconciled — {totalReconItems} reconciling item{totalReconItems !== 1 ? "s" : ""} identified
            </>
          ) : (
            <>
              <XCircle size={16} /> Unreconciled variances in one or more bank accounts
            </>
          )}
        </div>
      )}

      {!hasActivity && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Landmark size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No cash activity for this period.</p>
          <p className="text-gray-400 text-sm mt-1">
            Bank reconciliation is available for periods with cash postings.
          </p>
        </div>
      )}

      {/* Summary cards */}
      {hasActivity && (() => {
        const totalSlNet = accounts.reduce((s, a) => s + a.slNet, 0);
        const totalBankBal = accounts.reduce((s, a) => s + a.bankBalance, 0);
        const totalReconNet = accounts.reduce(
          (s, a) => s + a.reconItems.reduce((t, r) => t + r.amount, 0), 0
        );
        return (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Subledger Cash (Net)</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{fmt(totalSlNet)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Bank Balances (Total)</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{fmt(totalBankBal)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Reconciling Items (Net)</p>
              <p className={`text-xl font-bold mt-1 ${totalReconNet !== 0 ? "text-amber-600" : "text-gray-900"}`}>
                {fmt(totalReconNet)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Unexplained Variance</p>
              <p className={`text-xl font-bold mt-1 ${allReconciled ? "text-green-700" : "text-red-600"}`}>
                {fmt(totalBankBal - totalSlNet - totalReconNet)}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Bank account cards */}
      {hasActivity && (
        <div className="space-y-3">
          {[...accounts].sort((a, b) => a.entity.localeCompare(b.entity) || a.processor.localeCompare(b.processor)).map((acct) => {
            const expanded = expandedAcct === acct.accountId;
            const hasReconItems = acct.reconItems.length > 0;
            const isReconciled = Math.abs(acct.variance) < 0.01;
            const noActivity = acct.slDebit === 0 && acct.slCredit === 0 && acct.bankBalance === 0;

            return (
              <div
                key={acct.accountId}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Summary row */}
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedAcct(expanded ? null : acct.accountId)}
                >
                  {expanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                  <Landmark size={16} className="text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-900">
                      {acct.label}
                    </span>
                    <span className="ml-3 text-xs font-mono text-gray-400">
                      Acct #{acct.accountId}
                    </span>
                    <span className="ml-3 text-xs text-gray-500">
                      GL {acct.glNumber}
                    </span>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-xs text-gray-500">Subledger Net</p>
                    <p className="text-sm font-medium text-gray-900">{fmt(acct.slNet)}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-xs text-gray-500">Bank Balance</p>
                    <p className="text-sm font-medium text-gray-900">{fmt(acct.bankBalance)}</p>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-xs text-gray-500">Recon Items</p>
                    <p className={`text-sm font-medium ${hasReconItems ? "text-amber-600" : "text-gray-400"}`}>
                      {acct.reconItems.length}
                    </p>
                  </div>
                  {noActivity ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                      No Activity
                    </span>
                  ) : isReconciled ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircle size={12} /> Reconciled
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1">
                      <XCircle size={12} /> Variance
                    </span>
                  )}
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    {/* Reconciliation waterfall */}
                    <div className="mb-5">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Reconciliation
                      </h4>
                      <table className="w-full text-sm">
                        <tbody>
                          {/* Subledger balance */}
                          <tr className="border-b border-gray-50">
                            <td className="py-2 pr-4 font-medium text-gray-900">
                              Subledger Cash — Net Activity
                            </td>
                            <td className="py-2 text-right font-medium text-gray-900 w-36">
                              {fmt(acct.slNet)}
                            </td>
                          </tr>
                          {/* Subledger detail */}
                          <tr className="border-b border-gray-50">
                            <td className="py-1.5 pr-4 pl-6 text-xs text-gray-500">
                              Debits (cash in)
                            </td>
                            <td className="py-1.5 text-right text-xs text-gray-500 w-36">
                              {fmt(acct.slDebit)}
                            </td>
                          </tr>
                          <tr className="border-b border-gray-50">
                            <td className="py-1.5 pr-4 pl-6 text-xs text-gray-500">
                              Credits (cash out)
                            </td>
                            <td className="py-1.5 text-right text-xs text-gray-500 w-36">
                              ({fmt(acct.slCredit)})
                            </td>
                          </tr>

                          {/* Reconciling items */}
                          {acct.reconItems.length > 0 && (
                            <tr>
                              <td colSpan={2} className="pt-3 pb-1">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  Reconciling Items
                                </span>
                              </td>
                            </tr>
                          )}
                          {acct.reconItems.map((item, i) => (
                            <tr key={i} className="border-b border-gray-50">
                              <td className="py-2 pr-4 pl-6 text-sm text-gray-700 flex items-start gap-2">
                                <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                                <div>
                                  <p>{item.description}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {item.type === "bank_only"
                                      ? "In bank, not yet in subledger"
                                      : "In subledger, not yet in bank"}
                                  </p>
                                </div>
                              </td>
                              <td className={`py-2 text-right font-medium w-36 ${
                                item.amount >= 0 ? "text-green-700" : "text-red-600"
                              }`}>
                                {item.amount >= 0 ? "+" : ""}{fmt(item.amount)}
                              </td>
                            </tr>
                          ))}

                          {acct.reconItems.length === 0 && (
                            <tr className="border-b border-gray-50">
                              <td className="py-2 pr-4 pl-6 text-sm text-gray-400 italic">
                                No reconciling items
                              </td>
                              <td className="py-2 text-right text-gray-400 w-36">
                                $0.00
                              </td>
                            </tr>
                          )}

                          {/* Adjusted subledger = bank */}
                          <tr className="border-t-2 border-gray-200">
                            <td className="py-2 pr-4 font-semibold text-gray-900">
                              Adjusted Subledger Balance
                            </td>
                            <td className="py-2 text-right font-semibold text-gray-900 w-36">
                              {fmt(acct.slNet + acct.reconItems.reduce((s, r) => s + r.amount, 0))}
                            </td>
                          </tr>
                          <tr className="border-b border-gray-50">
                            <td className="py-2 pr-4 font-semibold text-gray-900">
                              Bank Reported Balance
                            </td>
                            <td className="py-2 text-right font-semibold text-gray-900 w-36">
                              {fmt(acct.bankBalance)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 font-semibold text-gray-900">
                              Unexplained Variance
                            </td>
                            <td className={`py-2 text-right font-semibold w-36 ${
                              Math.abs(acct.variance) < 0.01 ? "text-green-700" : "text-red-600"
                            }`}>
                              {fmt(acct.variance)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
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
