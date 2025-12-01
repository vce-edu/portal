import { useEffect, useState } from "react";
import { supabase } from "../createClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

export default function Revenue() {
  // STATE
  const [stats, setStats] = useState({
    monthlyRevenue: 0,
    lastMonthRevenue: 0,
    activeStudents: 0,
    lastMonthStudents: 0,
    activeBranches: 0
  });

  const [branchRevenue, setBranchRevenue] = useState({});
  const [expectedRevenue, setExpectedRevenue] = useState({});

  // GET YEAR + MONTH
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // --------------------------------------------------------
  // UNIVERSAL FETCHER
  // --------------------------------------------------------
  const fetchRPC = async (fn, params = {}) => {
    const { data, error } = await supabase.rpc(fn, params);
    if (error) {
      console.error(`RPC Error (${fn}):`, error);
      return null;
    }
    return data;
  };

  // --------------------------------------------------------
  // LOAD EVERYTHING IN ONE EFFECT
  // --------------------------------------------------------
  useEffect(() => {
    const loadAll = async () => {
      // parallel API calls (fast!)
      const [
        branchRev,
        expectedRev,
        lastMonthRev,
        lastMonthSt,
        activeSt,
        activeMonthRev
      ] = await Promise.all([
        fetchRPC("get_branch_wise_revenue", { p_year: year, p_month: month }),
        fetchRPC("get_expected_revenue_current_month"),
        fetchRPC("monthly_revenue_last_month", { p_year: year, p_month: month }),
        fetchRPC("count_active_students_last_month"),
        fetchRPC("count_active_students"),
        fetchRPC("get_monthly_revenue", { p_year: year, p_month: month })
      ]);

      // fetch branches only once
      const { data: branchData } = await supabase
        .from("users")
        .select("branch")
        .neq("branch", "all");

      setBranchRevenue(branchRev || {});
      setExpectedRevenue(expectedRev || {});

      setStats({
        monthlyRevenue: activeMonthRev || 0,
        lastMonthRevenue: lastMonthRev || 0,
        activeStudents: activeSt || 0,
        lastMonthStudents: lastMonthSt || 0,
        activeBranches: branchData?.length || 0
      });
    };

    loadAll();
  }, []);

  // --------------------------------------------------------
  // GROWTH CALCULATIONS
  // --------------------------------------------------------
  const revenueGrowth =
    stats.lastMonthRevenue === 0
      ? 100
      : ((stats.monthlyRevenue - stats.lastMonthRevenue) /
          stats.lastMonthRevenue) *
        100;

  const studentGrowth =
    stats.lastMonthStudents === 0
      ? 100
      : ((stats.activeStudents - stats.lastMonthStudents) /
          stats.lastMonthStudents) *
        100;

  const renderGrowth = (value) => {
    if (value > 0)
      return <p className="text-green-600 font-semibold mt-2">▲ {value.toFixed(2)}%</p>;
    if (value < 0)
      return <p className="text-red-600 font-semibold mt-2">▼ {value.toFixed(2)}%</p>;
    return <p className="text-gray-500 font-semibold mt-2">• Stable</p>;
  };

  const chartData = [
    { name: "Last Month", revenue: stats.lastMonthRevenue },
    { name: "This Month", revenue: stats.monthlyRevenue }
  ];

  // --------------------------------------------------------
  // UI
  // --------------------------------------------------------
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-2">
          Revenue Analysis
        </h1>
        <p className="text-gray-600 text-lg">
          Track income, growth, and financial performance across branches.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-gray-500 text-sm">Total Revenue</p>
          <h2 className="text-3xl font-bold mt-1">{stats.monthlyRevenue}</h2>
          {renderGrowth(revenueGrowth)}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-gray-500 text-sm">Active Students</p>
          <h2 className="text-3xl font-bold mt-1">{stats.activeStudents}</h2>
          {renderGrowth(studentGrowth)}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-gray-500 text-sm">Branch Count</p>
          <h2 className="text-3xl font-bold mt-1">{stats.activeBranches}</h2>
          <p className="text-purple-600 font-semibold mt-2">Stable</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border">
        <h3 className="text-2xl font-bold mb-4">Revenue Trends</h3>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Branch Table */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border">
        <h3 className="text-2xl font-bold mb-4">Branch-Wise Revenue</h3>

        <div className="overflow-hidden rounded-xl border">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4 text-left text-gray-600 font-semibold">Branch</th>
                <th className="p-4 text-left text-gray-600 font-semibold">Revenue</th>
                <th className="p-4 text-left text-gray-600 font-semibold">Expected Revenue</th>
              </tr>
            </thead>

            <tbody>
              {Object.keys(branchRevenue).length === 0 ? (
                <tr>
                  <td
                    colSpan="3"
                    className="p-4 text-center text-gray-400 italic"
                  >
                    No revenue data found for this month.
                  </td>
                </tr>
              ) : (
                Object.entries(branchRevenue).map(([branch, revenue], i) => (
                  <tr
                    key={branch}
                    className={`border-b ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-purple-50`}
                  >
                    <td className="p-4 font-medium capitalize">{branch}</td>
                    <td className="p-4 font-semibold text-purple-700">₹ {revenue}</td>
                    <td className="p-4 font-semibold text-blue-700">
                      ₹ {expectedRevenue[branch] || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
