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
    { label: "Manage Branches", path: "/portal/branches" },
    { label: "Revenue Analytics", path: "/portal/revenue" },
    { label: "Students Performance", path: "/portal/performance" },
    { label: "Update Events", path: "/portal/events" },
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
      <div className="px-4 sm:px-0">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-gray-900 border-l-8 border-purple-600 pl-6 md:pl-0 md:border-none">
          Dashboard
        </h1>
        <p className="text-sm md:text-xl mt-2 md:mt-4 text-purple-950 font-semibold" style={{ fontFamily: "Poppins, sans-serif" }}>
          Welcome back,
          <span className="text-purple-600 font-black ml-2 underline decoration-purple-100 underline-offset-8">{name}</span>.
        </p>
      </div>

      {/* -------- Quick Actions -------- */}
      <div className="px-4 sm:px-0">
        <h2 className="text-lg md:text-2xl font-black mb-4 md:mb-6 text-gray-800 tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 md:gap-5">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              onClick={() => navigate(action.path)}
              variant="primary"
              size="lg"
              className="rounded-2xl py-4 flex-1 sm:flex-initial text-base font-black tracking-tight shadow-lg shadow-purple-100"
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
