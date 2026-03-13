import { useState, useEffect, useCallback } from "react";
import { secSupabase, supabase } from "../createClient";
import { Card } from "../components/ui/Card";
import { Table, THead, TBody, TH, TD, TR } from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Select } from "../components/ui/Input";

const ITEMS_PER_PAGE = 15;

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const formatDate = (d) => d.toISOString().split("T")[0];

export default function PendingApplications() {
    const [activeTab, setActiveTab] = useState("scholarship");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [selectedBranch, setSelectedBranch] = useState("all");
    const [branches, setBranches] = useState([]);
    const [staffMap, setStaffMap] = useState({});
    const [staffStats, setStaffStats] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [startDate, setStartDate] = useState(formatDate(firstOfMonth));
    const [endDate, setEndDate] = useState(formatDate(today));
    const [selectedStaff, setSelectedStaff] = useState(null);

    // Fetch unique branches
    useEffect(() => {
        const fetchBranches = async () => {
            const { data } = await supabase.from("users").select("branch").neq("branch", "all");
            const uniqueBranches = [...new Set(data?.map((d) => d.branch))];
            setBranches(uniqueBranches);
        };
        fetchBranches();
    }, []);

    // Fetch staff application stats via RPC
    const fetchStaffStats = useCallback(async () => {
        if (activeTab !== "scholarship") return;

        const { data: stats, error } = await secSupabase.rpc("get_staff_application_stats", {
            start_date: startDate,
            end_date: endDate,
        });

        if (error) {
            console.error("Error fetching staff stats:", error);
            return;
        }

        setStaffStats(stats || []);
    }, [activeTab, startDate, endDate]);

    const fetchPendingData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: response, error } = await secSupabase.rpc("get_pending_applications", {
                p_type: activeTab,
                p_branch: selectedBranch === "all" ? null : selectedBranch,
                p_limit: ITEMS_PER_PAGE,
                p_offset: page * ITEMS_PER_PAGE,
                p_start_date: startDate,
                p_end_date: endDate
            });

            if (error) throw error;

            setData(response.data || []);
            setTotalCount(response.total_count || 0);

            if (activeTab === "scholarship" && response.data?.length > 0) {
                const staffIds = [...new Set(response.data.map(item => item.staff_id).filter(id => id != null))];

                if (staffIds.length > 0) {
                    const { data: staffData, error: staffError } = await supabase
                        .from("users")
                        .select("user_id, display_name, email")
                        .in("user_id", staffIds);

                    if (!staffError && staffData) {
                        const newStaffMap = { ...staffMap };
                        staffData.forEach(s => {
                            newStaffMap[s.user_id] = s.display_name || s.email;
                        });
                        setStaffMap(newStaffMap);
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching pending data:", err);
        } finally {
            setLoading(false);
        }
    }, [activeTab, page, selectedBranch, startDate, endDate]);

    useEffect(() => {
        fetchPendingData();
    }, [fetchPendingData]);

    useEffect(() => {
        fetchStaffStats();
    }, [fetchStaffStats]);

    // Reset page and selected staff when tab or branch changes
    useEffect(() => {
        setPage(0);
        setSelectedStaff(null);
    }, [activeTab, selectedBranch]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    // Client-side filter: staff selection + search query
    const filteredData = data.filter((item) => {
        if (selectedStaff !== null && item.staff_id !== selectedStaff) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        if (activeTab === "scholarship") {
            return (
                item.full_name?.toLowerCase().includes(q) ||
                item.father_name?.toLowerCase().includes(q) ||
                item.phone_number?.toLowerCase().includes(q) ||
                item.branch?.toLowerCase().includes(q) ||
                staffMap[item.staff_id]?.toLowerCase().includes(q)
            );
        }
        if (activeTab === "student") {
            return (
                item.student_name?.toLowerCase().includes(q) ||
                item.email?.toLowerCase().includes(q) ||
                item.phone?.toLowerCase().includes(q) ||
                item.branch?.toLowerCase().includes(q) ||
                item.course_name?.toLowerCase().includes(q)
            );
        }
        if (activeTab === "transaction") {
            return item.roll_number?.toLowerCase().includes(q);
        }
        return true;
    });

    const tabs = [
        { id: "scholarship", label: "Scholarships", icon: "🎓" },
        { id: "student", label: "Admissions", icon: "📝" },
        { id: "transaction", label: "Transactions", icon: "💰" }
    ];

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50/30 min-h-screen">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter">
                    Pending <span className="text-purple-600 italic">Applications</span>
                </h1>
                <p className="text-gray-500 font-medium max-w-md">
                    Manage and verify incoming requests across all categories.
                </p>
            </div>

            {/* Controls: Tabs & Filters */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                {/* Row 1: Tabs + Total Badge */}
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                    <div className="flex p-1.5 bg-gray-50 rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? "bg-white text-purple-600 shadow-sm"
                                    : "text-gray-400 hover:text-gray-600"
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <Badge variant="purple" className="py-2.5 px-4 rounded-xl">
                        {totalCount} Total
                    </Badge>
                </div>

                {/* Row 2: Search + Branch + Date Range */}
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search across all records..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 w-full px-4 py-2.5 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-purple-200 placeholder:text-gray-300"
                    />

                    {/* Branch Filter */}
                    {activeTab !== "transaction" && (
                        <div className="min-w-[160px] w-full sm:w-auto">
                            <Select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                options={[
                                    { value: "all", label: "All Branches" },
                                    ...branches.map((b) => ({ value: b, label: b.charAt(0).toUpperCase() + b.slice(1) }))
                                ]}
                            />
                        </div>
                    )}

                    {/* Date Range */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2.5 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-purple-200"
                        />
                        <span className="text-xs font-black text-gray-300">→</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2.5 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-purple-200"
                        />
                    </div>
                </div>
            </div>

            {/* Staff Stats Strip — clickable, only on scholarship tab, above table */}
            {activeTab === "scholarship" && staffStats.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                    {staffStats.map((s) => {
                        const isActive = selectedStaff === s.staff_id;
                        return (
                            <div
                                key={s.staff_id}
                                onClick={() => setSelectedStaff(isActive ? null : s.staff_id)}
                                className={`cursor-pointer flex-shrink-0 border rounded-2xl px-5 py-3 shadow-sm flex flex-col gap-1 min-w-[160px] transition-all ${isActive
                                    ? "bg-purple-600 border-purple-600"
                                    : "bg-white border-gray-100 hover:border-purple-200 hover:shadow-md"
                                    }`}
                            >
                                <p className={`text-[11px] font-black uppercase tracking-widest truncate ${isActive ? "text-purple-200" : "text-gray-400"}`}>
                                    {s.staff_name}
                                </p>
                                <p className={`text-[10px] font-bold ${isActive ? "text-purple-300" : "text-gray-300"}`}>
                                    ID #{s.staff_id}
                                </p>
                                <div className="flex items-end gap-2">
                                    <span className={`text-2xl font-black ${isActive ? "text-white" : "text-gray-900"}`}>
                                        {s.total_applications}
                                    </span>
                                    <span className={`text-xs font-bold mb-0.5 ${isActive ? "text-purple-200" : "text-emerald-500"}`}>
                                        ✓ {s.total_confirmed}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Main Table Card */}
            <Card noPadding className="shadow-2xl border-none overflow-hidden bg-white">
                <div className="overflow-x-auto">
                    <Table>
                        <THead>
                            <TR className="bg-gray-50/50 border-b border-gray-100">
                                {activeTab === "scholarship" && (
                                    <>
                                        <TH className="py-5">Full Name</TH>
                                        <TH className="py-5">Father's Name</TH>
                                        <TH className="py-5">Branch</TH>
                                        <TH className="py-5">Phone</TH>
                                        <TH className="py-5">Staff Member</TH>
                                        <TH className="py-5 text-right pr-8">Date</TH>
                                        <TH className="py-5 text-right pr-8">Action</TH>
                                    </>
                                )}
                                {activeTab === "student" && (
                                    <>
                                        <TH className="py-5">Student Name</TH>
                                        <TH className="py-5">Email/Phone</TH>
                                        <TH className="py-5">Course</TH>
                                        <TH className="py-5">Branch</TH>
                                        <TH className="py-5 text-right pr-8">Applied On</TH>
                                    </>
                                )}
                                {activeTab === "transaction" && (
                                    <>
                                        <TH className="py-5">Roll Number</TH>
                                        <TH className="py-5">Amount</TH>
                                        <TH className="py-5">Paid On</TH>
                                        <TH className="py-5 text-right pr-8">Created At</TH>
                                    </>
                                )}
                            </TR>
                        </THead>
                        <TBody>
                            {loading ? (
                                <TR>
                                    <TD colSpan={6} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                            <p className="text-sm font-bold text-gray-400">Loading scalable dataset...</p>
                                        </div>
                                    </TD>
                                </TR>
                            ) : filteredData.length === 0 ? (
                                <TR>
                                    <TD colSpan={6} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-4xl">📭</span>
                                            <p className="text-sm font-bold text-gray-400">
                                                {searchQuery
                                                    ? `No results for "${searchQuery}"`
                                                    : selectedStaff
                                                        ? "No applications for this staff member."
                                                        : `No pending ${activeTab}s found.`}
                                            </p>
                                        </div>
                                    </TD>
                                </TR>
                            ) : (
                                filteredData.map((item, idx) => (
                                    <TR key={item.id || item.application_id || idx} className="hover:bg-gray-50/50 transition-colors group">
                                        {activeTab === "scholarship" && (
                                            <>
                                                <TD className="py-4 font-black text-gray-900">{item.full_name}</TD>
                                                <TD className="py-4 text-gray-600 text-xs font-medium">{item.father_name}</TD>
                                                <TD className="py-4">
                                                    <Badge variant="blue" className="capitalize">{item.branch}</Badge>
                                                </TD>
                                                <TD className="py-4 text-gray-500 text-xs">{item.phone_number}</TD>
                                                <TD className="py-4">
                                                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                                                        {staffMap[item.staff_id] || "—"}
                                                    </span>
                                                </TD>
                                                <TD className="py-4 text-[10px] font-bold text-gray-400">
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </TD>
                                                <TD className="py-4 text-right pr-8">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button className="px-3 py-1.5 text-[11px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                                                            Confirm
                                                        </button>
                                                        <button className="px-3 py-1.5 text-[11px] font-black text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                                            Delete
                                                        </button>
                                                    </div>
                                                </TD>
                                            </>
                                        )}
                                        {activeTab === "student" && (
                                            <>
                                                <TD className="py-4 font-black text-gray-900">{item.student_name}</TD>
                                                <TD className="py-4">
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-bold text-gray-700">{item.phone || "—"}</p>
                                                        <p className="text-[10px] text-gray-400">{item.email || "—"}</p>
                                                    </div>
                                                </TD>
                                                <TD className="py-4">
                                                    <Badge variant="purple" className="text-[10px] uppercase font-black">{item.course_name || "General"}</Badge>
                                                </TD>
                                                <TD className="py-4">
                                                    <Badge variant="blue" className="capitalize">{item.branch}</Badge>
                                                </TD>
                                                <TD className="py-4 text-right pr-8 text-[10px] font-bold text-gray-400">
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </TD>
                                            </>
                                        )}
                                        {activeTab === "transaction" && (
                                            <>
                                                <TD className="py-4 font-black text-gray-900 uppercase tracking-wider">{item.roll_number}</TD>
                                                <TD className="py-4 font-black text-emerald-600">₹{Number(item.amount_paid).toLocaleString()}</TD>
                                                <TD className="py-4 text-gray-500 text-xs font-bold">{item.paid_on}</TD>
                                                <TD className="py-4 text-right pr-8 text-[10px] font-bold text-gray-400">
                                                    {new Date(item.created_at).toLocaleString()}
                                                </TD>
                                            </>
                                        )}
                                    </TR>
                                ))
                            )}
                        </TBody>
                    </Table>
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Page {page + 1} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 0 || loading}
                                onClick={() => setPage(p => p - 1)}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                disabled={page >= totalPages - 1 || loading}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next Page
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Scalability Hint */}
            <div className="flex items-center justify-center gap-2 py-4">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    High-Performance RPC Tunnel Active · Scalable to {totalCount > 1000000 ? "Billions" : "Millions"}
                </p>
            </div>
        </div>
    );
}
