import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../createClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { Card, StatsCard } from "../components/ui/Card";
import { Table, THead, TBody, TH, TD, TR } from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Select } from "../components/ui/Input";

// ─── Constants & Helpers ───────────────────────────────────────────────────────

const CURRENCY = "₹";

const parseDateStr = (dateStr) => {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split("/").map(Number);
  return new Date(y, m - 1, d);
};

const formatDateStr = (date) => {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const formatDateForInput = (date) => {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseDateFromInput = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const getRangeDates = (type) => {
  const now = new Date();
  const end = new Date(now.setHours(23, 59, 59, 999));
  let start = new Date();
  start.setHours(0, 0, 0, 0);

  let prevStart = new Date();
  let prevEnd = new Date();

  switch (type) {
    case "Today":
      prevStart.setDate(start.getDate() - 1);
      prevEnd.setDate(end.getDate() - 1);
      break;
    case "Last 7 Days":
      start.setDate(end.getDate() - 6);
      prevStart.setDate(start.getDate() - 7);
      prevEnd.setDate(end.getDate() - 7);
      break;
    case "Last 30 Days":
      start.setDate(end.getDate() - 29);
      prevStart.setDate(start.getDate() - 30);
      prevEnd.setDate(end.getDate() - 30);
      break;
    case "This Month":
      start = new Date(end.getFullYear(), end.getMonth(), 1);
      prevStart = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      prevEnd = new Date(end.getFullYear(), end.getMonth(), 0);
      break;
    case "This Year":
      start = new Date(end.getFullYear(), 0, 1);
      prevStart = new Date(end.getFullYear() - 1, 0, 1);
      prevEnd = new Date(end.getFullYear() - 1, 11, 31);
      break;
    default:
      start.setDate(end.getDate() - 29);
  }

  return { start, end, prevStart, prevEnd };
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Revenue() {
  const [rangeType, setRangeType] = useState("Last 30 Days");
  const [startDate, setStartDate] = useState(formatDateForInput(getRangeDates("Last 30 Days").start));
  const [endDate, setEndDate] = useState(formatDateForInput(getRangeDates("Last 30 Days").end));
  const [selectedBranch, setSelectedBranch] = useState("Total (All Branches)");
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [prevTransactions, setPrevTransactions] = useState([]);

  // 1. Fetch Branches
  useEffect(() => {
    const fetchBranches = async () => {
      const { data } = await supabase.from("users").select("branch").neq("branch", "all");
      const uniqueBranches = [...new Set(data?.map((d) => d.branch))];
      setBranches(uniqueBranches);
    };
    fetchBranches();
  }, []);

  // 2. Fetch Data based on Range
  const fetchData = useCallback(async () => {
    setLoading(true);
    const startObj = parseDateFromInput(startDate);
    const endObj = parseDateFromInput(endDate);
    if (!startObj || !endObj) return;

    // Calculate Previous Period for comparisons
    const diffDays = Math.round((endObj - startObj) / (1000 * 60 * 60 * 24)) + 1;
    const prevEnd = new Date(startObj);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - diffDays + 1);

    try {
      const { data, error } = await supabase
        .from("transaction")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;

      const filteredCurrent = data.filter((t) => {
        const d = parseDateStr(t.paid_on);
        const matchesBranch = selectedBranch === "Total (All Branches)" || t.roll_no?.startsWith(selectedBranch.charAt(0).toLowerCase() + "_");
        return d >= startObj && d <= endObj && matchesBranch;
      });

      const filteredPrev = data.filter((t) => {
        const d = parseDateStr(t.paid_on);
        const matchesBranch = selectedBranch === "Total (All Branches)" || t.roll_no?.startsWith(selectedBranch.charAt(0).toLowerCase() + "_");
        return d >= prevStart && d <= prevEnd && matchesBranch;
      });

      setTransactions(filteredCurrent);
      setPrevTransactions(filteredPrev);
    } catch (err) {
      console.error("Error fetching revenue data:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedBranch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRangeUpdate = (type) => {
    setRangeType(type);
    const { start, end } = getRangeDates(type);
    setStartDate(formatDateForInput(start));
    setEndDate(formatDateForInput(end));
  };

  // ─── Calculations ──────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const total = transactions.reduce((sum, t) => sum + Number(t.amount_paid || 0), 0);
    const prevTotal = prevTransactions.reduce((sum, t) => sum + Number(t.amount_paid || 0), 0);
    const diff = total - prevTotal;
    const trend = prevTotal === 0 ? 100 : (diff / prevTotal) * 100;

    // Peak Earning
    const dayMap = {};
    transactions.forEach((t) => {
      dayMap[t.paid_on] = (dayMap[t.paid_on] || 0) + Number(t.amount_paid);
    });
    const peakDay = Object.entries(dayMap).reduce((peak, [date, amt]) => (amt > peak.amt ? { date, amt } : peak), { date: "—", amt: 0 });

    // Daily Avg
    const uniqueDays = new Set(transactions.map((t) => t.paid_on)).size || 1;
    const dailyAvg = total / uniqueDays;

    return {
      total,
      trend: trend.toFixed(1),
      dailyAvg: Math.round(dailyAvg),
      count: transactions.length,
      peakDay: peakDay.date,
      peakAmt: peakDay.amt
    };
  }, [transactions, prevTransactions]);

  const chartData = useMemo(() => {
    const start = parseDateFromInput(startDate);
    const end = parseDateFromInput(endDate);
    if (!start || !end) return [];

    const dataArr = [];
    let curr = new Date(start);

    while (curr <= end) {
      const dateStr = formatDateStr(curr);
      const currentAmt = transactions.filter((t) => t.paid_on === dateStr).reduce((s, t) => s + Number(t.amount_paid), 0);

      // For comparison line, we subtract the exact period duration to find corresponding prev date
      const daysDiff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const prevDateObj = new Date(curr);
      prevDateObj.setDate(prevDateObj.getDate() - daysDiff);
      const prevDateStr = formatDateStr(prevDateObj);
      const prevAmt = prevTransactions.filter((t) => t.paid_on === prevDateStr).reduce((s, t) => s + Number(t.amount_paid), 0);

      dataArr.push({
        name: curr.toLocaleDateString('default', { month: 'short', day: '2-digit' }),
        current: currentAmt,
        previous: prevAmt
      });
      curr.setDate(curr.getDate() + 1);
    }
    return dataArr;
  }, [transactions, prevTransactions, startDate, endDate]);

  const branchData = useMemo(() => {
    const map = {};
    branches.forEach(b => map[b] = 0);
    transactions.forEach(t => {
      const b = branches.find(bn => t.roll_no?.startsWith(bn.charAt(0).toLowerCase() + "_"));
      if (b) map[b] += Number(t.amount_paid);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions, branches]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (transactions.length === 0) return alert("No data to export");

    const headers = ["Receipt", "Roll Number", "Student Name", "Amount", "Date"];
    const rows = transactions.map(t => [
      t.receipt_no,
      t.roll_no,
      t.student_name,
      t.amount_paid,
      t.paid_on
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `revenue_report_${rangeType.replace(/\s+/g, '_').toLowerCase()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatPeakDay = (dateStr) => {
    if (dateStr === "—") return "—";
    const date = parseDateStr(dateStr);
    return date.toLocaleDateString('default', { month: 'short', day: '2-digit' });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-10 bg-gray-50/30 min-h-screen">
      {/* ── Header Section ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter">
            Revenue <span className="text-purple-600 italic">Analyzer</span>
          </h1>
          <p className="text-gray-500 font-medium max-w-md">
            Detailed financial performance tracking and forecasting.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date Range</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setRangeType("Custom");
                }}
                className="px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
              />
              <span className="text-gray-300 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setRangeType("Custom");
                }}
                className="px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex-1">
            <Select
              label="Branch"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              options={[
                { value: "Total (All Branches)", label: "Total (All Branches)" },
                ...branches.map(b => ({ value: b, label: b.charAt(0).toUpperCase() + b.slice(1) }))
              ]}
            />
          </div>
        </div>
      </div>

      {/* ── Period Filters ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-2xl shadow-sm border border-gray-100">
          {["Today", "Last 7 Days", "Last 30 Days", "This Month", "This Year"].map((t) => (
            <button
              key={t}
              onClick={() => handleRangeUpdate(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${rangeType === t ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : "text-gray-500 hover:bg-gray-50"
                }`}
            >
              {t}
            </button>
          ))}
          {rangeType === "Custom" && (
            <button className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-100 text-purple-700 shadow-sm">
              Custom Period
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" className="rounded-2xl shadow-sm" onClick={() => window.print()}>
            Print Report
          </Button>
          <Button variant="success" size="md" className="rounded-2xl shadow-sm" onClick={handleExportCSV} icon={() => (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          )}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Revenue"
          value={`${CURRENCY}${metrics.total.toLocaleString()}`}
          subtitle={`${metrics.trend >= 0 ? "+" : ""}${metrics.trend}% vs Prev Period`}
          variant={metrics.trend >= 0 ? "success" : "danger"}
        />
        <StatsCard
          title="Daily Average"
          value={`${CURRENCY}${metrics.dailyAvg.toLocaleString()}`}
          subtitle="Consolidated daily flow"
          variant="blue"
        />
        <StatsCard
          title="Transactions"
          value={metrics.count.toLocaleString()}
          subtitle="Total successful receipts"
          variant="purple"
        />
        <StatsCard
          title="Peak Earning Day"
          value={formatPeakDay(metrics.peakDay)}
          subtitle={`${CURRENCY}${metrics.peakAmt.toLocaleString()}`}
          variant="yellow"
        />
      </div>

      {/* ── Charts Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-2xl border-none">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Revenue Trends</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-600" />
                <span className="text-[10px] font-bold text-gray-500 uppercase">Selected Period</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-200" />
                <span className="text-[10px] font-bold text-gray-500 uppercase">vs Prev Period</span>
              </div>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '1rem' }}
                  itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="#e2e8f0"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke="#8b5cf6"
                  strokeWidth={5}
                  dot={false}
                  activeDot={{ r: 8, strokeWidth: 0, fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="shadow-2xl border-none">
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-8">Branch Performance</h2>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData} layout="vertical" margin={{ left: -20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 800 }} width={80} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24}>
                  {branchData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? "#8b5cf6" : "#c4b5fd"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Transaction Table Section ── */}
      <Card noPadding className="shadow-2xl border-none overflow-hidden">
        <div className="p-8 pb-4">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Transaction Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR className="hover:bg-transparent bg-gray-50/50 border-y border-gray-100 uppercase tracking-widest">
                <TH className="text-[10px] py-4">Receipt</TH>
                <TH className="text-[10px] py-4">Roll Number</TH>
                <TH className="text-[10px] py-4">Student Name</TH>
                <TH className="text-[10px] py-4 text-right">Amount</TH>
                <TH className="text-[10px] py-4 text-right pr-8">Date</TH>
              </TR>
            </THead>
            <TBody>
              {loading ? (
                <TR><TD colSpan={5} className="py-20 text-center animate-pulse text-gray-400 font-bold">Refining Analytical Data...</TD></TR>
              ) : transactions.length === 0 ? (
                <TR><TD colSpan={5} className="py-20 text-center text-gray-400 italic">No transactions in selected period.</TD></TR>
              ) : (
                transactions.slice(0, 15).map((t) => (
                  <TR key={t.id} className="group border-b border-gray-50/50 hover:bg-gray-50/30 transition-colors">
                    <TD className="text-gray-400 text-xs font-medium py-4">{t.receipt_no}</TD>
                    <TD className="font-bold text-gray-700 text-xs py-4">{t.roll_no}</TD>
                    <TD className="font-black text-gray-900 text-xs py-4">{t.student_name?.toUpperCase()}</TD>
                    <TD className="text-right py-4">
                      <span className="text-emerald-600 font-black text-xs">{CURRENCY}{Number(t.amount_paid).toLocaleString()}</span>
                    </TD>
                    <TD className="text-right text-gray-400 text-[11px] font-bold py-4 pr-8 whitespace-nowrap">{t.paid_on}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
