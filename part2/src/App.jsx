import { useState } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import {
  Lightbulb,
  Cog,
  BarChart3,
  PieChart,
  FileText,
} from "lucide-react";
import { periods, monthlyActivity } from "./data/seedData";
import Approach from "./pages/Approach";
import HandlerRules from "./pages/HandlerRules";
import RewardsActivity from "./pages/RewardsActivity";
import BreakageReserve from "./pages/BreakageReserve";
import ProposedJE from "./pages/ProposedJE";

const statusColors = {
  "In Review": "bg-yellow-100 text-yellow-800",
  Closed: "bg-emerald-100 text-emerald-800",
};

function App() {
  const [selectedPeriod, setSelectedPeriod] = useState("2025-03");
  const currentStatus = monthlyActivity[selectedPeriod]?.status || "Open";

  const navItems = [
    { to: "/approach", label: "Approach", icon: Lightbulb },
    { to: "/handlers", label: "Handler Rules", icon: Cog },
    { to: "/activity", label: "Subledger Review", icon: BarChart3 },
    { to: "/breakage", label: "Breakage Reserve", icon: PieChart },
    { to: "/journal-entry", label: "JE Preview", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Sidebar nav ──────────────────────────────────── */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">
            Rewards Onboarding
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Case Study — Part 2</p>
          <div className="mt-3 flex items-center gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 flex-1"
            >
              {periods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[currentStatus] || "bg-gray-100 text-gray-600"}`}
            >
              {currentStatus}
            </span>
          </div>
        </div>

        <nav className="flex-1 p-2">
          {navItems.map(({ to, label, icon: Icon }, i) => (
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
              <span className="text-xs text-gray-400 w-4 text-center">{i + 1}</span>
              <Icon size={18} />
              <span className="flex-1">{label}</span>
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
          <Route path="/" element={<Navigate to="/approach" replace />} />
          <Route path="/approach" element={<Approach />} />
          <Route path="/handlers" element={<HandlerRules />} />
          <Route
            path="/activity"
            element={<RewardsActivity selectedPeriod={selectedPeriod} />}
          />
          <Route
            path="/breakage"
            element={<BreakageReserve selectedPeriod={selectedPeriod} />}
          />
          <Route
            path="/journal-entry"
            element={<ProposedJE selectedPeriod={selectedPeriod} />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
