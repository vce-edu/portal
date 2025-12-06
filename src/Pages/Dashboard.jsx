import { useAuth } from "../context/AuthContext";
import { supabase } from "../createClient";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const name = user?.user_metadata?.display_name || "User";

  const [activeBranches, setActiveBranches] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [branchWiseRevenue, setBranchWiseRevenue] = useState([]);
  const [pendingFeesByBranch, setPendingFeesByBranch] = useState([]);

  const navigate = useNavigate();

  const quickActions = [
    { label: "Add Student", path: "/portal/students" },
    { label: "Add Branch", path: "/portal/branches" },
    { label: "View Reports", path: "/portal/reports" },
    { label: "Manage Staff", path: "/portal/staff" },
    { label: "Upload Study Material", path: "/portal/study-material" },
  ];

  // ------------------------------
  // Fetch Pending Fees
  // ------------------------------
  const fetchPendingFeesByBranch = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_total_pending_fees_by_branch");

    if (error) {
      console.error("Error fetching pending fees by branch:", error);
      return;
    }

    setPendingFeesByBranch(data || []);
  }, []);

  // ------------------------------
  // Fetch Total Students
  // ------------------------------
  const fetchStudentCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Error fetching student count:", error);
      return;
    }

    setTotalStudents(count);
  }, []);

  // ------------------------------
  // Fetch Monthly Revenue
  // ------------------------------
  const fetchMonthlyRevenue = useCallback(async () => {
    const now = new Date();
    const { data, error } = await supabase.rpc("get_monthly_revenue", {
      p_year: now.getFullYear(),
      p_month: now.getMonth() + 1,
    });

    if (error) {
      console.error("Error fetching monthly revenue:", error);
      return;
    }

    setMonthlyRevenue(data);
  }, []);

  // ------------------------------
  // Fetch Active Branches
  // ------------------------------
  const fetchActiveBranches = useCallback(async () => {
    const { data, error } = await supabase
      .from("users")
      .select("branch")
      .neq("branch", "all");

    if (error) {
      console.error("Error fetching active branches:", error);
      return;
    }

    setActiveBranches(data.length);
  }, []);

  // ------------------------------
  // Run All Fetchers Once on Load
  // ------------------------------
  useEffect(() => {
    fetchPendingFeesByBranch();
    fetchStudentCount();
    fetchMonthlyRevenue();
    fetchActiveBranches();
  }, [
    fetchPendingFeesByBranch,
    fetchStudentCount,
    fetchMonthlyRevenue,
    fetchActiveBranches,
  ]);

  return (
    <div className="p-10 space-y-12">
      {/* -------- Header -------- */}
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
          Dashboard
        </h1>
        <p className="text-lg mt-2 text-gray-600" style={{ fontFamily: "Poppins, sans-serif" }}>
          Welcome back,
          <span className="text-purple-600 font-semibold ml-1">{name}</span>.
        </p>
      </div>

      {/* -------- Quick Actions -------- */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="px-5 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 active:scale-95 transition"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* -------- Stats Cards -------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

        {/* Static Cards */}
        <Card title="Total Students" value={totalStudents} />
        <Card title="Monthly Revenue" value={`₹ ${monthlyRevenue}`} />
        <Card title="Active Branches" value={activeBranches} />

        {/* Dynamic Branch Pending Cards */}
        {pendingFeesByBranch.map((b) => (
          <Card
            key={b.branch_name}
            title={`Fees Pending (${b.branch_name})`}
            value={`₹ ${b.total_pending}`}
          />
        ))}

        {/* Other static */}
        <Card title="Total Courses" value="23" />
        <Card title="Online Enquiries" value="54" />

      </div>

    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="p-6 rounded-2xl shadow-lg border border-gray-200 bg-white hover:shadow-xl transition">
      <h3 className="text-xl font-bold mb-2 text-purple-700">{title}</h3>
      <p className="text-4xl font-extrabold">{value}</p>
    </div>
  );
}
