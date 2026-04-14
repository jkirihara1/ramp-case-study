import { useState } from "react";
import { Settings, ChevronDown, ChevronRight, Shield, Clock, ArrowRight } from "lucide-react";
import { handlerRules, BREAKAGE_RATE } from "../data/seedData";

const sideColor = { debit: "text-green-700 bg-green-50", credit: "text-red-700 bg-red-50" };

export default function HandlerRules() {
  const [expanded, setExpanded] = useState(new Set(["H-RWD-001"]));
  const [editingBreakage, setEditingBreakage] = useState(false);
  const [breakageRate, setBreakageRate] = useState(BREAKAGE_RATE * 100);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Handler Rules</h2>
        <p className="text-gray-500 mt-1">
          Accounting-owned configuration for how rewards events become subledger entries
        </p>
      </div>

      {/* Ownership banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
        <Shield size={20} className="text-indigo-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-indigo-900">Handler rules are accounting policy, not engineering logic</p>
          <p className="text-sm text-indigo-700 mt-1">
            The accounting team owns and manages these rules. Engineering owns the execution platform.
            Every change produces a new version with timestamp, prior version preserved, and approval required for material changes.
          </p>
        </div>
      </div>

      {/* Handler cards */}
      <div className="space-y-3">
        {handlerRules.map((handler) => {
          const isOpen = expanded.has(handler.id);
          return (
            <div key={handler.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <button
                onClick={() => toggle(handler.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
              >
                {isOpen ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-400">{handler.id}</span>
                    <span className="font-semibold text-gray-900">{handler.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">v{handler.version}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{handler.description}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} />
                  {handler.effectiveDate}
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50/50">
                  {/* Trigger */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Event Trigger</h4>
                    <p className="text-sm text-gray-700 bg-white rounded border border-gray-200 px-3 py-2">
                      {handler.trigger}
                    </p>
                  </div>

                  {/* Entry template */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Entry Template</h4>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-gray-600">
                            <th className="text-left px-3 py-2 font-medium">Account</th>
                            <th className="text-left px-3 py-2 font-medium">GL</th>
                            <th className="text-left px-3 py-2 font-medium">Side</th>
                            <th className="text-left px-3 py-2 font-medium">Amount Rule</th>
                          </tr>
                        </thead>
                        <tbody>
                          {handler.entries.map((entry, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="px-3 py-2 font-medium text-gray-900">{entry.account}</td>
                              <td className="px-3 py-2 font-mono text-gray-600">{entry.glAccount}</td>
                              <td className="px-3 py-2">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${sideColor[entry.side]}`}>
                                  {entry.side.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-xs text-gray-600">{entry.amountRule}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Parameters */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Configurable Parameters
                    </h4>
                    <div className="space-y-2">
                      {handler.parameters.map((param, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white rounded border border-gray-200 px-3 py-2">
                          <Settings size={14} className="text-gray-400 shrink-0" />
                          <span className="text-sm font-medium text-gray-700 w-40">{param.name}</span>
                          {handler.id === "H-RWD-006" && param.name === "Breakage Rate" ? (
                            <div className="flex items-center gap-2">
                              {editingBreakage ? (
                                <>
                                  <input
                                    type="number"
                                    value={breakageRate}
                                    onChange={(e) => setBreakageRate(e.target.value)}
                                    className="w-20 text-sm border border-indigo-300 rounded px-2 py-1 text-center"
                                    step="0.5"
                                    min="0"
                                    max="100"
                                  />
                                  <span className="text-sm text-gray-500">%</span>
                                  <button
                                    onClick={() => setEditingBreakage(false)}
                                    className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => { setBreakageRate(BREAKAGE_RATE * 100); setEditingBreakage(false); }}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="text-sm font-mono text-gray-600">{breakageRate}%</span>
                                  <button
                                    onClick={() => setEditingBreakage(true)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 ml-2"
                                  >
                                    Edit
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm font-mono text-gray-600">{param.value}</span>
                          )}
                          <span className="ml-auto text-xs text-gray-400">ref: {param.configRef}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Validations */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Validation Rules</h4>
                    <ul className="space-y-1">
                      {handler.validations.map((v, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Version history note */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Handler Governance</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-indigo-500 font-bold">1</span>
            <span><strong>Versioned</strong> — every change produces a new version; prior versions preserved; historical entries never reprocessed under new rules</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-indigo-500 font-bold">2</span>
            <span><strong>Approval workflow</strong> — material parameter changes (breakage rate, provider rates) require accounting manager approval</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-indigo-500 font-bold">3</span>
            <span><strong>Audit trail</strong> — who changed what, when, and why — full change history accessible from each handler</span>
          </div>
        </div>
      </div>
    </div>
  );
}
