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
      branch: branch?.toLowerCase() === "all" ? "" : branch,
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

  // Fetch Students
  const fetchStudents = useCallback(async (branchToUse, pageToLoad = 0, searchTerm = "", reset = false) => {
    setLoading(true);

    try {
      const from = pageToLoad * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("students")
        .select("*", { count: "exact" })
        .range(from, to)
        .order("roll_number", { ascending: false });

      if (branchToUse && branchToUse !== "all") {
        query = query.eq("branch", branchToUse.toLowerCase());
      }

      if (searchTerm.trim()) {
        query = query.or(`roll_number.ilike.%${searchTerm}%,student_name.ilike.%${searchTerm}%`);
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
  }, [pageSize]);


  useEffect(() => {
    if (branch !== null && branch !== undefined) {
      const activeBranch = branch?.toLowerCase() === "all" ? selectedBranch : branch;
      fetchStudents(activeBranch, 0, search, true);
    }
  }, [branch, selectedBranch, fetchStudents]);


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
        branch: branch?.toLowerCase() === "all" ? "" : branch,
        batchTime: "",
      },
    ]);
  };
  const handleRemoveRow = (index) => {
    // prevent removing the last row
    if (students.length === 1) return;

    setStudents(students.filter((_, i) => i !== index));
  };


  // Form Change
  const handleChange = (index, field, value) => {
    const newStudents = [...students];
    newStudents[index][field] = value;
    setStudents(newStudents);
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();

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
        branch: branch?.toLowerCase() === "all" ? "" : branch,
        batchTime: "",
      },
    ]);

    setOpen(false);
  };

  // DELETE FUNCTIONALITY
  const handleDelete = async (roll) => {
    if (!confirm(`Delete student ${roll}?`)) return;

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("roll_number", roll);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }

    alert("Student deleted!");
    fetchStudents();
  };

  const handleUpdate = async () => {
    const { error } = await supabase
      .from("students")
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
    fetchStudents();
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
  }, [search, fetchStudents, branch, selectedBranch]);

  const fetchAllBranches = useCallback(async () => {
    const { data, error } = await supabase
      .from("students")
      .select("branch", { distinct: true });


    if (error) {
      console.error(error);
      return;
    }

    const uniqueBranches = [...new Set(data.map(b => b.branch))];
    setAllBranches(uniqueBranches);
  }, []);

  useEffect(() => {
    if (branch?.toLowerCase() === "all") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAllBranches();
    }
  }, [branch, fetchAllBranches]);

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
                placeholder="Search by name or roll..."
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
                    <Input label="Roll Number" value={s.rollNumber} onChange={(e) => handleChange(index, "rollNumber", e.target.value)} required />
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
                    <Input label="Batch Time" value={s.batchTime} onChange={(e) => handleChange(index, "batchTime", e.target.value)} />
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

          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Roll</TH>
                <TH>Name</TH>
                <TH className="hidden md:table-cell">Father</TH>
                <TH className="hidden sm:table-cell">Course</TH>
                <TH className="hidden lg:table-cell">Batch</TH>
                <TH>Actions</TH>
              </TR>
            </THead>

            <TBody>
              {studentList.map((s) => (
                <TR key={s.roll_number}>
                  <TD className="font-bold text-gray-900 px-6">{s.roll_number}</TD>
                  <TD className="font-medium text-gray-700 px-6">{s.student_name}</TD>
                  <TD className="text-gray-500 hidden md:table-cell px-6">{s.father_name}</TD>
                  <TD className="hidden sm:table-cell px-6">
                    <Badge variant="blue">{s.course}</Badge>
                  </TD>
                  <TD className="text-gray-500 hidden lg:table-cell px-6">{s.batch_time || "-"}</TD>
                  <TD className="px-6">
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={() => openViewModal(s)}>View</Button>
                      <Button size="sm" variant="secondary" className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100" onClick={() => openUpdateModal(s)}>Edit</Button>
                      <Button size="sm" variant="success" onClick={() => navigate("/portal/fees", { state: { roll: s.roll_number, fromStudents: true } })}>Fees</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(s.roll_number)}>Del</Button>
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
          <Input label="Batch Time" value={editForm.batch_time} onChange={(e) => setEditForm({ ...editForm, batch_time: e.target.value })} />

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
