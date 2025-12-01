import React, { useEffect, useState } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";

export default function Status() {
  const today = new Date().toISOString().split("T")[0];

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    roll: "",
    student: "",
    father: "",
    amount: "",
    receipt: "",
    paidOn: today,
  });

  const { branch } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState(branch === "all" ? "main" : branch);

  // ----------------------------------------------------
  // LOAD ALL STUDENTS ONCE (NOT EVERY MODAL OPEN)
  // ----------------------------------------------------
  useEffect(() => {
    supabase.from("students").select("*").then(({ data }) => {
      if (data) setStudents(data);
    });
  }, []);

  // ----------------------------------------------------
  // LOAD STATUS DATA
  // ----------------------------------------------------
  async function fetchStatus(branchToUse) {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        "https://pgvwjskubfonmirtaodo.supabase.co/functions/v1/status",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branch: branchToUse }),
        }
      );

      const data = await res.json();
      console.log(data)

      if (!data.success) throw new Error(data.error || "Failed to load");

      setRows(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fetch on mount
  useEffect(() => {
    fetchStatus(selectedBranch);
  }, []);

  // If admin selects another branch
  useEffect(() => {
    if (branch === "all") fetchStatus(selectedBranch);
  }, [selectedBranch]);

  // ----------------------------------------------------
  // FORM CHANGE HANDLER
  // ----------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "roll") {
      const s = students.find((x) => String(x.roll_number) === value);
      if (s) {
        setForm({
          roll: value,
          student: s.student_name,
          father: s.father_name,
          amount: s.fee_month,
          receipt: "",
          paidOn: today,
        });
      }
    }
  };

  // ----------------------------------------------------
  // SUBMIT PAYMENT
  // ----------------------------------------------------
  const handleSubmit = async () => {
    const [y, m, d] = form.paidOn.split("-");
    const formattedDate = `${d}/${m}/${y}`;

    const { error } = await supabase.from("transaction").insert({
      roll_no: form.roll,
      student_name: form.student,
      father_name: form.father,
      amount_paid: form.amount,
      receipt_no: form.receipt,
      paid_on: formattedDate,
    });

    if (error) return alert("Failed to add transaction!");

    // Close modal + reset
    setOpen(false);
    setForm({
      roll: "",
      student: "",
      father: "",
      amount: "",
      receipt: "",
      paidOn: today,
    });

    // Refresh the status table
    fetchStatus(selectedBranch);
  };

  return (
    <div className="p-8 text-black">
      <h1 className="text-4xl font-bold mb-6">Fees Status</h1>

      {/* Branch Selector */}
      {branch === "all" && (
        <div className="mb-6">
          <label className="mr-3">Select Branch:</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="border px-3 py-2 rounded"
          >
            <option value="main">Main</option>
            <option value="second">Second</option>
            <option value="third">Third</option>
          </select>
        </div>
      )}

      {/* Loading & Error */}
      {loading && <div className="text-lg">Loading...</div>}
      {error && <div className="text-red-600 text-lg">{error}</div>}

      {/* TABLE */}
      {!loading && !error && (
        <div className="overflow-x-auto shadow-lg rounded-lg">
          <table className="min-w-full border bg-white">
            <thead className="bg-purple-700 text-white">
              <tr>
                <th className="px-6 py-3">Roll No</th>
                <th className="px-6 py-3">Student Name</th>
                <th className="px-6 py-3">Total Expected</th>
                <th className="px-6 py-3">Total Paid</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, i) => {
                const s = students.find((x) => x.roll_number === r.roll_number);

                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                    <td className="px-6 py-3">{r.roll_number}</td>
                    <td className="px-6 py-3">{r.student_name}</td>
                    <td className="px-6 py-3">₹{r.expected_total}</td>
                    <td className="px-6 py-3">₹{r.total_paid}</td>

                    <td
                      className={`px-6 py-3 font-semibold ${r.status.includes("UP")
                        ? "text-green-600"
                        : "text-red-600"
                        }`}
                    >
                      {r.status}
                    </td>

                    <td className="px-6 py-3">
                      {!r.status.includes("UP") && (
                        <button
                          className="px-3 py-1 bg-purple-600 text-white rounded-full"
                          onClick={() => {
                            setForm({
                              roll: r.roll_number,
                              student: r.student_name,
                              father: s?.father_name || "",
                              amount: s?.fee_month || "",
                              receipt: "",
                              paidOn: today,
                            });
                            setOpen(true);
                          }}
                        >
                          Pay
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center">
          <div className="bg-white p-6 rounded-2xl w-80">
            <h2 className="text-lg font-semibold mb-4">Fees Payment</h2>

            {["roll", "student", "father"].map((f) => (
              <input
                key={f}
                name={f}
                value={form[f]}
                placeholder={f}
                className="w-full p-2 mb-2 bg-gray-100 rounded-md border"
                onChange={handleChange}
                readOnly={f !== "roll"}
              />
            ))}

            <div className="w-full mb-2 relative">
              <span className="absolute left-2 top-2.5 text-black">₹</span>
              <input
                name="amount"
                placeholder="Amount"
                type="number"
                value={form.amount}
                className="w-full pl-7 p-2 bg-gray-100 text-black rounded-md border border-purple-700"
                onChange={handleChange}
              />
            </div>


            <input
              name="receipt"
              value={form.receipt}
              placeholder="Receipt Number"
              className="w-full p-2 mb-2 bg-gray-100 rounded-md border"
              onChange={handleChange}
            />

            <input
              name="paidOn"
              type="date"
              value={form.paidOn}
              className="w-full p-2 mb-4 bg-gray-100 rounded-md border"
              onChange={handleChange}
            />

            <div className="flex justify-between">
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-md"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-purple-700 text-white rounded-md"
                onClick={handleSubmit}
              >
                Pay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
