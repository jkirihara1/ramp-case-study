import { useState, createContext, useContext } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  AlertTriangle,
  BookOpen,
  FileCheck,
  History,
  Landmark,
} from "lucide-react";
import entries, {
  exceptions as seedExceptions,
  periodStatus as seedPeriodStatus,
  pipelineHealth,
  exportHistory as seedExportHistory,
} from "./data/seedData";
import Dashboard from "./pages/Dashboard";
import Exceptions from "./pages/Exceptions";
import SubledgerReview from "./pages/SubledgerReview";
import JournalEntryPreview from "./pages/JournalEntryPreview";
import ExportHistory from "./pages/ExportHistory";
import BankReconciliation from "./pages/BankReconciliation";

// ── Global app context ───────────────────────────────────────────────────────
export const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

// ── Status badge colours ─────────────────────────────────────────────────────
const statusColors = {
  Open: "bg-blue-100 text-blue-800",
  "In Review": "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  Exported: "bg-purple-100 text-purple-800",
  Closed: "bg-emerald-100 text-emerald-800",
};

function App() {
  const [selectedPeriod, setSelectedPeriod] = useState("2026-03");
  const [periodStatuses, setPeriodStatuses] = useState(seedPeriodStatus);
  const [exceptionsData, setExceptionsData] = useState(seedExceptions);
  const [exportHistoryData, setExportHistoryData] = useState(seedExportHistory);

  const periods = ["2026-04", "2026-03", "2026-02", "2026-01"];
  const currentStatus = periodStatuses[selectedPeriod] || "Open";

  const periodEntries = entries.filter(
    (e) => e.posted_period === selectedPeriod
  );
  const periodExceptions = exceptionsData.filter(
    (ex) => ex.period === selectedPeriod
  );
  const openExceptions = periodExceptions.filter(
    (ex) => ex.status === "Open" || ex.status === "Under Review"
  );

  const ctx = {
    selectedPeriod,
    setSelectedPeriod,
    periodStatuses,
    setPeriodStatuses,
    currentStatus,
    entries: periodEntries,
    allEntries: entries,
    exceptions: periodExceptions,
    openExceptions,
    exceptionsData,
    setExceptionsData,
    pipelineHealth: pipelineHealth[selectedPeriod] || [],
    allPipelineHealth: pipelineHealth,
    exportHistory: exportHistoryData,
    setExportHistoryData,
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/exceptions", label: "Exceptions", icon: AlertTriangle, badge: openExceptions.length > 0 ? openExceptions.length : null },
    { to: "/subledger", label: "Subledger Review", icon: BookOpen },
    { to: "/bank-recon", label: "Bank Reconciliation", icon: Landmark },
    { to: "/journal-entry", label: "JE Preview", icon: FileCheck },
    { to: "/history", label: "Export History", icon: History },
  ];

  return (
    <AppContext.Provider value={ctx}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* ── Sidebar nav ──────────────────────────────────── */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-lg font-bold text-gray-900">
              Subledger Close Workspace
            </h1>
            <div className="mt-3 flex items-center gap-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 flex-1"
              >
                {periods.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[currentStatus]}`}>
                {currentStatus}
              </span>
            </div>
          </div>

          <nav className="flex-1 p-2">
            {navItems.map(({ to, label, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {badge != null && (
                  <span className="bg-red-100 text-red-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200 text-xs text-gray-400">
            Ramp Financial Systems
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────── */}
        <main className="flex-1 ml-64 p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/exceptions" element={<Exceptions />} />
            <Route path="/subledger" element={<SubledgerReview />} />
            <Route path="/journal-entry" element={<JournalEntryPreview />} />
            <Route path="/bank-recon" element={<BankReconciliation />} />
            <Route path="/history" element={<ExportHistory />} />
          </Routes>
        </main>
      </div>
    </AppContext.Provider>
  );
}

export default App;
