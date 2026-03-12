import { useEffect, useState, useCallback } from "react";
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
import { Card, CardHeader, StatsCard } from "../components/ui/Card";
import { Table, THead, TBody, TH, TD, TR } from "../components/ui/Table";
import Badge from "../components/ui/Badge";

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
  const fetchRPC = useCallback(async (fn, params = {}) => {
    const { data, error } = await supabase.rpc(fn, params);
    if (error) {
      console.error(`RPC Error (${fn}):`, error);
      return null;
    }
    return data;
  }, []);

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
  }, [year, month, fetchRPC]);

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


  const chartData = [
    { name: "Last Month", revenue: stats.lastMonthRevenue },
    { name: "This Month", revenue: stats.monthlyRevenue }
  ];

  // --------------------------------------------------------
  // UI
  // --------------------------------------------------------
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-6xl font-black text-gray-900 tracking-tight">Financial Intelligence</h1>
          <p className="text-gray-500 mt-2 font-medium">Strategic revenue insights and performance analytics</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Monthly Revenue"
          value={`₹${stats.monthlyRevenue.toLocaleString()}`}
          subtitle={revenueGrowth > 0 ? `+${revenueGrowth.toFixed(1)}% from last month` : `${revenueGrowth.toFixed(1)}% variance`}
          variant={revenueGrowth >= 0 ? "success" : "danger"}
          icon={() => (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        />

        <StatsCard
          title="Active Students"
          value={stats.activeStudents.toString()}
          subtitle={studentGrowth > 0 ? `+${studentGrowth.toFixed(1)}% growth` : `${studentGrowth.toFixed(1)}% change`}
          variant="primary"
          icon={() => (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        />

        <StatsCard
          title="Branch Network"
          value={stats.activeBranches.toString()}
          subtitle="Operating Units"
          variant="secondary"
          icon={() => (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          )}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart */}
        <Card className="flex flex-col h-full bg-white shadow-sm hover:shadow-md transition-all">
          <CardHeader title="Revenue Trends" subtitle="Performance over time" />
          <div className="mt-8 flex-1 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ fontWeight: 'bold', color: '#8b5cf6' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={4}
                  dot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Branch Table */}
        <Card noPadding className="shadow-sm border-gray-100 flex flex-col h-full">
          <CardHeader title="Branch Performance" subtitle="Territorial breakdown" className="p-6" />
          <div className="flex-1 overflow-x-auto">
            <Table>
              <THead>
                <TR className="hover:bg-transparent border-b">
                  <TH>Location</TH>
                  <TH>Actual</TH>
                  <TH>Target</TH>
                </TR>
              </THead>
              <TBody>
                {Object.keys(branchRevenue).length === 0 ? (
                  <TR>
                    <TD colSpan="3" className="py-20 text-center text-gray-400 italic">
                      No synchronized data available.
                    </TD>
                  </TR>
                ) : (
                  Object.entries(branchRevenue).map(([branch, revenue]) => (
                    <TR key={branch}>
                      <TD className="font-bold text-gray-900 capitalize">{branch}</TD>
                      <TD>
                        <Badge variant="purple" className="font-black">₹{revenue.toLocaleString()}</Badge>
                      </TD>
                      <TD>
                        <Badge variant="outline" className="font-bold text-blue-600 border-blue-100 bg-blue-50/30">
                          ₹{(expectedRevenue[branch] || 0).toLocaleString()}
                        </Badge>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
