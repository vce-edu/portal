import { useState, useEffect, useCallback } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Table, THead, TBody, TH, TD, TR } from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Input, Select } from "../components/ui/Input";
import Modal from "../components/ui/Modal";

const ITEMS_PER_PAGE = 20;

export default function Scholarship() {
    const { branch, role } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBranch, setSelectedBranch] = useState("all");
    const [branches, setBranches] = useState([]);
    const [updatingScore, setUpdatingScore] = useState(null); // roll_number being updated

    // local scores for smooth typing
    const [localScores, setLocalScores] = useState({});

    // Migration State
    const [migrationModalOpen, setMigrationModalOpen] = useState(false);
    const [studentToMigrate, setStudentToMigrate] = useState(null);
    const [migrationFormData, setMigrationFormData] = useState({
        roll_number: "",
        mother_name: "",
        course: "General",
        duration: "",
        fee_month: "",
        batch_time: "",
        admission_date: new Date().toISOString().split("T")[0]
    });

    // Fetch branches
    useEffect(() => {
        const fetchBranches = async () => {
            const { data } = await supabase.from("users").select("branch").neq("branch", "all");
            const uniqueBranches = [...new Set(data?.map((d) => d.branch))];
            setBranches(uniqueBranches);
        };
        fetchBranches();
    }, []);

    const fetchScholarshipPool = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("scholarship_students")
                .select("*", { count: "exact" })
                .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)
                .order("student_name", { ascending: true });

            const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
            if (activeBranch && activeBranch !== "all") {
                query = query.eq("branch", activeBranch.toLowerCase());
            }

            if (searchQuery.trim()) {
                query = query.or(`student_name.ilike.%${searchQuery}%,roll_number.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`);
            }

            const { data: response, count, error } = await query;
            if (error) throw error;

            setData(response || []);
            setTotalCount(count || 0);

            // Initialize local scores
            const scores = {};
            response?.forEach(s => {
                scores[s.roll_number] = s.score ?? "";
            });
            setLocalScores(scores);
        } catch (err) {
            console.error("Error fetching scholarship pool:", err);
        } finally {
            setLoading(false);
        }
    }, [page, selectedBranch, branch, searchQuery]);

    useEffect(() => {
        fetchScholarshipPool();
    }, [fetchScholarshipPool]);

    const handleScoreUpdate = async (rollNumber) => {
        const newScore = localScores[rollNumber];
        const originalData = data.find(s => s.roll_number === rollNumber);
        const originalScore = originalData?.score;

        // Don't update if same
        if (String(newScore) === String(originalScore ?? "")) return;

        setUpdatingScore(rollNumber);
        try {
            const { error } = await supabase
                .from("scholarship_students")
                .update({ score: newScore ? parseInt(newScore) : null })
                .eq("roll_number", rollNumber);

            if (error) throw error;

            // Update data locally to match
            setData(prev => prev.map(item =>
                item.roll_number === rollNumber ? { ...item, score: newScore ? parseInt(newScore) : null } : item
            ));
        } catch (err) {
            console.error("Score update error:", err);
            alert("Failed to update score: " + err.message);
            // Revert local score
            setLocalScores(prev => ({ ...prev, [rollNumber]: originalScore ?? "" }));
        } finally {
            setUpdatingScore(null);
        }
    };

    const handleDelete = async (rollNumber) => {
        if (!confirm("Are you sure you want to delete this scholarship record?")) return;

        try {
            const { error } = await supabase.from("scholarship_students").delete().eq("roll_number", rollNumber);
            if (error) throw error;
            fetchScholarshipPool();
        } catch (err) {
            alert("Error deleting: " + err.message);
        }
    };

    const handleMigrate = (student) => {
        setStudentToMigrate(student);
        setMigrationFormData({
            roll_number: student.roll_number.split('_').pop(), // numeric part
            mother_name: "",
            course: "General",
            duration: "",
            fee_month: "",
            batch_time: "",
            admission_date: new Date().toISOString().split("T")[0]
        });
        setMigrationModalOpen(true);
    };

    const executeMigration = async () => {
        setLoading(true);
        try {
            const prefix = studentToMigrate.branch ? studentToMigrate.branch.trim().toLowerCase().charAt(0) + "_" : "";
            const finalRoll = `${prefix}${migrationFormData.roll_number}`;

            // 1. Insert into students
            const { error: insError } = await supabase.from("students").insert([{
                roll_number: finalRoll,
                student_name: studentToMigrate.student_name,
                father_name: studentToMigrate.father_name,
                phone_number: studentToMigrate.phone_number,
                branch: studentToMigrate.branch,
                mother_name: migrationFormData.mother_name || "—",
                course: migrationFormData.course || "General",
                duration: migrationFormData.duration || null,
                fee_month: migrationFormData.fee_month ? parseFloat(migrationFormData.fee_month) : null,
                addmission_date: migrationFormData.admission_date,
                batch_time: migrationFormData.batch_time || null
            }]);
            if (insError) throw insError;

            // 2. Delete from scholarship_students
            const { error: delError } = await supabase.from("scholarship_students").delete().eq("roll_number", studentToMigrate.roll_number);
            if (delError) console.error("Could not delete but student migrated:", delError);

            setMigrationModalOpen(false);
            fetchScholarshipPool();
            alert("Student migrated to main ledger successfully!");
        } catch (err) {
            alert("Migration failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50/30 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter">
                        Scholarship <span className="text-emerald-600 italic">Pool</span>
                    </h1>
                    <p className="text-gray-500 font-medium max-w-md">
                        Manage and track results for students in the scholarship program.
                    </p>
                </div>
                <Badge variant="emerald" className="py-2.5 px-6 rounded-2xl text-lg shadow-sm border-none self-start md:self-auto">
                    {totalCount} Active Students
                </Badge>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 items-center">
                <div className="md:col-span-2">
                    <Input
                        placeholder="Search by name, roll, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                        icon={() => (
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        )}
                    />
                </div>
                {branch?.toLowerCase() === "all" && (
                    <Select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        options={[
                            { value: "all", label: "Global Pool (All Branches)" },
                            ...branches.map((b) => ({ value: b, label: b.charAt(0).toUpperCase() + b.slice(1) }))
                        ]}
                    />
                )}
            </div>

            {/* Main Table */}
            <Card noPadding className="shadow-2xl border-none overflow-hidden bg-white">
                <div className="overflow-x-auto">
                    <Table>
                        <THead>
                            <TR className="bg-gray-50/50 border-b border-gray-100">
                                <TH className="py-6">Roll Number</TH>
                                <TH className="py-6">Student Name</TH>
                                <TH className="py-6">Contact Details</TH>
                                <TH className="py-6">Branch</TH>
                                <TH className="py-6 w-48 text-center">Exam Score</TH>
                                <TH className="py-6 text-right pr-6">Actions</TH>
                            </TR>
                        </THead>
                        <TBody>
                            {loading ? (
                                <TR>
                                    <TD colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                            <p className="text-sm font-bold text-gray-400">Syncing with pool...</p>
                                        </div>
                                    </TD>
                                </TR>
                            ) : data.length === 0 ? (
                                <TR>
                                    <TD colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-5xl mb-2">🏖️</span>
                                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No students in this view</p>
                                        </div>
                                    </TD>
                                </TR>
                            ) : (
                                data.map((student) => (
                                    <TR key={student.roll_number} className="hover:bg-gray-50/50 transition-colors group">
                                        <TD className="py-5">
                                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                                                {student.roll_number}
                                            </span>
                                        </TD>
                                        <TD className="py-5">
                                            <div className="flex flex-col">
                                                <span className="font-black text-gray-900 group-hover:text-emerald-700 transition-colors">{student.student_name}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">S/O {student.father_name}</span>
                                            </div>
                                        </TD>
                                        <TD className="py-5">
                                            <div className="text-xs space-y-0.5">
                                                <p className="font-bold text-gray-700">{student.phone_number}</p>
                                                <p className="text-[10px] font-medium text-gray-400 italic truncate max-w-[200px]">{student.address}</p>
                                            </div>
                                        </TD>
                                        <TD className="py-5">
                                            <Badge variant="blue" className="capitalize">{student.branch}</Badge>
                                        </TD>
                                        <TD className="py-5 text-center px-8">
                                            <div className="relative group/score inline-block">
                                                <input
                                                    type="number"
                                                    value={localScores[student.roll_number] ?? ""}
                                                    onChange={(e) => setLocalScores(prev => ({ ...prev, [student.roll_number]: e.target.value }))}
                                                    onBlur={() => handleScoreUpdate(student.roll_number)}
                                                    placeholder="N/A"
                                                    disabled={updatingScore === student.roll_number}
                                                    className={`
                                                        w-24 text-center py-2 px-3 rounded-xl border-2 font-black text-lg transition-all outline-none
                                                        ${localScores[student.roll_number]
                                                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700 focus:border-emerald-400'
                                                            : 'bg-gray-50 border-gray-100 text-gray-400 focus:border-purple-400'
                                                        }
                                                        ${updatingScore === student.roll_number ? 'opacity-50 animate-pulse' : ''}
                                                    `}
                                                />
                                                {updatingScore === student.roll_number && (
                                                    <div className="absolute top-1/2 -right-8 -translate-y-1/2">
                                                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                        </TD>
                                        <TD className="py-5 text-right pr-6">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleMigrate(student)}
                                                    className="px-3 py-1.5 text-[11px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(student.roll_number)}
                                                    className="px-3 py-1.5 text-[11px] font-black text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </TD>
                                    </TR>
                                ))
                            )}
                        </TBody>
                    </Table>
                </div>

                {totalPages > 1 && (
                    <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Dataset Segment {page + 1} of {totalPages}
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                disabled={page === 0 || loading}
                                onClick={() => setPage(p => p - 1)}
                                className="rounded-xl"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="primary"
                                disabled={page >= totalPages - 1 || loading}
                                onClick={() => setPage(p => p + 1)}
                                className="rounded-xl px-8"
                            >
                                Next Segment
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Footer Footer */}
            <div className="flex flex-col items-center justify-center gap-2 py-6">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Scholarship Ledger Node Active · Auto-Save Enabled
                    </p>
                </div>
            </div>

            {/* Migration Modal */}
            <Modal
                isOpen={migrationModalOpen}
                onClose={() => setMigrationModalOpen(false)}
                title="Migrate Student to Main Ledger"
                maxWidth="max-w-2xl"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">🎓</div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Migrating Candidate</p>
                            <h3 className="font-black text-gray-900 text-lg">{studentToMigrate?.student_name}</h3>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-tight">{studentToMigrate?.branch} • {studentToMigrate?.roll_number}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Numeric Roll"
                            value={migrationFormData.roll_number}
                            onChange={(e) => setMigrationFormData({ ...migrationFormData, roll_number: e.target.value })}
                            placeholder="e.g. 1234"
                            required
                        />
                        <Input
                            label="Course"
                            value={migrationFormData.course}
                            onChange={(e) => setMigrationFormData({ ...migrationFormData, course: e.target.value })}
                            required
                        />
                        <Input
                            label="Mother's Name"
                            value={migrationFormData.mother_name}
                            onChange={(e) => setMigrationFormData({ ...migrationFormData, mother_name: e.target.value })}
                        />
                        <Input
                            label="Duration"
                            value={migrationFormData.duration}
                            onChange={(e) => setMigrationFormData({ ...migrationFormData, duration: e.target.value })}
                            placeholder="e.g. 6 Months"
                        />
                        <Input
                            label="Monthly Fee"
                            type="number"
                            value={migrationFormData.fee_month}
                            onChange={(e) => setMigrationFormData({ ...migrationFormData, fee_month: e.target.value })}
                        />
                        <Input
                            label="Batch Time"
                            value={migrationFormData.batch_time}
                            onChange={(e) => setMigrationFormData({ ...migrationFormData, batch_time: e.target.value })}
                            placeholder="e.g. 9:00 AM"
                        />
                        <Input
                            label="Admission Date"
                            type="date"
                            value={migrationFormData.admission_date}
                            onChange={(e) => setMigrationFormData({ ...migrationFormData, admission_date: e.target.value })}
                        />
                    </div>

                    <Button
                        onClick={executeMigration}
                        loading={loading}
                        className="w-full py-4 rounded-2xl text-lg font-black tracking-tight shadow-xl bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700"
                    >
                        Confirm & Migrate to Ledger
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
