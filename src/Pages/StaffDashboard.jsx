import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { secSupabase } from "../createClient";
import { Card } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Input, Select } from "../components/ui/Input";
import { Table, THead, TBody, TH, TD, TR } from "../components/ui/Table";

export default function StaffDashboard() {
    const { user, staffId, branch } = useAuth();
    const userName = user?.user_metadata?.display_name || "User";

    const [stats, setStats] = useState({ total_applications: 0, total_confirmed: 0 });
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    // Date Filters
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(today);

    const fetchStaffData = useCallback(async () => {
        if (!staffId) return;
        setLoading(true);

        try {
            // 1. Fetch Stats from RPC
            const { data: statsData, error: statsError } = await secSupabase.rpc("get_staff_application_stats", {
                start_date: startDate,
                end_date: endDate,
                p_staff_id: parseInt(staffId)
            });

            if (statsError) throw statsError;

            if (statsData && statsData.length > 0) {
                setStats(statsData[0]);
            } else {
                setStats({ total_applications: 0, total_confirmed: 0 });
            }

            // 2. Fetch Applications for Table
            const { data: appsData, error: appsError } = await secSupabase
                .from("scholarship_application")
                .select("*")
                .eq("staff_id", parseInt(staffId))
                .gte("created_at", `${startDate}T00:00:00Z`)
                .lte("created_at", `${endDate}T23:59:59Z`)
                .order("created_at", { ascending: false });

            if (appsError) throw appsError;
            setApplications(appsData || []);

        } catch (error) {
            console.error("Error fetching staff dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, [staffId, startDate, endDate]);

    useEffect(() => {
        fetchStaffData();
    }, [fetchStaffData]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert("Staff ID copied to clipboard!");
    };

    const earnings = (stats.total_confirmed || 0) * 50;

    return (
        <div className="p-4 md:p-10 space-y-8 bg-gray-50/30 min-h-screen">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">
                    Dashboard
                </h1>
                <p className="text-lg mt-2 text-gray-600 font-medium">
                    Welcome back, <span className="text-purple-600 font-bold uppercase">{userName}</span>.
                </p>
            </div>

            {/* Main Profile & Stats Card */}
            <Card className="bg-white border-none shadow-sm relative overflow-hidden">
                <div className="flex flex-col xl:flex-row gap-8 items-stretch xl:items-center">
                    {/* Left: Avatar & Info */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 flex-1 text-center sm:text-left">
                        <div className="relative flex-shrink-0">
                            <div className="w-20 h-20 md:w-28 md:h-28 xl:w-32 xl:h-32 bg-purple-600 rounded-full flex items-center justify-center text-white text-3xl md:text-5xl font-black shadow-lg">
                                {userName.charAt(0)}
                            </div>
                            <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></div>
                        </div>

                        <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                            <div className="flex justify-center sm:justify-start">
                                <Badge variant="purple" className="px-3 py-1 text-[10px] md:text-xs">Official Staff</Badge>
                            </div>
                            <h2 className="text-2xl md:text-4xl xl:text-5xl font-black text-gray-900 uppercase tracking-tighter truncate px-1">
                                {userName}
                            </h2>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-[10px] md:text-sm font-bold text-gray-400">
                                <span className="uppercase">{branch || "Main Branch"}</span>
                                <span className="hidden sm:inline text-gray-200">•</span>
                                <div className="flex items-center gap-1 text-purple-500 whitespace-nowrap">
                                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    VERIFIED PROFILE
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Staff ID & Income (Grid for better wrapping) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:w-auto">
                        {/* Staff ID Box */}
                        <div className="bg-white border border-gray-100 rounded-3xl p-4 md:p-6 shadow-sm flex flex-col items-center justify-center min-w-0 sm:min-w-[160px]">
                            <p className="text-[9px] md:text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase mb-1 md:mb-2">Your Staff ID</p>
                            <div className="flex items-center gap-2 md:gap-4">
                                <span className="text-3xl md:text-4xl xl:text-5xl font-black text-gray-900">{staffId}</span>
                                <button
                                    onClick={() => copyToClipboard(staffId)}
                                    className="p-1.5 md:p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors"
                                >
                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Income Box */}
                        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-4 md:p-6 shadow-sm flex flex-col items-center sm:items-start justify-center min-w-0 sm:min-w-[180px]">
                            <p className="text-[9px] md:text-[10px] font-black text-emerald-600/60 tracking-[0.2em] uppercase mb-1 italic text-center sm:text-left">Total Income (This Month)</p>
                            <div className="flex items-center gap-1 md:gap-2">
                                <span className="text-3xl md:text-4xl xl:text-5xl font-black text-emerald-700">₹{earnings}</span>
                            </div>
                            <p className="text-[8px] md:text-[10px] font-bold text-emerald-600 mt-1 md:mt-2 uppercase">(₹50 per confirmed)</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Scholarship Applications Section */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight">
                            Scholarship Applications
                        </h2>
                        <Badge variant="purple" className="px-2 py-1">{applications.length} Found</Badge>
                    </div>

                    {/* Date Range Filters */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 self-start sm:self-auto">
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">From</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="text-xs md:text-sm font-bold text-gray-700 outline-none border-none bg-transparent cursor-pointer p-0"
                            />
                        </div>
                        <div className="hidden sm:block h-4 w-px bg-gray-200"></div>
                        <div className="flex items-center gap-2 px-1 border-l border-gray-100 sm:border-none">
                            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">To</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="text-xs md:text-sm font-bold text-gray-700 outline-none border-none bg-transparent cursor-pointer p-0"
                            />
                        </div>
                    </div>
                </div>

                {/* Applications Table */}
                <Card noPadding className="shadow-sm border border-gray-100 bg-white">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
                            <p className="text-sm font-bold text-gray-400 animate-pulse">Fetching Applications...</p>
                        </div>
                    ) : (
                        <Table>
                            <THead>
                                <TR className="hover:bg-transparent">
                                    <TH>Applicant</TH>
                                    <TH>Father's Name</TH>
                                    <TH className="hidden sm:table-cell">Gender</TH>
                                    <TH>Contact</TH>
                                    <TH>Date</TH>
                                    <TH className="text-right">Status</TH>
                                </TR>
                            </THead>
                            <TBody>
                                {applications.map((app) => (
                                    <TR key={app.application_id}>
                                        <TD className="font-bold text-gray-900">{app.full_name}</TD>
                                        <TD className="text-gray-600 font-medium">{app.father_name}</TD>
                                        <TD className="hidden sm:table-cell text-gray-500">
                                            <Badge variant={app.gender === 'Male' ? 'blue' : app.gender === 'Female' ? 'purple' : 'gray'}>
                                                {app.gender}
                                            </Badge>
                                        </TD>
                                        <TD className="font-mono text-gray-700">{app.phone_number}</TD>
                                        <TD className="text-gray-500">
                                            {new Date(app.created_at).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </TD>
                                        <TD className="text-right">
                                            {app.isConfirmed ? (
                                                <Badge variant="green" className="ring-2 ring-emerald-100">Confirmed</Badge>
                                            ) : (
                                                <Badge variant="yellow" className="ring-2 ring-yellow-100">Pending</Badge>
                                            )}
                                        </TD>
                                    </TR>
                                ))}

                                {applications.length === 0 && (
                                    <TR>
                                        <TD colSpan="6" className="py-32">
                                            <div className="flex flex-col items-center justify-center text-center">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                </div>
                                                <p className="text-gray-400 font-bold italic">No applications found for the selected period.</p>
                                                <p className="text-xs text-gray-300 mt-1">Try adjusting your date filters</p>
                                            </div>
                                        </TD>
                                    </TR>
                                )}
                            </TBody>
                        </Table>
                    )}
                </Card>
            </div>
        </div>
    );
}
