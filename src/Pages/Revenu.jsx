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
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [activeStudents, setActiveStudents] = useState(0);
  const [activeBranches, setActiveBranches] = useState(0);
  const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
  const [lastMonthStudents, setLastMonthStudents] = useState(0);
  const [branchRevenue, setBranchRevenue] = useState({});
  const [expectedRevenue, setExpectedRevenue] = useState({});
  useEffect(() => {
    const fetchBranchRevenue = async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const { data, error } = await supabase.rpc(
        "get_branch_wise_revenue",
        { p_year: year, p_month: month }
      );

      if (!error && data) setBranchRevenue(data);
    };

    fetchBranchRevenue();
  }, []);

  useEffect(() => {
    const fetchExpectedRevenue = async () => {
      const { data, error } = await supabase.rpc(
        "get_expected_revenue_current_month"
      );

      if (error) {
        console.error("Error fetching expected revenue:", error);
      } else {
        setExpectedRevenue(data);
      }
    };

    fetchExpectedRevenue();
  }, []);
  useEffect(() => {
    const fetchMonthlyRevenue = async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const { data, error } = await supabase.rpc("monthly_revenue_last_month", {
        p_year: year,
        p_month: month,
      });

      if (error) {
        console.error("Error fetching monthly revenue:", error);
        return;
      }

      setLastMonthRevenue(data);
    };

    fetchMonthlyRevenue();
  }, []);
  useEffect(() => {
    const fetchLastMonthStudents = async () => {
      const { data, error } = await supabase.rpc("count_active_students_last_month");

      if (!error) setLastMonthStudents(data);
    };

    fetchLastMonthStudents();
  }, []);

  useEffect(() => {
    const fetchActiveBranches = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("branch")
        .neq("branch", "all");

      if (error) {
        console.error("Error fetching active branches:", error);
        return;
      }

      // Count unique branches
      const count = data.length;
      setActiveBranches(count);
    };

    fetchActiveBranches();
  }, []);

  useEffect(() => {
    const fetchActiveStudents = async () => {
      const { data, error } = await supabase.rpc("count_active_students");

      if (error) {
        console.error("Error fetching active students:", error);
        return;
      }

      setActiveStudents(data);
    };

    fetchActiveStudents();
  }, []);

  useEffect(() => {
    const fetchMonthlyRevenue = async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const { data, error } = await supabase.rpc("get_monthly_revenue", {
        p_year: year,
        p_month: month,
      });

      if (error) {
        console.error("Error fetching monthly revenue:", error);
        return;
      }

      setMonthlyRevenue(data);
    };

    fetchMonthlyRevenue();
  }, []);

  const revenueGrowth =
    lastMonthRevenue === 0
      ? 100 // avoid divide by zero
      : ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
  const studentGrowth =
    lastMonthStudents === 0
      ? 100
      : ((activeStudents - lastMonthStudents) / lastMonthStudents) * 100;
  const renderGrowth = (value) => {
    if (value > 0) {
      return (
        <p className="text-green-600 font-semibold mt-2">
          ▲ {value.toFixed(2)}%
        </p>
      );
    }

    if (value < 0) {
      return (
        <p className="text-red-600 font-semibold mt-2">
          ▼ {value.toFixed(2)}%
        </p>
      );
    }

    return (
      <p className="text-gray-500 font-semibold mt-2">
        • Stable
      </p>
    );
  };

      const chartData = [
      { name: "Last Month", revenue: lastMonthRevenue || 0 },
      { name: "This Month", revenue: monthlyRevenue || 0 }
    ];

  return (
    <div className="space-y-8">

      {/* Page Title */}
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-2">
          Revenue Analysis
        </h1>
        <p className="text-gray-600 text-lg">
          Track income, growth, and financial performance across branches.
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-gray-500 text-sm">Total Revenue</p>
          <h2 className="text-3xl font-bold mt-1">{monthlyRevenue}</h2>
          {renderGrowth(revenueGrowth)}
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-gray-500 text-sm">Active Students</p>
          <h2 className="text-3xl font-bold mt-1">{activeStudents}</h2>
          {renderGrowth(studentGrowth)}


        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <p className="text-gray-500 text-sm">Branch Count</p>
          <h2 className="text-3xl font-bold mt-1">{activeBranches}</h2>
          <p className="text-purple-600 font-semibold mt-2">Stable</p>
        </div>
      </div>

      {/* Chart Placeholder */}
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

      {/* Table Placeholder */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border">
        <h3 className="text-2xl font-bold mb-4">Branch-Wise Revenue</h3>

        <div className="overflow-hidden rounded-xl border">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4 text-left text-gray-600 font-semibold">Branch</th>
                <th className="p-4 text-left text-gray-600 font-semibold">Revenue</th>
                <th className="p-4 text-left text-gray-600 font-semibold">Expected evenue</th>
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
                Object.entries(branchRevenue).map(([branch, revenue], index) => (
                  <tr
                    key={branch}
                    className={`border-b transition ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-purple-50`}
                  >
                    <td className="p-4 font-medium capitalize">{branch}</td>

                    {/* Actual Revenue */}
                    <td className="p-4 font-semibold text-purple-700">
                      ₹ {revenue}
                    </td>

                    {/* Expected Revenue */}
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
