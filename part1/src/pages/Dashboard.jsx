import { useApp } from "../App";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Activity,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Filter } from "lucide-react";

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function Dashboard() {
  const {
    selectedPeriod,
    currentStatus,
    entries,
    openExceptions,
    pipelineHealth,
    allPipelineHealth,
    periodStatuses,
    allEntries,
  } = useApp();
  const navigate = useNavigate();
  const [pipelineSourceFilter, setPipelineSourceFilter] = useState("All");

  // ── Summary metrics ────────────────────────────────────────────────────────
  const validEntries = entries.filter((e) => e.status === "valid");
  const totalDR = validEntries.reduce(
    (sum, e) => sum + e.lines.reduce((s, l) => s + l.debit, 0),
    0
  );
  const totalCR = validEntries.reduce(
    (sum, e) => sum + e.lines.reduce((s, l) => s + l.credit, 0),
    0
  );
  const balanced = Math.abs(totalDR - totalCR) < 0.01;

  // Revenue / card volume / source events — derived from subledger entries so they reconcile with Subledger Review
  const revenueAccounts = ["Interchange Revenue"];
  const totalRevenue = validEntries.reduce(
    (sum, e) => sum + e.lines.filter((l) => revenueAccounts.includes(l.account)).reduce((s, l) => s + l.credit - l.debit, 0),
    0
  );
  const totalCardVolume = validEntries
    .filter((e) => e.event_type === "card_transaction")
    .reduce((sum, e) => sum + (e.lines.find((l) => l.account === "Card Accounts Receivable")?.debit || 0), 0);
  const totalSourceEvents = pipelineHealth.reduce((sum, d) => sum + d.sourceEvents, 0);

  // ── Pipeline chart data ────────────────────────────────────────────────────
  const chartData = pipelineHealth.map((d) => {
    const src = pipelineSourceFilter !== "All" && d.bySource?.[pipelineSourceFilter]
      ? d.bySource[pipelineSourceFilter]
      : d;
    return {
      date: d.date.slice(8), // day only
      fullDate: d.date,
      "Source Events": src.sourceEvents,
      "Captured Events": src.capturedEvents,
      "Valid Subledger Journals": src.validEntries,
      pipelineGap: src.sourceEvents - src.capturedEvents,
      processingGap: src.capturedEvents - src.validEntries,
      noData: src.sourceEvents === 0,
    };
  });

  const flaggedDays = chartData.filter(
    (d) => d.pipelineGap > 1 || d.processingGap > 1 || d.noData
  );

  // ── Other periods ──────────────────────────────────────────────────────────
  const allPeriods = ["2026-01", "2026-02", "2026-03", "2026-04"];
  const otherPeriods = allPeriods
    .filter((p) => p !== selectedPeriod)
    .map((p) => {
      const pe = allEntries.filter(
        (e) => e.posted_period === p && e.status === "valid"
      );
      const rev = pe.reduce(
        (s, e) => s + e.lines.filter((l) => revenueAccounts.includes(l.account)).reduce((a, l) => a + l.credit - l.debit, 0),
        0
      );
      const vol = pe
        .filter((e) => e.event_type === "card_transaction")
        .reduce((s, e) => s + (e.lines.find((l) => l.account === "Card Accounts Receivable")?.debit || 0), 0);
      return {
        period: p,
        status: periodStatuses[p] || "Open",
        entries: pe.length,
        totalRevenue: rev,
        totalCardVolume: vol,
      };
    });

  // ── Custom tooltip ─────────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-900 mb-1">Day {label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
        {d && (
          <>
            {d.noData && (
              <>
                <hr className="my-1 border-gray-100" />
                <p className="text-red-600 font-medium">
                  No data received — complete pipeline outage
                </p>
              </>
            )}
            {!d.noData && (d.pipelineGap > 1 || d.processingGap > 1) && (
              <>
                <hr className="my-1 border-gray-100" />
                {d.pipelineGap > 1 && (
                  <p className="text-red-600 font-medium">
                    Pipeline gap: {d.pipelineGap} events missing
                  </p>
                )}
                {d.processingGap > 1 && (
                  <p className="text-amber-600 font-medium">
                    Processing gap: {d.processingGap} entries failed
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  };

  // ── Stat card ──────────────────────────────────────────────────────────────
  const StatCard = ({ label, value, icon: Icon, color = "text-gray-600" }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        <Icon size={16} className={color} />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Period Dashboard
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {selectedPeriod} &middot; Pipeline health and close readiness
          </p>
        </div>
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Revenue"
          value={fmt(totalRevenue)}
          icon={TrendingUp}
          color="text-green-600"
        />
        <StatCard
          label="Card Spend Volume"
          value={fmt(totalCardVolume)}
          icon={TrendingUp}
          color="text-indigo-600"
        />
        <StatCard
          label="Source System Events"
          value={totalSourceEvents.toLocaleString()}
          icon={Activity}
          color="text-indigo-600"
        />
        <StatCard
          label="Open Exceptions"
          value={openExceptions.length}
          icon={openExceptions.length > 0 ? AlertTriangle : CheckCircle}
          color={openExceptions.length > 0 ? "text-red-600" : "text-green-600"}
        />
      </div>

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
            <CheckCircle size={16} /> DR = CR — Subledger is balanced for this
            period
          </>
        ) : (
          <>
            <XCircle size={16} /> DR ≠ CR — Variance of{" "}
            {fmt(Math.abs(totalDR - totalCR))} detected
          </>
        )}
      </div>

      {/* ── Pipeline health chart ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-gray-900">
            Daily Pipeline Health
          </h3>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <label className="text-xs text-gray-500">Data Source:</label>
            <select
              value={pipelineSourceFilter}
              onChange={(e) => setPipelineSourceFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="All">All Sources</option>
              <option value="Transaction Canonical">Transaction Canonical</option>
              <option value="Financial Data Platform">Financial Data Platform</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Source events → captured in event layer → valid subledger journals
          <span className="italic ml-1">(illustrative volume — production scale)</span>
          produced
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barGap={0} barCategoryGap="20%">
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              content={() => (
                <div className="flex justify-center gap-6 mt-2 text-xs text-gray-600">
                  {[
                    { label: "Source Events", color: "#c7d2fe" },
                    { label: "Captured Events", color: "#818cf8" },
                    { label: "Valid Subledger Journals", color: "#4f46e5" },
                  ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              )}
            />
            <Bar dataKey="Source Events" fill="#c7d2fe" radius={[2, 2, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.pipelineGap > 1 ? "#fca5a5" : "#c7d2fe"}
                />
              ))}
            </Bar>
            <Bar dataKey="Captured Events" fill="#818cf8" radius={[2, 2, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.pipelineGap > 1 ? "#fca5a5" : "#818cf8"}
                />
              ))}
            </Bar>
            <Bar dataKey="Valid Subledger Journals" fill="#4f46e5" radius={[2, 2, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.processingGap > 1 ? "#f59e0b" : "#4f46e5"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Flagged days ───────────────────────────────────────────────── */}
      {flaggedDays.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Flagged Days
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Issue</th>
                <th className="pb-2 pr-4">Gap</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {flaggedDays.map((d) => (
                <tr
                  key={d.fullDate}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="py-2 pr-4 font-medium text-gray-900">
                    {d.fullDate}
                  </td>
                  <td className="py-2 pr-4">
                    {d.noData && (
                      <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded text-xs font-medium">
                        <XCircle size={12} /> No data received
                      </span>
                    )}
                    {!d.noData && d.pipelineGap > 1 && (
                      <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded text-xs font-medium">
                        <XCircle size={12} /> Pipeline failure
                      </span>
                    )}
                    {!d.noData && d.processingGap > 1 && (
                      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs font-medium ml-1">
                        <AlertTriangle size={12} /> Processing failure
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">
                    {d.noData && (
                      <span>0 events — complete outage</span>
                    )}
                    {!d.noData && d.pipelineGap > 1 && (
                      <span>{d.pipelineGap} events missing</span>
                    )}
                    {!d.noData && d.processingGap > 1 && (
                      <span>{d.processingGap} entries failed</span>
                    )}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => navigate("/exceptions")}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                    >
                      View exceptions &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Other periods ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          Other Periods
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <th className="pb-2 pr-4">Period</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Entries</th>
              <th className="pb-2 pr-4 text-right">Total Revenue</th>
              <th className="pb-2 text-right">Card Spend Volume</th>
            </tr>
          </thead>
          <tbody>
            {otherPeriods.map((p) => (
              <tr key={p.period} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-4 font-medium text-gray-900">
                  {p.period}
                </td>
                <td className="py-2 pr-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.status === "Exported"
                      ? "bg-purple-100 text-purple-800"
                      : p.status === "In Review"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-2 pr-4 text-gray-600">{p.entries}</td>
                <td className="py-2 pr-4 text-right text-green-600">{fmt(p.totalRevenue)}</td>
                <td className="py-2 text-right text-indigo-600">{fmt(p.totalCardVolume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
