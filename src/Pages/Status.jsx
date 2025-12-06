import React, { useEffect, useState } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";

export default function Status() {
  const today = new Date().toISOString().split("T")[0];
  const [allRows, setAllRows] = useState([]);
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
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  async function fetchNotPaidStudents() {
    if (!filterMonth || !filterYear) return alert("Select both month and year");

    try {
      setLoading(true);
      setError(null);

      const selMonth = Number(filterMonth);
      const selYear = Number(filterYear);
      console.log("selected", selMonth, selYear);

      const { data: transactions, error: tErr } = await supabase
        .from("transaction")
        .select("roll_no, paid_on");

      if (tErr) throw tErr;


      const paidRollsSet = new Set();

      (transactions || []).forEach((tx) => {
        if (!tx || !tx.paid_on) return;
        const parts = String(tx.paid_on).trim().split("/").map(p => p.trim());
        if (parts.length !== 3) return; 
        const [, monStr, yearStr] = parts; 
        const mon = Number(monStr);
        const yr = Number(yearStr);
        if (!Number.isNaN(mon) && !Number.isNaN(yr)) {
          if (mon === selMonth && yr === selYear) {
            paidRollsSet.add(String(tx.roll_no));
            console.log("paidRollsSet", Array.from(paidRollsSet).slice(0, 50));
          }
        }
      });

      const stillPending = (allRows || []).filter((r) => {
        if (!r.status) return true;
        const s = r.status.toLowerCase();
        return !(s.includes("up-to-date") || s.includes("paid"));
      });

      const filtered = stillPending.filter(
        (r) => !paidRollsSet.has(String(r.roll_number))
      );

      // 5) Update UI
      setRows(filtered);


    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }




  }



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
      setAllRows(data.data || []);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus(selectedBranch);
  }, []);

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
      {/* NOT PAID FILTER UI */}
      <div className="mb-8 p-4 bg-white rounded-xl shadow-md border border-purple-200">
        <h2 className="text-xl font-semibold mb-4 text-purple-700">
          Filter Students Who Have NOT Paid
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Month Selector */}
          <div>
            <label className="block mb-1 font-medium">Select Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full border px-3 py-2 rounded-md bg-gray-50"
            >
              <option value="">Choose Month</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block mb-1 font-medium">Select Year</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full border px-3 py-2 rounded-md bg-gray-50"
            >
              <option value="">Choose Year</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>

          {/* Filter Button */}
          <div className="flex items-end">
            <button
              className="w-full mr-4 px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800"
              onClick={fetchNotPaidStudents}
            >
              Show Not Paid
            </button>
            <button
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              onClick={() => {
                setFilterMonth("");
                setFilterYear("");
                setRows(allRows);
              }}

            >
              Clear Filter
            </button>
          </div>

        </div>
      </div>

      {/* Loading & Error */}
      {loading && <div className="text-lg">Loading...</div>}
      {error && <div className="text-red-600 text-lg">{error}</div>}

      {/* TABLE */}
      {!loading && !error && (
        <div className="overflow-x-auto shadow-lg rounded-lg">
          <table className="min-w-full border bg-white">
            <thead className="bg-purple-700 text-white">
              <tr>
                <th className="px-6 py-3">Father's Name</th>
                <th className="px-6 py-3">Roll Number</th>
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
                    <td className="px-6 py-3">{s.father_name}</td>
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
