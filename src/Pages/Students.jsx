import React, { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Polished Students component - "Option C" - professional dashboard UI
// Uses Tailwind classes, improved spacing, subtle shadows, and cleaner table.
// Keep your existing Supabase operations and logic; only UI and structure updated.

export default function Students() {
  const { branch } = useAuth();
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
    },
  ]);

  const [studentList, setStudentList] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("all");
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
    admission_date: "",
    branch: "",
  });

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
  const fetchStudents = async () => {
    try {
      let query = supabase
        .from("students")
        .select("*")
        .order("roll_number", { ascending: true });

      if (branch && branch.toLowerCase() !== "all") {
        query = query.eq("branch", branch);
      }

      const { data, error } = await query;
      if (error) console.error("Fetch error:", error);
      else setStudentList(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (branch !== null && branch !== undefined) {
      fetchStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

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
      },
    ]);
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
      .update(editForm)
      .eq("roll_number", editForm.roll_number);

    if (error) {
      alert("Update failed: " + error.message);
      return;
    }

    alert("Student updated!");
    setEditStudent(null);
    fetchStudents();
  };

  const openViewModal = (student) => {
    setViewStudent(student);
  };

  const openUpdateModal = (student) => {
    setEditForm({
      roll_number: student.roll_number,
      student_name: student.student_name,
      father_name: student.father_name,
      mother_name: student.mother_name,
      course: student.course,
      duration: student.duration,
      fee_month: student.fee_month,
      phone_number: student.phone_number,
      admission_date: student.admission_date,
      branch: student.branch,
    });

    setEditStudent(student);
  };

  // Grouping & filtering
  const filteredList = studentList.filter((s) => {
    if (!search.trim()) return true;

    const text = search.toLowerCase();

    return (
      s.roll_number.toLowerCase().includes(text) ||
      s.student_name.toLowerCase().includes(text)
    );
  });

  const grouped = filteredList.reduce((acc, student) => {
    const br = student.branch || "main";
    if (!acc[br]) acc[br] = [];
    acc[br].push(student);
    return acc;
  }, {});
  const br = branch?.toLowerCase();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Top header */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-extrabold text-gray-900">Add and View Students</h1>

        <div className="flex items-center gap-3">
          <button
            className="px-5 py-2 bg-black text-white rounded-full shadow-md hover:shadow-lg transition"
            onClick={() => setOpen(true)}
          >
            Add Students
          </button>

          <div className="w-80">
            <input
              type="text"
              className="w-full rounded-full border px-4 py-2 shadow-inner bg-white"
              placeholder="Search by Roll Number or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value.toLowerCase())}
            />
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Branch</label>
          {branch?.toLowerCase() === "all" ? (
            <select
              className="border rounded-lg px-3 py-2"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="all">All Branches</option>
              {Object.keys(grouped).map((g) => (
                <option value={g} key={g}>
                  {g.toUpperCase()}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-gray-600">{branch}</div>
          )}
        </div>

        <div className="text-sm text-gray-500">{studentList.length} students</div>
      </div>

      {/* Add form (modal-like panel) */}
      {open && (
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {students.map((s, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 items-center"
              >
                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Roll Number"
                  value={s.rollNumber}
                  onChange={(e) => handleChange(index, "rollNumber", e.target.value)}
                  required
                />

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Student Name"
                  value={s.studentName}
                  onChange={(e) => handleChange(index, "studentName", e.target.value)}
                  required
                />

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Father Name"
                  value={s.fatherName}
                  onChange={(e) => handleChange(index, "fatherName", e.target.value)}
                />

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Mother Name"
                  value={s.motherName}
                  onChange={(e) => handleChange(index, "motherName", e.target.value)}
                />

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Course"
                  value={s.course}
                  onChange={(e) => handleChange(index, "course", e.target.value)}
                  required
                />

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Duration"
                  value={s.duration}
                  onChange={(e) => handleChange(index, "duration", e.target.value)}
                />

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Fee/Month"
                  value={s.feeMonth}
                  onChange={(e) => handleChange(index, "feeMonth", e.target.value)}
                />

                <input
                  className="border rounded-lg px-3 py-2"
                  placeholder="Phone Number"
                  value={s.phoneNumber}
                  onChange={(e) => handleChange(index, "phoneNumber", e.target.value)}
                />

                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                  <DatePicker
                    selected={s.admissionDate ? new Date(s.admissionDate) : null}
                    onChange={(date) => {
                      const iso = date ? date.toISOString().split("T")[0] : "";
                      handleChange(index, "admissionDate", iso);
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Admission Date"
                    className="w-full border rounded-lg px-3 py-2"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                  />
                </div>

                <input
                  className={`border rounded-lg px-3 py-2 ${branch?.toLowerCase() !== "all" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  placeholder="Branch"
                  value={s.branch}
                  onChange={(e) => handleChange(index, "branch", e.target.value.toLowerCase())}
                  required
                  readOnly={branch?.toLowerCase() !== "all"}
                />
              </div>
            ))}

            <div className="flex items-center gap-3">
              <button type="button" onClick={handleAddRow} className="px-4 py-2 bg-gray-100 rounded-lg">
                + Add Row
              </button>

              <div className="flex-1" />

              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg">
                Cancel
              </button>

              <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg shadow">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Student Table Area */}
      <div className="mt-8 space-y-8">
        {(branch?.toLowerCase() === "all" ? Object.keys(grouped) : [br || "main"]).filter(Boolean).map((branchKey) => {
          if (selectedBranch !== "all" && selectedBranch !== branchKey) return null;

          const rows = grouped[branchKey] || [];

          return (
            <div key={branchKey} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">{branchKey.toUpperCase()} Branch</h3>
                <div className="text-sm text-gray-500">{rows.length} students</div>
              </div>

              <div className="p-4 overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="text-left text-sm text-gray-600">
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Fee/Month</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((s) => (
                      <tr key={s.roll_number} className="border-t last:border-b hover:bg-gray-50">
                        <td className="py-3 px-4 align-top">{s.roll_number}</td>
                        <td className="py-3 px-4 align-top">{s.student_name}</td>
                        <td className="py-3 px-4 align-top">{s.course}</td>
                        <td className="py-3 px-4 align-top">{s.fee_month || "-"}</td>
                        <td className="py-3 px-4 align-top">{s.duration || "-"}</td>
                        <td className="py-3 px-4 align-top">
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1 rounded-full bg-blue-600 text-white text-sm shadow-sm hover:opacity-95"
                              onClick={() => openViewModal(s)}
                            >
                              View
                            </button>

                            <button
                              className="px-3 py-1 rounded-full bg-yellow-500 text-white text-sm shadow-sm hover:opacity-95"
                              onClick={() => openUpdateModal(s)}
                            >
                              Update
                            </button>

                            <button
                              className="px-3 py-1 rounded-full bg-red-600 text-white text-sm shadow-sm hover:opacity-95"
                              onClick={() => handleDelete(s.roll_number)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {rows.length === 0 && (
                      <tr>
                        <td className="py-8 px-4 text-center text-gray-400" colSpan={6}>
                          No students found for this branch.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* UPDATE MODAL */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-3">Update Student</h2>

            <div className="space-y-3">
              <input className="border rounded-lg px-3 py-2 w-full"
                value={editForm.student_name}
                onChange={(e) => setEditForm({ ...editForm, student_name: e.target.value })}
              />

              <input className="border rounded-lg px-3 py-2 w-full"
                value={editForm.father_name}
                onChange={(e) => setEditForm({ ...editForm, father_name: e.target.value })}
              />

              <input className="border rounded-lg px-3 py-2 w-full"
                value={editForm.mother_name}
                onChange={(e) => setEditForm({ ...editForm, mother_name: e.target.value })}
              />

              <input className="border rounded-lg px-3 py-2 w-full"
                value={editForm.course}
                onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
              />

              <div className="flex gap-2">
                <input className="border rounded-lg px-3 py-2 flex-1"
                  value={editForm.duration}
                  onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                />

                <input className="border rounded-lg px-3 py-2 w-32"
                  value={editForm.fee_month}
                  onChange={(e) => setEditForm({ ...editForm, fee_month: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 w-full bg-green-600 text-white p-2 rounded-lg"
                  onClick={handleUpdate}
                >
                  Save Changes
                </button>

                <button
                  className="flex-1 w-full bg-gray-200 p-2 rounded-lg"
                  onClick={() => setEditStudent(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MORE MODAL */}
      {viewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-lg">
            <h2 className="text-xl font-bold mb-3">Student Details</h2>

            <div className="space-y-2 text-gray-700">
              <div><span className="font-medium">Name:</span> {viewStudent.student_name}</div>
              <div><span className="font-medium">Father:</span> {viewStudent.father_name}</div>
              <div><span className="font-medium">Mother:</span> {viewStudent.mother_name}</div>
              <div><span className="font-medium">Course:</span> {viewStudent.course}</div>
              <div><span className="font-medium">Duration:</span> {viewStudent.duration}</div>
              <div><span className="font-medium">Phone:</span> {viewStudent.phone_number}</div>
              <div><span className="font-medium">Admission Date:</span> {viewStudent.addmission_date}</div>
            </div>

            <button
              className="w-full bg-gray-200 p-2 rounded-lg mt-4"
              onClick={() => setViewStudent(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
