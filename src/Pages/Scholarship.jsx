import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, secSupabase } from "../createClient";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader } from "../components/ui/Card";
import { Table, THead, TBody, TH, TD, TR } from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Input, Select } from "../components/ui/Input";
import Modal from "../components/ui/Modal";

const ITEMS_PER_PAGE = 20;

const genderOptions = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" }
];

const branchOptions = [
    { value: "main", label: "Main" },
    { value: "second", label: "Second" },
    { value: "third", label: "Third" }
];

const compressImage = (file, quality = 0.7, maxWidth = 1024, maxHeight = 1024) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name, {
                                type: "image/jpeg",
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            reject(new Error("Canvas toBlob failed"));
                        }
                    },
                    "image/jpeg",
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export default function Scholarship() {
    const { branch, staffId, role } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBranch, setSelectedBranch] = useState("all");
    const [branches, setBranches] = useState([]);
    const [defaultTimeSlot, setDefaultTimeSlot] = useState("09:00");

    // Add record card state
    const [open, setOpen] = useState(false);
    const [students, setStudents] = useState([]);
    const [duplicateErrors, setDuplicateErrors] = useState({});
    const timeoutRef = useRef({});

    // View Modal State
    const [viewStudent, setViewStudent] = useState(null);

    // Edit Modal State
    const [editStudent, setEditStudent] = useState(null);
    const [editForm, setEditForm] = useState({
        roll_number: "",
        student_name: "",
        father_name: "",
        mother_name: "",
        gender: "Male",
        phone_number: "",
        address: "",
        branch: "main",
        date: "",
        time: "",
        present: "false",
        staff_id: null,
        photo: null,
        ok: false,
    });
    const [originalRoll, setOriginalRoll] = useState(null);
    const [editRollError, setEditRollError] = useState("");
    const editTimeoutRef = useRef(null);

    const [showOnlyPresent, setShowOnlyPresent] = useState(false);
    const [showOnlyOk, setShowOnlyOk] = useState(false);
    const [markingPresent, setMarkingPresent] = useState({});
    const [markingOk, setMarkingOk] = useState({});
    const [localScores, setLocalScores] = useState({});
    const saveTimeoutRef = useRef({});

    // Reset local scores when database data changes/re-fetches to keep in sync
    useEffect(() => {
        setLocalScores({});
        // Clean up any pending saves
        Object.values(saveTimeoutRef.current).forEach(clearTimeout);
        saveTimeoutRef.current = {};
    }, [data]);

    const handleMarkPresent = async (rollNumber) => {
        setMarkingPresent(prev => ({ ...prev, [rollNumber]: true }));
        try {
            const { error } = await supabase
                .from("scholarship_students")
                .update({ present: true })
                .eq("roll_number", rollNumber);

            if (error) throw error;

            setData(prev =>
                prev.map(student =>
                    student.roll_number === rollNumber ? { ...student, present: true } : student
                )
            );
        } catch (err) {
            console.error("Error marking present:", err);
            alert("Error: " + err.message);
        } finally {
            setMarkingPresent(prev => ({ ...prev, [rollNumber]: false }));
        }
    };

    const handleMarkOk = async (rollNumber, currentOkStatus) => {
        setMarkingOk(prev => ({ ...prev, [rollNumber]: true }));
        try {
            const nextOk = !currentOkStatus;
            const { error } = await supabase
                .from("scholarship_students")
                .update({ ok: nextOk })
                .eq("roll_number", rollNumber);

            if (error) throw error;

            setData(prev =>
                prev.map(student =>
                    student.roll_number === rollNumber ? { ...student, ok: nextOk } : student
                )
            );
        } catch (err) {
            console.error("Error updating OK status:", err);
            alert("Error: " + err.message);
        } finally {
            setMarkingOk(prev => ({ ...prev, [rollNumber]: false }));
        }
    };

    const handleScoreChange = (rollNumber, val, originalScore) => {
        setLocalScores(prev => ({ ...prev, [rollNumber]: val }));

        if (saveTimeoutRef.current[rollNumber]) {
            clearTimeout(saveTimeoutRef.current[rollNumber]);
        }

        saveTimeoutRef.current[rollNumber] = setTimeout(() => {
            saveScore(rollNumber, val, originalScore);
        }, 1000);
    };

    const saveScore = async (rollNumber, val, originalScore) => {
        if (val === undefined) return;
        const parsedVal = val.trim() === "" ? null : parseInt(val);
        const originalParsed = originalScore === null ? null : parseInt(originalScore);

        if (parsedVal === originalParsed) return;

        try {
            const { error } = await supabase
                .from("scholarship_students")
                .update({ score: parsedVal })
                .eq("roll_number", rollNumber);

            if (error) throw error;

            setData(prev =>
                prev.map(student =>
                    student.roll_number === rollNumber ? { ...student, score: parsedVal } : student
                )
            );
        } catch (err) {
            console.error("Error updating score:", err);
        }
    };

    const handleScoreBlur = (rollNumber, originalScore) => {
        if (saveTimeoutRef.current[rollNumber]) {
            clearTimeout(saveTimeoutRef.current[rollNumber]);
        }
        const val = localScores[rollNumber];
        saveScore(rollNumber, val, originalScore);
    };

    const getInitialBranch = () => {
        if (!branch || branch.toLowerCase() === "all") return "main";
        return branch.toLowerCase();
    };

    const createInitialStudentRow = (rollNumber = "", defaultTime = defaultTimeSlot) => ({
        rollNumber,
        studentName: "",
        fatherName: "",
        motherName: "",
        gender: "Male",
        phoneNumber: "",
        address: "",
        branch: getInitialBranch(),
        date: "2026-06-21",
        time: defaultTime,
        photo: null,
    });

    // Fetch unique branches from database for filters
    useEffect(() => {
        const fetchBranches = async () => {
            const { data } = await supabase.from("users").select("branch").neq("branch", "all");
            const uniqueBranches = [...new Set(data?.map((d) => d.branch))];
            setBranches(uniqueBranches);
        };
        fetchBranches();
    }, []);

    // Set initial student row when add card is opened — autofill roll number and fetch slot time
    useEffect(() => {
        if (!open) return;

        const fetchNextRollNumberAndSlot = async () => {
            try {
                // Fetch next roll number
                const { data: rows } = await supabase
                    .from("scholarship_students")
                    .select("roll_number")
                    .order("roll_number", { ascending: false })
                    .limit(1);

                const max = rows?.[0]?.roll_number;
                const nextRoll = max ? parseInt(max, 10) + 1 : 5100;

                // Fetch available slot hour via RPC
                let hourSlot = 9;
                try {
                    const { data: slotHour, error: slotErr } = await supabase.rpc("get_available_slot");
                    if (!slotErr && slotHour !== null) {
                        hourSlot = slotHour;
                    }
                } catch (slotErr) {
                    console.error("Failed to fetch available slot:", slotErr);
                }

                const timeStr = `${String(hourSlot).padStart(2, "0")}:00`;
                setDefaultTimeSlot(timeStr);
                setStudents([createInitialStudentRow(String(nextRoll), timeStr)]);
            } catch (err) {
                console.error("Failed to fetch next roll number and slot:", err);
                setStudents([createInitialStudentRow("5100", hourSlot)]);
            }
        };

        fetchNextRollNumberAndSlot();
    }, [open]);

    // Esc key handler to close forms/modals
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") {
                if (open) setOpen(false);
                if (editStudent) setEditStudent(null);
                if (viewStudent) setViewStudent(null);
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [open, editStudent, viewStudent]);

    // Fetch scholarship records
    const fetchScholarshipPool = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("scholarship_students")
                .select("*", { count: "exact" })
                .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)
                .order("roll_number", { ascending: false });

            // If the user's role is not manager or owner, filter by their own staffId
            if (role !== "manager" && role !== "owner" && staffId) {
                query = query.eq("staff_id", staffId);
            }

            const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
            if (activeBranch && activeBranch !== "all") {
                query = query.eq("branch", activeBranch.toLowerCase());
            }

            if (searchQuery.trim()) {
                const term = searchQuery.trim();
                let orConditions = `roll_number.ilike.%${term}%,student_name.ilike.%${term}%,father_name.ilike.%${term}%`;

                // Allow searching via staff_id
                const cleanNum = term.replace(/^#/, "");
                const parsedInt = parseInt(cleanNum, 10);
                if (!isNaN(parsedInt) && /^\d+$/.test(cleanNum)) {
                    orConditions += `,staff_id.eq.${parsedInt}`;
                }
                query = query.or(orConditions);
            }

            if (showOnlyPresent) {
                query = query.eq("present", true);
            }

            if (showOnlyOk) {
                query = query.eq("ok", true);
            }

            const { data: response, count, error } = await query;
            if (error) throw error;

            setData(response || []);
            setTotalCount(count || 0);
        } catch (err) {
            console.error("Error fetching scholarship records:", err);
        } finally {
            setLoading(false);
        }
    }, [page, selectedBranch, branch, searchQuery, showOnlyPresent, showOnlyOk, role, staffId]);

    // Debounced search trigger
    useEffect(() => {
        const delay = setTimeout(() => {
            fetchScholarshipPool();
        }, 300);
        return () => clearTimeout(delay);
    }, [searchQuery, fetchScholarshipPool, selectedBranch]);

    const handleAddRow = () => {
        setStudents(prev => [...prev, createInitialStudentRow()]);
    };

    const handleRemoveRow = (index) => {
        if (students.length === 1) return;
        setStudents(prev => prev.filter((_, i) => i !== index));
        setDuplicateErrors(prev => {
            const next = {};
            Object.keys(prev).forEach((key) => {
                const k = parseInt(key);
                if (k < index) {
                    next[k] = prev[k];
                } else if (k > index) {
                    next[k - 1] = prev[k];
                }
            });
            return next;
        });
    };

    const handleChange = (index, field, value) => {
        const newStudents = [...students];
        if (["studentName", "fatherName", "motherName"].includes(field)) {
            newStudents[index][field] = value.toUpperCase();
        } else {
            newStudents[index][field] = value;
        }
        setStudents(newStudents);

        if (field === "rollNumber") {
            if (timeoutRef.current[index]) {
                clearTimeout(timeoutRef.current[index]);
            }
            timeoutRef.current[index] = setTimeout(() => {
                checkRollNumberDuplicate(index, value, newStudents);
            }, 500);
        }
    };

    const checkRollNumberDuplicate = async (index, rollNo, currentStudents) => {
        if (!rollNo) {
            setDuplicateErrors(prev => {
                const next = { ...prev };
                delete next[index];
                return next;
            });
            return;
        }

        const isDuplicateInForm = currentStudents.some((s, i) => i !== index && s.rollNumber.trim() === rollNo.trim());
        if (isDuplicateInForm) {
            setDuplicateErrors(prev => ({ ...prev, [index]: "Duplicate in form" }));
            return;
        }

        try {
            const { data: duplicateData } = await supabase
                .from("scholarship_students")
                .select("roll_number")
                .eq("roll_number", rollNo.trim())
                .maybeSingle();

            if (duplicateData) {
                setDuplicateErrors(prev => ({ ...prev, [index]: "Already exists in database" }));
                return;
            }

            setDuplicateErrors(prev => {
                const next = { ...prev };
                delete next[index];
                return next;
            });
        } catch (err) {
            console.error("Duplicate check error:", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (Object.keys(duplicateErrors).length > 0) {
            alert("Please fix duplicate roll numbers before submitting.");
            return;
        }

        const formattedData = students.map((s) => ({
            roll_number: s.rollNumber.trim(),
            student_name: s.studentName.trim(),
            father_name: s.fatherName.trim(),
            mother_name: s.motherName.trim(),
            gender: s.gender,
            phone_number: s.phoneNumber.trim(),
            address: s.address.trim(),
            branch: s.branch.toLowerCase(),
            date: s.date,
            time: s.time ? `${s.time}:00` : null,
            staff_id: staffId || null,
        }));

        setLoading(true);
        try {
            // Upload student photos to secSupabase storage first
            for (let i = 0; i < students.length; i++) {
                const s = students[i];
                if (s.photo) {
                    // Logical limitation: only images allowed, size limit 10MB before compression
                    if (!s.photo.type.startsWith("image/")) {
                        throw new Error(`File selected for ${s.studentName} is not a valid image.`);
                    }
                    if (s.photo.size > 10 * 1024 * 1024) {
                        throw new Error(`Photo for ${s.studentName} exceeds the maximum size limit of 10MB.`);
                    }

                    let fileToUpload = s.photo;
                    try {
                        fileToUpload = await compressImage(s.photo, 0.7, 1024, 1024);
                    } catch (compressErr) {
                        console.error(`Compression failed for ${s.studentName}, using original photo:`, compressErr);
                    }

                    const fileExt = fileToUpload.name.split('.').pop();
                    const fileName = `${s.rollNumber.trim()}_${s.studentName.trim()}.${fileExt}`;

                    const { error: uploadError } = await secSupabase.storage
                        .from("student-photos")
                        .upload(fileName, fileToUpload, {
                            upsert: true,
                        });

                    if (uploadError) {
                        throw new Error(`Failed to upload photo for ${s.studentName}: ${uploadError.message}`);
                    }
                }
            }

            const { error } = await supabase.from("scholarship_students").insert(formattedData);
            if (error) throw error;

            alert("Scholarship students added successfully!");
            setOpen(false);
            setStudents([createInitialStudentRow()]);
            fetchScholarshipPool();
        } catch (err) {
            alert("Error adding students: " + err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (rollNumber) => {
        if (!confirm(`Are you sure you want to delete scholarship record ${rollNumber}?`)) return;

        try {
            const { error } = await supabase.from("scholarship_students").delete().eq("roll_number", rollNumber);
            if (error) throw error;
            alert("Scholarship record deleted!");
            fetchScholarshipPool();
        } catch (err) {
            alert("Error deleting: " + err.message);
        }
    };

    const openViewModal = (student) => {
        setViewStudent(student);
    };

    const openUpdateModal = (student) => {
        setOriginalRoll(student.roll_number);
        setEditRollError("");
        setEditForm({
            roll_number: student.roll_number,
            student_name: student.student_name,
            father_name: student.father_name,
            mother_name: student.mother_name,
            gender: student.gender,
            phone_number: student.phone_number,
            address: student.address,
            branch: student.branch.toLowerCase(),
            date: student.date,
            time: student.time ? student.time.slice(0, 5) : "",
            present: student.present ? "true" : "false",
            staff_id: student.staff_id,
            photo: null,
            ok: student.ok || false,
        });
        setEditStudent(student);
    };

    const handleEditRollChange = (val) => {
        setEditForm(prev => ({ ...prev, roll_number: val }));

        if (editTimeoutRef.current) {
            clearTimeout(editTimeoutRef.current);
        }

        editTimeoutRef.current = setTimeout(async () => {
            const trimmed = val.trim();
            if (!trimmed) {
                setEditRollError("");
                return;
            }
            if (trimmed === originalRoll.trim()) {
                setEditRollError("");
                return;
            }
            try {
                const { data: duplicateData } = await supabase
                    .from("scholarship_students")
                    .select("roll_number")
                    .eq("roll_number", trimmed)
                    .maybeSingle();

                if (duplicateData) {
                    setEditRollError("Already exists in database");
                } else {
                    setEditRollError("");
                }
            } catch (err) {
                console.error("Duplicate check error:", err);
            }
        }, 500);
    };

    const handleUpdate = async () => {
        if (editRollError) {
            alert("Please resolve the roll number error before updating.");
            return;
        }

        setLoading(true);
        try {
            // Double-check duplicate roll number in database if changed
            if (editForm.roll_number.trim() !== originalRoll.trim()) {
                const { data: existing } = await supabase
                    .from("scholarship_students")
                    .select("roll_number")
                    .eq("roll_number", editForm.roll_number.trim())
                    .maybeSingle();
                if (existing) {
                    alert("Roll number already exists in database!");
                    setLoading(false);
                    return;
                }
            }

            if (editForm.photo) {
                if (!editForm.photo.type.startsWith("image/")) {
                    throw new Error("File selected is not a valid image.");
                }
                if (editForm.photo.size > 10 * 1024 * 1024) {
                    throw new Error("Photo exceeds the maximum size limit of 10MB.");
                }

                let fileToUpload = editForm.photo;
                try {
                    fileToUpload = await compressImage(editForm.photo, 0.7, 1024, 1024);
                } catch (compressErr) {
                    console.error("Compression failed, using original photo:", compressErr);
                }

                const fileExt = fileToUpload.name.split('.').pop();
                const fileName = `${editForm.roll_number.trim()}_${editForm.student_name.trim()}.${fileExt}`;

                const { error: uploadError } = await secSupabase.storage
                    .from("student-photos")
                    .upload(fileName, fileToUpload, {
                        upsert: true,
                    });

                if (uploadError) {
                    throw new Error(`Failed to upload photo: ${uploadError.message}`);
                }
            }

            const { error } = await supabase
                .from("scholarship_students")
                .update({
                    roll_number: editForm.roll_number.trim(),
                    student_name: editForm.student_name.trim(),
                    father_name: editForm.father_name.trim(),
                    mother_name: editForm.mother_name.trim(),
                    gender: editForm.gender,
                    phone_number: editForm.phone_number.trim(),
                    address: editForm.address.trim(),
                    branch: editForm.branch,
                    date: editForm.date,
                    time: editForm.time ? `${editForm.time}:00` : null,
                    present: editForm.present === "true",
                    ok: editForm.ok,
                })
                .eq("roll_number", originalRoll);

            if (error) throw error;

            alert("Student record updated successfully!");
            setEditStudent(null);
            fetchScholarshipPool();
        } catch (err) {
            alert("Update failed: " + err.message);
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
                        Scholarship
                    </h1>
                    <p className="text-sm md:text-xl mt-2 md:mt-4 text-purple-950 font-semibold max-w-2xl leading-relaxed">
                        Manage and track results for students in the scholarship program.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        onClick={() => setOpen(true)}
                        icon={() => (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        )}
                    >
                        Add Students
                    </Button>
                    <Badge variant="emerald" className="py-2.5 px-6 rounded-2xl text-lg shadow-sm border-none self-start md:self-auto flex items-center justify-center">
                        {totalCount} Active Students
                    </Badge>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 items-center">
                <div className="md:col-span-2">
                    <Input
                        placeholder="Search by roll, name, or father's name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                        icon={() => (
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        )}
                    />
                </div>
                <div className="flex flex-col gap-2 justify-center">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={showOnlyPresent}
                            onChange={(e) => setShowOnlyPresent(e.target.checked)}
                            className="w-5 h-5 rounded-lg border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-black text-purple-950 uppercase tracking-wider">
                            Only Present Students
                        </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={showOnlyOk}
                            onChange={(e) => setShowOnlyOk(e.target.checked)}
                            className="w-5 h-5 rounded-lg border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-black text-purple-950 uppercase tracking-wider">
                            Only OK Students
                        </span>
                    </label>
                </div>
                {branch?.toLowerCase() === "all" ? (
                    <Select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        options={[
                            { value: "all", label: "Global Pool (All Branches)" },
                            ...branches.map((b) => ({ value: b, label: b.charAt(0).toUpperCase() + b.slice(1) }))
                        ]}
                    />
                ) : (
                    <div className="text-right">
                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full uppercase tracking-wider">
                            Branch: {branch}
                        </span>
                    </div>
                )}
            </div>

            {/* Add student form card */}
            {open && (
                <Card className="animate-in slide-in-from-top-4 duration-300">
                    <CardHeader
                        title="New Scholarship Student Entry"
                        action={
                            <button onClick={() => setOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        }
                    />
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-4">
                            {students.map((s, index) => (
                                <div key={index} className="bg-gray-50/50 p-4 md:p-6 rounded-3xl border border-gray-100 relative group">
                                    {students.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveRow(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-x-6 md:gap-y-4">
                                        <Input
                                            label="Roll Number"
                                            value={s.rollNumber}
                                            onChange={(e) => handleChange(index, "rollNumber", e.target.value)}
                                            required
                                            error={duplicateErrors[index]}
                                        />
                                        <Input
                                            label="Full Name"
                                            value={s.studentName}
                                            onChange={(e) => handleChange(index, "studentName", e.target.value)}
                                            required
                                        />
                                        <Input
                                            label="Father's Name"
                                            value={s.fatherName}
                                            onChange={(e) => handleChange(index, "fatherName", e.target.value)}
                                            required
                                        />
                                        <Input
                                            label="Mother's Name"
                                            value={s.motherName}
                                            onChange={(e) => handleChange(index, "motherName", e.target.value)}
                                            required
                                        />
                                        <Select
                                            label="Gender"
                                            value={s.gender}
                                            onChange={(e) => handleChange(index, "gender", e.target.value)}
                                            options={genderOptions}
                                            required
                                        />
                                        <Input
                                            label="Phone Number"
                                            value={s.phoneNumber}
                                            onChange={(e) => handleChange(index, "phoneNumber", e.target.value)}
                                            required
                                        />
                                        <Input
                                            label="Address"
                                            value={s.address}
                                            onChange={(e) => handleChange(index, "address", e.target.value)}
                                            required
                                        />
                                        <Select
                                            label="Branch"
                                            value={s.branch}
                                            onChange={(e) => handleChange(index, "branch", e.target.value)}
                                            options={branchOptions}
                                            required
                                            disabled={branch?.toLowerCase() !== "all"}
                                        />
                                        <Input
                                            label="Date"
                                            type="date"
                                            value={s.date}
                                            onChange={(e) => handleChange(index, "date", e.target.value)}
                                            required
                                        />
                                        <Input
                                            label="Time"
                                            type="time"
                                            value={s.time}
                                            onChange={(e) => handleChange(index, "time", e.target.value)}
                                        />
                                        <Input
                                            label="Student Photo"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleChange(index, "photo", e.target.files?.[0] || null)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleAddRow}
                                icon={() => (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                )}
                                className="w-full sm:w-auto"
                            >
                                Add Another Row
                            </Button>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" className="flex-1 sm:flex-none px-12">
                                    Save All Students
                                </Button>
                            </div>
                        </div>
                    </form>
                </Card>
            )}

            {/* Main Table */}
            <Card noPadding className="shadow-2xl border-none overflow-hidden bg-white">
                <div className="overflow-x-auto">
                    <Table>
                        <THead>
                            <TR className="bg-gray-50/50 border-b border-gray-100">
                                <TH className="py-6">Roll Number</TH>
                                <TH className="py-6">Student Name</TH>
                                <TH className="py-6">Parents</TH>
                                <TH className="py-6">Gender</TH>
                                <TH className="py-6">Contact</TH>
                                <TH className="py-6">Branch</TH>
                                <TH className="py-6">Staff ID</TH>
                                <TH className="py-6">Date & Time</TH>
                                <TH className="py-6 text-right pr-6">Actions</TH>
                            </TR>
                        </THead>
                        <TBody>
                            {loading ? (
                                <TR>
                                    <TD colSpan={9} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                            <p className="text-sm font-bold text-gray-400">Syncing with pool...</p>
                                        </div>
                                    </TD>
                                </TR>
                            ) : data.length === 0 ? (
                                <TR>
                                    <TD colSpan={9} className="py-24 text-center">
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
                                        <TD className="py-5 font-black text-gray-900 group-hover:text-emerald-700 transition-colors">
                                            <div className="flex items-center gap-2">
                                                {student.ok && (
                                                    <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Verified OK">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                                <span>{student.student_name}</span>
                                            </div>
                                        </TD>
                                        <TD className="py-5">
                                            <div className="flex flex-col text-xs">
                                                <span className="font-bold text-gray-700">F: {student.father_name}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">M: {student.mother_name}</span>
                                            </div>
                                        </TD>
                                        <TD className="py-5">
                                            <Badge variant="purple">{student.gender}</Badge>
                                        </TD>
                                        <TD className="py-5">
                                            <div className="text-xs space-y-0.5">
                                                <p className="font-bold text-gray-700">{student.phone_number}</p>
                                                <p className="text-[10px] font-medium text-gray-400 italic truncate max-w-[150px]">{student.address}</p>
                                            </div>
                                        </TD>
                                        <TD className="py-5">
                                            <Badge variant="blue" className="capitalize">{student.branch}</Badge>
                                        </TD>
                                        <TD className="py-5">
                                            {student.staff_id ? (
                                                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
                                                    #{student.staff_id}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </TD>
                                        <TD className="py-5">
                                            <div className="text-xs">
                                                <p className="font-bold text-purple-950">{student.date}</p>
                                                {student.time && <p className="text-[10px] font-medium text-gray-400 mt-0.5">{student.time.slice(0, 5)}</p>}
                                            </div>
                                        </TD>
                                        <TD className="py-5 text-right pr-6">
                                            <div className="flex justify-end items-center gap-1.5">
                                                <Button
                                                    size="sm"
                                                    variant={student.ok ? "secondary" : "primary"}
                                                    disabled={markingOk[student.roll_number]}
                                                    onClick={() => handleMarkOk(student.roll_number, student.ok)}
                                                    className={`${student.ok
                                                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200"
                                                        : "bg-blue-600 hover:bg-blue-700 text-white"
                                                        } font-bold py-1.5 px-3 rounded-lg text-xs`}
                                                >
                                                    {markingOk[student.roll_number] ? "Saving..." : student.ok ? "OK ✓" : "OK"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    disabled={student.present || markingPresent[student.roll_number]}
                                                    onClick={() => handleMarkPresent(student.roll_number)}
                                                    className={`${student.present
                                                        ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        } font-bold py-1.5 px-3 rounded-lg text-xs`}
                                                >
                                                    {markingPresent[student.roll_number] ? "Saving..." : "Present"}
                                                </Button>
                                                <input
                                                    type="number"
                                                    placeholder="Score"
                                                    value={localScores[student.roll_number] !== undefined ? localScores[student.roll_number] : (student.score ?? "")}
                                                    onChange={(e) => handleScoreChange(student.roll_number, e.target.value, student.score)}
                                                    onBlur={() => handleScoreBlur(student.roll_number, student.score)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") e.target.blur();
                                                    }}
                                                    className="w-20 px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-center outline-none focus:ring-2 focus:ring-purple-200 placeholder:text-gray-300 font-bold bg-white text-gray-700"
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openViewModal(student)}
                                                    className="font-bold py-1.5 px-3 rounded-lg text-xs"
                                                >
                                                    View
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => openUpdateModal(student)}
                                                    className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 font-bold py-1.5 px-3 rounded-lg text-xs"
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={() => handleDelete(student.roll_number)}
                                                    className="font-bold py-1.5 px-3 rounded-lg text-xs"
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </TD>
                                    </TR>
                                ))
                            )}
                        </TBody>
                    </Table>
                </div>

                {totalPages > 1 && (
                    <div className="p-8 bg-purple-100 border-t border-purple-200 flex justify-between items-center">
                        <p className="text-xs font-black text-purple-950 uppercase tracking-[0.2em]">
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

            {/* Footer */}
            <div className="flex flex-col items-center justify-center gap-2 py-6">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-200" />
                    <p className="text-xs md:text-sm font-black text-purple-950/30 uppercase tracking-[0.3em]">
                        Scholarship Ledger Node Active · Auto-Save Enabled
                    </p>
                </div>
            </div>

            {/* VIEW DETAILS MODAL */}
            <Modal
                isOpen={!!viewStudent}
                onClose={() => setViewStudent(null)}
                title="Scholarship Student Details"
            >
                {viewStudent && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            <DetailRow label="Roll Number" value={viewStudent.roll_number} />
                            <DetailRow label="Full Name" value={viewStudent.student_name} />
                            <DetailRow label="Father Name" value={viewStudent.father_name} />
                            <DetailRow label="Mother Name" value={viewStudent.mother_name} />
                            <DetailRow label="Gender" value={viewStudent.gender} />
                            <DetailRow label="Phone Number" value={viewStudent.phone_number} />
                            <DetailRow label="Address" value={viewStudent.address} />
                            <DetailRow label="Branch" value={viewStudent.branch} />
                            <DetailRow label="Staff ID" value={viewStudent.staff_id !== null ? `#${viewStudent.staff_id}` : "—"} />
                            <DetailRow label="Date" value={viewStudent.date} />
                            <DetailRow label="Time" value={viewStudent.time ? viewStudent.time.slice(0, 5) : "-"} />
                            {viewStudent.score !== null && <DetailRow label="Score" value={viewStudent.score} />}
                            <DetailRow label="Present Status" value={viewStudent.present ? "True" : "False"} />
                            <DetailRow label="OK Status" value={viewStudent.ok ? "True" : "False"} />
                        </div>
                        <Button variant="secondary" className="w-full mt-4" onClick={() => setViewStudent(null)}>Close</Button>
                    </div>
                )}
            </Modal>

            {/* UPDATE DETAILS MODAL */}
            <Modal
                isOpen={!!editStudent}
                onClose={() => setEditStudent(null)}
                title="Update Scholarship Student"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setEditStudent(null)}>Cancel</Button>
                        <Button onClick={handleUpdate} loading={loading}>Save Changes</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Roll Number"
                        value={editForm.roll_number}
                        onChange={(e) => handleEditRollChange(e.target.value)}
                        required
                        error={editRollError}
                    />
                    <Input
                        label="Full Name"
                        value={editForm.student_name}
                        onChange={(e) => setEditForm({ ...editForm, student_name: e.target.value.toUpperCase() })}
                        required
                    />
                    <Input
                        label="Father's Name"
                        value={editForm.father_name}
                        onChange={(e) => setEditForm({ ...editForm, father_name: e.target.value.toUpperCase() })}
                        required
                    />
                    <Input
                        label="Mother's Name"
                        value={editForm.mother_name}
                        onChange={(e) => setEditForm({ ...editForm, mother_name: e.target.value.toUpperCase() })}
                        required
                    />
                    <Select
                        label="Gender"
                        value={editForm.gender}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                        options={genderOptions}
                        required
                    />
                    <Input
                        label="Phone Number"
                        value={editForm.phone_number}
                        onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                        required
                    />
                    <Input
                        label="Address"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        required
                    />
                    <Select
                        label="Branch"
                        value={editForm.branch}
                        onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                        options={branchOptions}
                        required
                        disabled={branch?.toLowerCase() !== "all"}
                    />
                    <Input
                        label="Staff ID"
                        value={editForm.staff_id !== null && editForm.staff_id !== undefined ? String(editForm.staff_id) : "—"}
                        disabled
                    />
                    <Input
                        label="Date"
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        required
                    />
                    <Input
                        label="Time"
                        type="time"
                        value={editForm.time}
                        onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    />
                    <Select
                        label="Present Status"
                        value={editForm.present}
                        onChange={(e) => setEditForm({ ...editForm, present: e.target.value })}
                        options={[
                            { value: "true", label: "True" },
                            { value: "false", label: "False" }
                        ]}
                        required
                    />
                    <Input
                        label="Student Photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEditForm({ ...editForm, photo: e.target.files?.[0] || null })}
                    />
                    <Select
                        label="OK Status"
                        value={editForm.ok ? "true" : "false"}
                        onChange={(e) => setEditForm({ ...editForm, ok: e.target.value === "true" })}
                        options={[
                            { value: "true", label: "True" },
                            { value: "false", label: "False" }
                        ]}
                        required
                    />
                </div>
            </Modal>
        </div>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="flex flex-col sm:flex-row sm:justify-between border-b border-gray-50 pb-2 gap-1 group">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
            <span className="text-sm font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">{value || "-"}</span>
        </div>
    );
}
