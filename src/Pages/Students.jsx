import React, { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";

export default function Students() {
  const { branch } = useAuth();

  const [students, setStudents] = useState([
    {
      rollNumber: "",
      studentName: "",
      fatherName: "",
      course: "",
      duration: "",
      feeMonth: "",
      branch: branch?.toLowerCase() === "all" ? "" : branch,
    },
  ]);

  const [studentList, setStudentList] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("all");

  // Fetch Students
  const fetchStudents = async () => {
    let query = supabase
      .from("students")
      .select("*")
      .order("roll_number", { ascending: true });

    if (branch && branch.toLowerCase() !== "all") {
      query = query.eq("branch", branch);
    }

    const { data, error } = await query;
    if (error) console.error("Fetch error:", error);
    else setStudentList(data);
  };

  useEffect(() => {
    if (branch !== null && branch !== undefined) {
      fetchStudents();
    }
  }, [branch]);

  // Add Form Row
  const handleAddRow = () => {
    setStudents([
      ...students,
      {
        rollNumber: "",
        studentName: "",
        fatherName: "",
        course: "",
        duration: "",
        feeMonth: "",
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
        course: s.course,
        duration: s.duration || null,
        fee_month: s.feeMonth ? parseFloat(s.feeMonth) : null,
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
        course: "",
        duration: "",
        feeMonth: "",
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

  // Grouping
  const grouped = studentList.reduce((acc, student) => {
    const br = student.branch;
    if (!acc[br]) acc[br] = [];
    acc[br].push(student);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <button
        className="px-6 py-2 bg-black text-white rounded-xl"
        onClick={() => setOpen(true)}
      >
        Add Students
      </button>

      {open && (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {students.map((s, index) => (
            <div key={index} className="grid grid-cols-4 gap-3">
              <input
                className="border p-2"
                placeholder="Roll Number"
                value={s.rollNumber}
                onChange={(e) => handleChange(index, "rollNumber", e.target.value)}
                required
              />

              <input
                className="border p-2"
                placeholder="Student Name"
                value={s.studentName.toLowerCase()}
                onChange={(e) => handleChange(index, "studentName", e.target.value)}
                required
              />

              <input
                className="border p-2"
                placeholder="Father Name"
                value={s.fatherName.toLowerCase()}
                onChange={(e) => handleChange(index, "fatherName", e.target.value)}
                required
              />

              <input
                className="border p-2"
                placeholder="Course"
                value={s.course.toLowerCase()}
                onChange={(e) => handleChange(index, "course", e.target.value)}
                required
              />

              <input
                className="border p-2"
                placeholder="Duration (optional)"
                value={s.duration}
                onChange={(e) => handleChange(index, "duration", e.target.value)}
              />

              <input
                className="border p-2"
                placeholder="Fee/Month (optional)"
                value={s.feeMonth}
                onChange={(e) => handleChange(index, "feeMonth", e.target.value)}
              />

              <input
                className={`border p-2 ${
                  branch?.toLowerCase() !== "all"
                    ? "bg-gray-200 cursor-not-allowed"
                    : ""
                }`}
                placeholder="Branch"
                value={s.branch}
                onChange={(e) =>
                  handleChange(index, "branch", e.target.value.toLowerCase())
                }
                required
                readOnly={branch?.toLowerCase() !== "all"}
              />
            </div>
          ))}

          <button
            type="button"
            className="px-4 py-1 bg-gray-200 rounded-lg"
            onClick={handleAddRow}
          >
            + Add Row
          </button>

          <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg">
            Save
          </button>
        </form>
      )}

      {/* Student Table */}
      <div className="mt-10">
        {branch?.toLowerCase() === "all" && (
          <div className="mb-4">
            <select
              className="border p-2 rounded-lg"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="all">All Branches</option>
              <option value="main">Main</option>
              <option value="second">Second</option>
              <option value="third">Third</option>
            </select>
          </div>
        )}

        {branch?.toLowerCase() === "all"
          ? Object.keys(grouped)
              .filter(
                (br) =>
                  selectedBranch === "all" ||
                  br.toLowerCase() === selectedBranch
              )
              .map((br) => (
                <div key={br} className="mb-10">
                  <h2 className="text-xl font-bold mb-3">
                    {br.toUpperCase()} Branch
                  </h2>

                  <table className="w-full border rounded-xl overflow-hidden">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left">Roll No</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Father</th>
                        <th className="p-3 text-left">Course</th>
                        <th className="p-3 text-left">Duration</th>
                        <th className="p-3 text-left">Fee/Month</th>
                        <th className="p-3 text-left">Branch</th>
                        <th className="p-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[br].map((s) => (
                        <tr
                          key={s.roll_number}
                          className="border-t hover:bg-gray-50"
                        >
                          <td className="p-3">{s.roll_number}</td>
                          <td className="p-3">{s.student_name}</td>
                          <td className="p-3">{s.father_name}</td>
                          <td className="p-3">{s.course}</td>
                          <td className="p-3">{s.duration || "-"}</td>
                          <td className="p-3">{s.fee_month || "-"}</td>
                          <td className="p-3">{s.branch}</td>

                          {/* DELETE BUTTON */}
                          <td className="p-3">
                            <button
                              className="px-3 py-1 bg-red-600 text-white rounded-lg"
                              onClick={() => handleDelete(s.roll_number)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
          : (
            <table className="w-full border rounded-xl overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Roll No</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Father</th>
                  <th className="p-3 text-left">Course</th>
                  <th className="p-3 text-left">Duration</th>
                  <th className="p-3 text-left">Fee/Month</th>
                  <th className="p-3 text-left">Branch</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentList.map((s) => (
                  <tr
                    key={s.roll_number}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-3">{s.roll_number}</td>
                    <td className="p-3">{s.student_name}</td>
                    <td className="p-3">{s.father_name}</td>
                    <td className="p-3">{s.course}</td>
                    <td className="p-3">{s.duration || "-"}</td>
                    <td className="p-3">{s.fee_month || "-"}</td>
                    <td className="p-3">{s.branch}</td>

                    {/* DELETE BUTTON */}
                    <td className="p-3">
                      <button
                        className="px-3 py-1 bg-red-600 text-white rounded-lg"
                        onClick={() => handleDelete(s.roll_number)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
