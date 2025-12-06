import { useAuth } from "../context/AuthContext";
import { supabase } from "../createClient";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user,branch } = useAuth();
  const name = user?.user_metadata?.display_name || "User";
  const userBranch = branch || "all"; 

  const [activeBranches, setActiveBranches] = useState(0);
  const [totalStudents, setTotalStudents] = useState([]);
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
  // Fetch Pending Fees (RPC)
  // ------------------------------
  const fetchPendingFeesByBranch = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_total_pending_fees_by_branch");

    if (error) {
      console.error("Error fetching pending fees by branch:", error);
      return;
    }

    let filtered = data || [];

    if (userBranch !== "all") {
      filtered = filtered.filter((r) => r.branch_name === userBranch);
    }

    setPendingFeesByBranch(filtered);
  }, [userBranch]);

  // ------------------------------
  // Fetch Student Count (branch wise)
  // ------------------------------
  const fetchStudentCount = useCallback(async () => {
    let query = supabase.from("students").select("branch");

    // ⭐ Restrict to logged-in user's branch
    if (userBranch !== "all") {
      query = query.eq("branch", userBranch);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching student count:", error);
      return;
    }

    const branchCounts = data.reduce((acc, student) => {
      acc[student.branch] = (acc[student.branch] || 0) + 1;
      return acc;
    }, {});

    const formatted = Object.entries(branchCounts).map(
      ([branch, total]) => ({ branch, total })
    );

    setTotalStudents(formatted);
  }, [userBranch]);

  // ------------------------------
  // Fetch Monthly Revenue (RPC)
  // ------------------------------
  const fetchBranchWiseRevenue = useCallback(async () => {
    const now = new Date();

    const { data, error } = await supabase.rpc("branch_wise_monthly_revenue", {
      p_year: now.getFullYear(),
      p_month: now.getMonth() + 1,
    });

    if (error) {
      console.error("Error fetching branch wise revenue:", error);
      return;
    }

    let formatted = data
      ? Object.entries(data).map(([branch_name, total_revenue]) => ({
          branch_name,
          total_revenue,
        }))
      : [];

    // ⭐ Restrict by user branch
    if (userBranch !== "all") {
      formatted = formatted.filter((r) => r.branch_name === userBranch);
    }

    setBranchWiseRevenue(formatted);
  }, [userBranch]);

  // ------------------------------
  // Fetch Active Branch Count
  // ------------------------------
  const fetchActiveBranches = useCallback(async () => {
    if (userBranch !== "all") {
      // ⭐ If user has branch "Indore", they should only see ONE active branch
      setActiveBranches(1);
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("branch")
      .neq("branch", "all");

    if (error) {
      console.error("Error fetching active branches:", error);
      return;
    }

    setActiveBranches(data.length);
  }, [userBranch]);

  // ------------------------------
  // Run All Fetchers
  // ------------------------------
  useEffect(() => {
    fetchPendingFeesByBranch();
    fetchStudentCount();
    fetchBranchWiseRevenue();
    fetchActiveBranches();
  }, [
    fetchPendingFeesByBranch,
    fetchStudentCount,
    fetchBranchWiseRevenue,
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

        {/* Students */}
        {totalStudents.map((b) => (
          <Card key={b.branch} title={`Students (${b.branch})`} value={b.total} />
        ))}

        {/* Revenue */}
        {branchWiseRevenue.map((b) => (
          <Card
            key={b.branch_name}
            title={`Revenue (${b.branch_name})`}
            value={`₹ ${b.total_revenue}`}
          />
        ))}

        {/* Active Branches */}
        <Card title="Active Branches" value={activeBranches} />

        {/* Pending Fees */}
        {pendingFeesByBranch.map((b) => (
          <Card
            key={b.branch_name}
            title={`Fees Pending (${b.branch_name})`}
            value={`₹ ${b.total_pending}`}
          />
        ))}

        {/* Static Cards */}
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
