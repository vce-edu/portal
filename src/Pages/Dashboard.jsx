import { useAuth } from "../context/AuthContext";
import { supabase } from "../createClient";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { StatsCard } from "../components/ui/Card";
import StaffDashboard from "./StaffDashboard";

export default function Dashboard() {
  const { user, branch, role } = useAuth();

  if (role === "staff") {
    return <StaffDashboard />;
  }
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
      setActiveBranches(1);
      return;
    }

    const { data, error } = await supabase.rpc("get_active_branch_count");

    if (error) {
      console.error("Error fetching active branches:", error);
      return;
    }

    setActiveBranches(data);
  }, [userBranch]);

  // ------------------------------
  // Run All Fetchers
  // ------------------------------
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div className="p-2 sm:p-4 md:p-10 space-y-6 md:space-y-12">
      {/* -------- Header -------- */}
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl md:text-5xl font-black md:font-extrabold tracking-tight text-gray-900 border-l-4 border-purple-600 pl-4 md:pl-0 md:border-none">
          Dashboard
        </h1>
        <p className="text-sm md:text-lg mt-1 md:mt-2 text-gray-600" style={{ fontFamily: "Poppins, sans-serif" }}>
          Welcome back,
          <span className="text-purple-600 font-bold ml-1">{name}</span>.
        </p>
      </div>

      {/* -------- Quick Actions -------- */}
      <div className="px-2 sm:px-0">
        <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4 text-gray-800">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 md:gap-4">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              onClick={() => navigate(action.path)}
              variant="primary"
              size="md"
              className="rounded-2xl"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* -------- Stats Cards -------- */}
      <div className="px-2 sm:px-0 grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 pb-12">

        {/* Students */}
        {totalStudents.map((b) => (
          <StatsCard key={b.branch} title={`Students (${b.branch})`} value={b.total} />
        ))}

        {/* Revenue */}
        {branchWiseRevenue.map((b) => (
          <StatsCard
            key={b.branch_name}
            title={`Monthly Revenue (${b.branch_name})`}
            value={`₹ ${b.total_revenue}`}
            variant="green"
          />
        ))}

        {/* Active Branches */}
        <StatsCard title="Active Branches" value={activeBranches} variant="blue" />

        {/* Pending Fees */}
        {pendingFeesByBranch.map((b) => (
          <StatsCard
            key={b.branch_name}
            title={`Pending Fees (${b.branch_name})`}
            value={`₹ ${b.total_pending}`}
            variant="red"
          />
        ))}

        {/* Static Cards */}
        <StatsCard title="Available Courses" value="23" variant="purple" />
        <StatsCard title="New Enquiries" value="54" variant="yellow" />

      </div>
    </div>
  );
}
