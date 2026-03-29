import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { Card, CardHeader } from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import { Input, Select } from "../components/ui/Input";
import NoteTooltip from "../components/ui/NoteTooltip";
import BatchTimePicker from "../components/ui/BatchTimePicker";
import Badge from "../components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR } from "../components/ui/Table";

export default function Students() {
  const navigate = useNavigate();
  const { branch } = useAuth();
  const [page, setPage] = useState(0);
  const [pageSize] = useState(100);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [allBranches, setAllBranches] = useState([]);
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState([
    {
      rollNumber: "",
      studentName: "",
      fatherName: "",
      motherName: "",
      course: "",
      duration: "",
      feeMonth: "",
      phoneNumber: "",
      admissionDate: "",
      branch: branch?.toLowerCase() === "all" ? "main" : branch,
      batchTime: "",
    },
  ]);

  const [studentList, setStudentList] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(
    branch?.toLowerCase() === "all" ? "main" : branch
  );

  // VIEW MORE MODAL
  const [viewStudent, setViewStudent] = useState(null);

  // UPDATE MODAL
  const [editStudent, setEditStudent] = useState(null);

  // Update form state
  const [editForm, setEditForm] = useState({
    roll_number: "",
    student_name: "",
    father_name: "",
    mother_name: "",
    course: "",
    duration: "",
    fee_month: "",
    phone_number: "",
    addmission_date: "",
    branch: "",
    batch_time: "",
  });
  const [originalRoll, setOriginalRoll] = useState(null);
  const [showBreakStudents, setShowBreakStudents] = useState(false);

  // BREAK MODAL
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [studentForBreak, setStudentForBreak] = useState(null);
  const [breakDates, setBreakDates] = useState({ from: null, to: null });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [duplicateErrors, setDuplicateErrors] = useState({}); // { index: errorMessage }
  const timeoutRef = React.useRef({});



  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (open) setOpen(false);
        if (editStudent) setEditStudent(null);
        if (viewStudent) setViewStudent(null);
        if (breakModalOpen) setBreakModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, editStudent, viewStudent, breakModalOpen]);

  // Fetch Students
  const fetchStudents = useCallback(async (branchToUse, pageToLoad = 0, searchTerm = "", reset = false) => {
    setLoading(true);

    try {
      const from = pageToLoad * pageSize;
      const to = from + pageSize - 1;

      const tableName = showBreakStudents ? "break_students" : "students";

      let query = supabase
        .from(tableName)
        .select("*", { count: "exact" })
        .range(from, to)
        .order("roll_number", { ascending: false });

      if (branchToUse && branchToUse !== "all") {
        query = query.eq("branch", branchToUse.toLowerCase());
      }

      if (searchTerm.trim()) {
        query = query.or(`roll_number.ilike.%${searchTerm}%,student_name.ilike.%${searchTerm}%,father_name.ilike.%${searchTerm}%`);
      }

      const { data, count, error } = await query;

      if (error) {
        console.error("Fetch error:", error);
        return;
      }

      if (reset) {
        setStudentList(data);
        setTotalCount(count || 0);
        setPage(1);
        setHasMore(data.length === pageSize);
      } else {
        setStudentList((prev) => [...prev, ...data]);
        setPage(pageToLoad + 1);
        setHasMore(data.length === pageSize);
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize, showBreakStudents]);

  // RESET SELECTION ON FILTER CHANGE
  useEffect(() => {
    setSelectedStudents([]);
  }, [showBreakStudents, search, selectedBranch]);



  // REMOVED redundant immediate useEffect which triggered double fetches with search debounce.
  // branch, selectedBranch, fetchStudents and showBreakStudents are now handled by search debounce.


  // Add Form Row
  const handleAddRow = () => {
    setStudents([
      ...students,
      {
        rollNumber: "",
        studentName: "",
        fatherName: "",
        motherName: "",
        course: "",
        duration: "",
        feeMonth: "",
        phoneNumber: "",
        admissionDate: "",
        branch: branch?.toLowerCase() === "all" ? "main" : branch,
        batchTime: "",
      },
    ]);
  };
  const handleRemoveRow = (index) => {
    // prevent removing the last row
    if (students.length === 1) return;

    setStudents(students.filter((_, i) => i !== index));

    // Shift/Remove duplicate errors
    setDuplicateErrors((prev) => {
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


  // Form Change
  const handleChange = (index, field, value) => {
    const newStudents = [...students];
    newStudents[index][field] = value;
    setStudents(newStudents);

    if (field === "rollNumber" || field === "branch") {
      const rollNo = field === "rollNumber" ? value : newStudents[index].rollNumber;
      const branchVal = field === "branch" ? value : newStudents[index].branch;
      
      // Clear existing timeout for this row
      if (timeoutRef.current[index]) {
        clearTimeout(timeoutRef.current[index]);
      }

      timeoutRef.current[index] = setTimeout(() => {
        checkRollNumberDuplicate(index, rollNo, branchVal, newStudents);
      }, 500);
    }
  };

  const checkRollNumberDuplicate = async (index, rollNo, branchVal, currentStudents) => {
    if (!rollNo || !branchVal) {
      setDuplicateErrors(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }

    const prefix = branchVal.trim() !== ""
      ? branchVal.trim().toLowerCase().charAt(0) + "_"
      : "";
    const fullRoll = `${prefix}${rollNo}`;

    // 1. Check for duplicates within the current form
    const isDuplicateInForm = currentStudents.some((s, i) => {
      if (i === index) return false;
      const p = s.branch && s.branch.trim() !== "" ? s.branch.trim().toLowerCase().charAt(0) + "_" : "";
      return `${p}${s.rollNumber}` === fullRoll;
    });

    if (isDuplicateInForm) {
      setDuplicateErrors(prev => ({ ...prev, [index]: "Duplicate in form" }));
      return;
    }

    // 2. Check in database
    try {
      // Check students table
      const { data: activeData } = await supabase
        .from("students")
        .select("roll_number")
        .eq("roll_number", fullRoll)
        .maybeSingle();

      if (activeData) {
        setDuplicateErrors(prev => ({ ...prev, [index]: "Already exists in database" }));
        return;
      }

      // Check break_students table
      const { data: breakData } = await supabase
        .from("break_students")
        .select("roll_number")
        .eq("roll_number", fullRoll)
        .maybeSingle();

      if (breakData) {
        setDuplicateErrors(prev => ({ ...prev, [index]: "Exists in break list" }));
        return;
      }

      // If no duplicates found, clear error for this index
      setDuplicateErrors(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    } catch (err) {
      console.error("Duplicate check error:", err);
    }
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (Object.keys(duplicateErrors).length > 0) {
      alert("Please fix duplicate roll numbers before submitting.");
      return;
    }

    const formattedData = students.map((s) => {
      const prefix =
        s.branch && s.branch.trim() !== ""
          ? s.branch.trim().toLowerCase().charAt(0) + "_"
          : "";

      return {
        roll_number: `${prefix}${s.rollNumber}`,
        student_name: s.studentName,
        father_name: s.fatherName,
        mother_name: s.motherName,
        course: s.course,
        duration: s.duration || null,
        fee_month: s.feeMonth ? parseFloat(s.feeMonth) : null,
        phone_number: s.phoneNumber,
        addmission_date: s.admissionDate,
        branch: s.branch,
        batch_time: s.batchTime,
      };
    });

    const { error } = await supabase.from("students").insert(formattedData);

    if (error) {
      alert("Error adding students: " + error.message);
      console.error(error);
      return;
    }

    alert("Students added successfully!");
    await fetchStudents();

    setStudents([
      {
        rollNumber: "",
        studentName: "",
        fatherName: "",
        motherName: "",
        course: "",
        duration: "",
        feeMonth: "",
        phoneNumber: "",
        admissionDate: "",
        branch: branch?.toLowerCase() === "all" ? "main" : branch,
        batchTime: "",
      },
    ]);

    setOpen(false);
  };

  // DELETE FUNCTIONALITY
  const handleDelete = async (roll) => {
    if (!confirm(`Delete student ${roll}?`)) return;

    const tableName = showBreakStudents ? "break_students" : "students";

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("roll_number", roll);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }

    alert("Student deleted!");
    const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
    fetchStudents(activeBranch, 0, search, true);
  };

  const handleBreak = (student) => {
    setStudentForBreak(student);
    setBreakDates({ from: null, to: null });
    setBreakModalOpen(true);
  };

  const confirmBreak = async () => {
    if (!studentForBreak) return;

    try {
      setLoading(true);
      const fromDate = breakDates.from ? breakDates.from.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      const toDate = breakDates.to ? breakDates.to.toISOString().split("T")[0] : null;

      // Insert into break_students
      const { error: insertError } = await supabase
        .from("break_students")
        .insert([{
          roll_number: studentForBreak.roll_number,
          student_name: studentForBreak.student_name || "",
          father_name: studentForBreak.father_name || "",
          course: studentForBreak.course || "",
          duration: studentForBreak.duration || null,
          fee_month: studentForBreak.fee_month ? parseFloat(studentForBreak.fee_month) : null,
          branch: studentForBreak.branch || "",
          phone_number: studentForBreak.phone_number || "",
          addmission_date: studentForBreak.addmission_date || "",
          mother_name: studentForBreak.mother_name || "",
          batch_time: studentForBreak.batch_time || "",
          from: fromDate,
          to: toDate
        }]);

      if (insertError) {
        alert("Insert into break list failed: " + insertError.message);
        return;
      }

      // Delete from students
      const { error: deleteError } = await supabase
        .from("students")
        .delete()
        .eq("roll_number", studentForBreak.roll_number);

      if (deleteError) {
        alert("Deletion from active list failed: " + deleteError.message);
        return;
      }

      alert("Student moved to break list!");
      setBreakModalOpen(false);
      setStudentForBreak(null);
      const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
      fetchStudents(activeBranch, 0, search, true);
    } catch (err) {
      console.error(err);
      alert("An error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (student) => {
    if (!confirm(`Restore student ${student.student_name} (${student.roll_number}) to active list?`)) return;

    try {
      setLoading(true);
      // Insert into students
      const { error: insertError } = await supabase
        .from("students")
        .insert([{
          roll_number: student.roll_number,
          student_name: student.student_name || "",
          father_name: student.father_name || "",
          course: student.course || "",
          duration: student.duration || null,
          fee_month: student.fee_month ? parseFloat(student.fee_month) : null,
          branch: student.branch || "",
          phone_number: student.phone_number || "",
          addmission_date: student.addmission_date || "",
          mother_name: student.mother_name || "",
          batch_time: student.batch_time || ""
        }]);

      if (insertError) {
        alert("Restore to active list failed: " + insertError.message);
        return;
      }

      // Delete from break_students
      const { error: deleteError } = await supabase
        .from("break_students")
        .delete()
        .eq("roll_number", student.roll_number);

      if (deleteError) {
        alert("Deletion from break list failed: " + deleteError.message);
        return;
      }

      alert("Student restored to active list!");
      const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
      fetchStudents(activeBranch, 0, search, true);
    } catch (err) {
      console.error(err);
      alert("An error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBreakOver = async (student) => {
    if (!confirm(`Mark break as over for ${student.student_name} (${student.roll_number})?`)) return;

    try {
      setLoading(true);
      const { error } = await supabase.rpc("restore_break_student", {
        p_roll_number: student.roll_number
      });

      if (error) {
        alert("Break Over failed: " + error.message);
        return;
      }

      alert("Student restored via Break Over!");
      const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
      fetchStudents(activeBranch, 0, search, true);
    } catch (err) {
      console.error(err);
      alert("An error occurred: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    const tableName = showBreakStudents ? "break_students" : "students";
    const { error } = await supabase
      .from(tableName)
      .update({
        ...editForm,
        addmission_date: editForm.addmission_date,
      })
      .eq("roll_number", originalRoll);

    if (error) {
      alert("Update failed: " + error.message);
      return;
    }

    alert("Student updated!");
    console.log("ORIGINAL:", originalRoll);
    console.log("EDIT FORM:", editForm);
    setEditStudent(null);
    const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
    fetchStudents(activeBranch, 0, search, true);
  };

  // BULK ACTIONS
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedStudents.length} selected students?`)) return;

    const tableName = showBreakStudents ? "break_students" : "students";
    const { error } = await supabase
      .from(tableName)
      .delete()
      .in("roll_number", selectedStudents);

    if (error) {
      alert("Bulk delete failed: " + error.message);
      return;
    }

    alert("Selected students deleted!");
    setSelectedStudents([]);
    const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
    fetchStudents(activeBranch, 0, search, true);
  };

  const handleBulkBreak = async () => {
    if (!confirm(`Move ${selectedStudents.length} students to break list?`)) return;

    try {
      setLoading(true);
      const { data: selectedData, error: fetchError } = await supabase
        .from("students")
        .select("*")
        .in("roll_number", selectedStudents);

      if (fetchError) throw fetchError;

      const fromDate = new Date().toISOString().split("T")[0];
      const breakData = selectedData.map(student => ({
        roll_number: student.roll_number,
        student_name: student.student_name || "",
        father_name: student.father_name || "",
        course: student.course || "",
        duration: student.duration || null,
        fee_month: student.fee_month ? parseFloat(student.fee_month) : null,
        branch: student.branch || "",
        phone_number: student.phone_number || "",
        addmission_date: student.addmission_date || "",
        mother_name: student.mother_name || "",
        batch_time: student.batch_time || "",
        from: fromDate,
        to: null
      }));

      const { error: insertError } = await supabase
        .from("break_students")
        .insert(breakData);

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from("students")
        .delete()
        .in("roll_number", selectedStudents);

      if (deleteError) throw deleteError;

      alert("Students moved to break list!");
      setSelectedStudents([]);
      const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
      fetchStudents(activeBranch, 0, search, true);
    } catch (err) {
      console.error(err);
      alert("Bulk break failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRestore = async () => {
    if (!confirm(`Restore ${selectedStudents.length} students to active list?`)) return;

    try {
      setLoading(true);
      const { data: selectedData, error: fetchError } = await supabase
        .from("break_students")
        .select("*")
        .in("roll_number", selectedStudents);

      if (fetchError) throw fetchError;

      const restoreData = selectedData.map(student => ({
        roll_number: student.roll_number,
        student_name: student.student_name || "",
        father_name: student.father_name || "",
        course: student.course || "",
        duration: student.duration || null,
        fee_month: student.fee_month ? parseFloat(student.fee_month) : null,
        branch: student.branch || "",
        phone_number: student.phone_number || "",
        addmission_date: student.addmission_date || "",
        mother_name: student.mother_name || "",
        batch_time: student.batch_time || ""
      }));

      const { error: insertError } = await supabase
        .from("students")
        .insert(restoreData);

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from("break_students")
        .delete()
        .in("roll_number", selectedStudents);

      if (deleteError) throw deleteError;

      alert("Students restored to active list!");
      setSelectedStudents([]);
      const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
      fetchStudents(activeBranch, 0, search, true);
    } catch (err) {
      console.error(err);
      alert("Bulk restore failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkBreakOver = async () => {
    if (!confirm(`Mark break as over for ${selectedStudents.length} students?`)) return;

    try {
      setLoading(true);
      for (const roll of selectedStudents) {
        const { error } = await supabase.rpc("restore_break_student", {
          p_roll_number: roll
        });
        if (error) throw error;
      }

      alert("Selected students restored via Break Over!");
      setSelectedStudents([]);
      const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
      fetchStudents(activeBranch, 0, search, true);
    } catch (err) {
      console.error(err);
      alert("Bulk Break Over failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };


  const openViewModal = (student) => {
    setViewStudent(student);
  };

  const openUpdateModal = (student) => {
    setOriginalRoll(student.roll_number);
    setEditForm({
      roll_number: student.roll_number,
      student_name: student.student_name,
      father_name: student.father_name,
      mother_name: student.mother_name,
      course: student.course,
      duration: student.duration,
      fee_month: student.fee_month,
      phone_number: student.phone_number,
      addmission_date: student.addmission_date,
      branch: student.branch,
      batch_time: student.batch_time,
    });

    setEditStudent(student);
  };


  // Removed client-side search/grouping as it's not scalable for 1.2M rows.
  // Using server-side searching in fetchStudents instead.

  useEffect(() => {
    const delay = setTimeout(() => {
      const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
      fetchStudents(activeBranch, 0, search, true);
    }, 300);
    return () => clearTimeout(delay);
  }, [search, fetchStudents, branch, selectedBranch, showBreakStudents]);

  const fetchAllBranches = useCallback(async () => {
    const tableName = showBreakStudents ? "break_students" : "students";
    const { data, error } = await supabase
      .from(tableName)
      .select("branch", { distinct: true });


    if (error) {
      console.error(error);
      return;
    }

    const uniqueBranches = [...new Set(data.map(b => b.branch))];
    setAllBranches(uniqueBranches);
  }, [showBreakStudents]);

  useEffect(() => {
    if (branch?.toLowerCase() === "all") {
      fetchAllBranches();
    }
  }, [branch, fetchAllBranches, showBreakStudents]);

  // Pagination effect removed as it's now handled by the branch/fetch effect above.


  return (
    <div className="p-2 sm:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* Top header */}
      <div className="px-2 sm:px-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
        <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">Students</h1>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
          <Button
            onClick={() => setOpen(true)}
            icon={() => (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
            className="order-2 sm:order-1"
          >
            Add Students
          </Button>

          <div className="w-full sm:w-80 order-1 sm:order-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
                fetchStudents(activeBranch, 0, search, true);
              }}
            >
              <Input
                placeholder={showBreakStudents ? "Search in break list..." : "Search by name or roll..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={() => (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              />
            </form>
          </div>

        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Branch:</label>
            {branch?.toLowerCase() === "all" ? (
              <select
                className="flex-1 sm:flex-none border rounded-lg px-3 py-2 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500 transition"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="all">All Branches</option>
                {allBranches.map((b) => (
                  <option value={b} key={b}>{b.toUpperCase()}</option>
                ))}
              </select>
            ) : (
              <div className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full uppercase tracking-wider">{branch}</div>
            )}
          </div>

          <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
            <input
              type="checkbox"
              id="breakFilter"
              checked={showBreakStudents}
              onChange={(e) => setShowBreakStudents(e.target.checked)}
              className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="breakFilter" className="text-sm font-bold text-orange-700 cursor-pointer select-none">
              Break Students
            </label>
          </div>
        </div>

        <div className="text-xs md:text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
          <span>{totalCount} total students</span>
        </div>
      </div>

      {/* Add form (modal-like panel) */}
      {open && (
        <Card className="animate-in slide-in-from-top-4 duration-300">
          <CardHeader
            title="New Student Entry"
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
                    <Input label="Student Name" value={s.studentName.toUpperCase()} onChange={(e) => handleChange(index, "studentName", e.target.value)} required />
                    <Input label="Father Name" value={s.fatherName.toUpperCase()} onChange={(e) => handleChange(index, "fatherName", e.target.value)} />
                    <Input label="Mother Name" value={s.motherName.toUpperCase()} onChange={(e) => handleChange(index, "motherName", e.target.value)} />
                    <Input label="Course" value={s.course.toUpperCase()} onChange={(e) => handleChange(index, "course", e.target.value)} required />
                    <Input label="Duration" value={s.duration} onChange={(e) => handleChange(index, "duration", e.target.value)} />
                    <Input label="Fee/Month" value={s.feeMonth} onChange={(e) => handleChange(index, "feeMonth", e.target.value)} />
                    <Input label="Phone Number" value={s.phoneNumber} onChange={(e) => handleChange(index, "phoneNumber", e.target.value)} />

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">Admission Date</label>
                      <DatePicker
                        selected={s.admissionDate ? new Date(s.admissionDate) : null}
                        onChange={(date) => {
                          const iso = date ? date.toISOString().split("T")[0] : "";
                          handleChange(index, "admissionDate", iso);
                        }}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Select Date"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-purple-500 transition outline-none"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                      />
                    </div>

                    <Input
                      label="Branch"
                      value={s.branch.toLowerCase()}
                      onChange={(e) => handleChange(index, "branch", e.target.value.toLowerCase())}
                      required
                      readOnly={branch?.toLowerCase() !== "all"}
                      className={branch?.toLowerCase() !== "all" ? "opacity-75" : ""}
                    />
                    <BatchTimePicker
                      label="Batch Time"
                      value={s.batchTime}
                      onChange={(val) => handleChange(index, "batchTime", val)}
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

      {/* Student Table Area */}
      <div className="mt-8 space-y-8">
        <Card noPadding className="border border-gray-100 shadow-sm transition-all duration-300">
          <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-800 tracking-tight">Student List</h3>
            <div className="flex gap-2">
              <Badge variant="purple">{studentList.length} shown</Badge>
            </div>
          </div>

          {selectedStudents.length > 0 && (
            <div className="mx-6 my-4 flex items-center justify-between bg-purple-50 border border-purple-100 p-4 rounded-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                  {selectedStudents.length} Selected
                </span>
                <span className="text-sm font-medium text-purple-950">Bulk Actions:</span>
              </div>
              <div className="flex gap-2">
                {showBreakStudents ? (
                  <>
                    <Button size="sm" variant="secondary" className="bg-white text-green-600 border-green-100 hover:bg-green-50" onClick={handleBulkRestore}>Bulk Restore</Button>
                    <Button size="sm" variant="secondary" className="bg-white text-orange-600 border-orange-100 hover:bg-orange-50" onClick={handleBulkBreakOver}>Bulk Break Over</Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="secondary" className="bg-white text-orange-600 border-orange-100 hover:bg-orange-50" onClick={handleBulkBreak}>Bulk Break</Button>
                  </>
                )}
                <Button size="sm" variant="danger" className="text-xs font-bold" onClick={handleBulkDelete}>Delete All</Button>
                <button
                  onClick={() => setSelectedStudents([])}
                  className="text-xs text-purple-400 hover:text-purple-600 font-medium px-2 py-1 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          <Table>


            <THead>
              <TR className="hover:bg-transparent">
                <TH className="w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                    checked={studentList.length > 0 && selectedStudents.length === studentList.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents(studentList.map(s => s.roll_number));
                      } else {
                        setSelectedStudents([]);
                      }
                    }}
                  />
                </TH>
                <TH>Roll</TH>
                <TH>Name</TH>
                <TH>Father</TH>
                <TH>Course</TH>
                <TH>Batch</TH>
                <TH>Actions</TH>

              </TR>
            </THead>

            <TBody>
              {studentList.map((s) => (
                <TR key={s.roll_number} className={selectedStudents.includes(s.roll_number) ? "bg-purple-50/50" : ""}>
                  <TD className="px-6">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                      checked={selectedStudents.includes(s.roll_number)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudents([...selectedStudents, s.roll_number]);
                        } else {
                          setSelectedStudents(selectedStudents.filter(id => id !== s.roll_number));
                        }
                      }}
                    />
                  </TD>
                  <TD className="font-bold text-gray-900 px-6">{s.roll_number}</TD>

                  <TD className="font-medium text-gray-700 px-6">
                    <span className="inline-flex items-center gap-0.5">
                      {s.student_name}
                      <NoteTooltip
                        note={s.notes}
                        rollNumber={s.roll_number}
                        onNoteSaved={(newNote) =>
                          setStudentList((prev) =>
                            prev.map((x) =>
                              x.roll_number === s.roll_number ? { ...x, notes: newNote } : x
                            )
                          )
                        }
                      />
                    </span>
                  </TD>
                  <TD className="text-gray-500 px-6">{s.father_name}</TD>
                  <TD className="px-6">
                    <Badge variant="blue">{s.course}</Badge>
                  </TD>
                  <TD className="text-gray-500 px-6">{s.batch_time || "-"}</TD>
                  <TD className="px-6">
                    <div className="flex flex-wrap gap-1.5">
                      {showBreakStudents ? (
                        <>
                          <Button size="sm" variant="secondary" className="bg-green-50 text-green-600 hover:bg-green-100" onClick={() => handleRestore(s)}>Restore</Button>
                          <Button size="sm" variant="secondary" className="bg-orange-50 text-orange-600 hover:bg-orange-100" onClick={() => handleBreakOver(s)}>Break Over</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={() => openViewModal(s)}>View</Button>
                          <Button size="sm" variant="secondary" className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100" onClick={() => openUpdateModal(s)}>Edit</Button>
                          <Button size="sm" variant="secondary" className="bg-orange-50 text-orange-600 hover:bg-orange-100" onClick={() => handleBreak(s)}>Break</Button>
                          <Button size="sm" variant="success" onClick={() => navigate("/portal/fees", { state: { roll: s.roll_number, fromStudents: true } })}>Fees</Button>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(s.roll_number)}>Del</Button>
                        </>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}

              {studentList.length === 0 && (
                <TR>
                  <TD colSpan={6} className="py-12 text-center text-gray-400 font-medium italic px-6">
                    No students found.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </Card>
      </div>

      {/* UPDATE MODAL */}
      <Modal
        isOpen={!!editStudent}
        onClose={() => setEditStudent(null)}
        title="Update Student Details"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditStudent(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Roll Number" value={editForm.roll_number} onChange={(e) => setEditForm({ ...editForm, roll_number: e.target.value })} />
          <Input label="Student Name" value={editForm.student_name} onChange={(e) => setEditForm({ ...editForm, student_name: e.target.value })} />
          <Input label="Father Name" value={editForm.father_name} onChange={(e) => setEditForm({ ...editForm, father_name: e.target.value })} />
          <Input label="Mother Name" value={editForm.mother_name} onChange={(e) => setEditForm({ ...editForm, mother_name: e.target.value })} />
          <Input label="Course" value={editForm.course} onChange={(e) => setEditForm({ ...editForm, course: e.target.value })} />
          <BatchTimePicker
            label="Batch Time"
            value={editForm.batch_time}
            onChange={(val) => setEditForm({ ...editForm, batch_time: val })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration" value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} />
            <Input label="Fee/Month" value={editForm.fee_month} onChange={(e) => setEditForm({ ...editForm, fee_month: e.target.value })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">Admission Date</label>
            <DatePicker
              selected={editForm.addmission_date ? (editForm.addmission_date.includes('-') ? new Date(editForm.addmission_date) : new Date(editForm.addmission_date.split('/').reverse().join('-'))) : null}
              onChange={(date) => setEditForm({ ...editForm, addmission_date: date ? date.toLocaleDateString('en-GB') : "" })}
              dateFormat="dd/MM/yyyy"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-purple-500 transition outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* BREAK MODAL */}
      <Modal
        isOpen={breakModalOpen}
        onClose={() => setBreakModalOpen(false)}
        title="Put Student on Break"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBreakModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmBreak}>Confirm Break</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select the break period for <strong>{studentForBreak?.student_name}</strong>.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">Break From</label>
            <DatePicker
              selected={breakDates.from}
              onChange={(date) => setBreakDates({ ...breakDates, from: date })}
              dateFormat="dd/MM/yyyy"
              placeholderText="AUTO (Today)"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-purple-500 transition outline-none"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">Break To</label>
            <DatePicker
              selected={breakDates.to}
              onChange={(date) => setBreakDates({ ...breakDates, to: date })}
              dateFormat="dd/MM/yyyy"
              placeholderText="AUTO (Indefinite)"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-purple-500 transition outline-none"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
            />
          </div>
        </div>
      </Modal>

      {/* VIEW MODAL */}
      <Modal
        isOpen={!!viewStudent}
        onClose={() => setViewStudent(null)}
        title="Student Information"
      >
        {viewStudent && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <DetailRow label="Roll Number" value={viewStudent.roll_number} />
              <DetailRow label="Full Name" value={viewStudent.student_name} />
              <DetailRow label="Course" value={viewStudent.course} />
              <DetailRow label="Duration" value={viewStudent.duration} />
              <DetailRow label="Batch Time" value={viewStudent.batch_time} />
              <DetailRow label="Monthly Fee" value={`₹${viewStudent.fee_month}`} />
              <DetailRow label="Admission" value={viewStudent.addmission_date} />
              <DetailRow label="Branch" value={viewStudent.branch} />
              <DetailRow label="Father Name" value={viewStudent.father_name} />
              <DetailRow label="Mother Name" value={viewStudent.mother_name} />
              <DetailRow label="Phone" value={viewStudent.phone_number} />
            </div>
            <Button variant="secondary" className="w-full mt-4" onClick={() => setViewStudent(null)}>Close</Button>
          </div>
        )}
      </Modal>

      {hasMore && (
        <div className="p-8 text-center">
          <Button
            variant="secondary"
            onClick={() => {
              const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
              fetchStudents(activeBranch, page, search, false);
            }}
            loading={loading}
          >
            {loading ? "Loading..." : "Load More Students"}
          </Button>
        </div>
      )}
    </div >
  );
}


function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between border-b border-gray-50 pb-2 gap-1 group">
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold text-gray-800 group-hover:text-purple-600 transition-colors">{value || "-"}</span>
    </div>
  );
}
