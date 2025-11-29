import React, { useState, useEffect } from "react";
import { supabase } from "../createClient";
import TransactionTable from "../components/TransactionTable";

function Fees() {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [feesHistory, setFeesHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState("");
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    roll: "",
    student: "",
    father: "",
    amount: "",
    receipt: "",
    paidOn: today
  });


  const fetchFeesHistory = async (roll_no) => {
    const { data, error } = await supabase
      .from("transaction")
      .select("*")
      .eq("roll_no", roll_no)
      .order("paid_on", { ascending: false });

    if (error) {
      alert("Failed to fetch fees history: " + error.message);
      return;
    }

    setFeesHistory(data);
    setSelectedRoll(roll_no);
    setHistoryOpen(true);
  };


  // ----------------------------------------------------
  // FETCH STUDENTS WHEN MODAL OPENS
  // ----------------------------------------------------
  useEffect(() => {
    if (!open) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*");

      if (!error && data) setStudents(data);
    };

    load();
  }, [open]);

  // ----------------------------------------------------
  // HANDLE INPUT CHANGES
  // ----------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "roll") {
      const match = students.find((s) => String(s.roll_number) === value);
      if (match) {
        setForm({
          roll: value,
          student: match.student_name,
          father: match.father_name,
          amount: match.fee_month,
          receipt: "",
          paidOn: today
        });
      }
    }
  };

  // ----------------------------------------------------
  // SUBMIT HANDLER
  // ----------------------------------------------------
  const handleSubmit = async () => {
    const [y, m, d] = form.paidOn.split("-");
    const formattedDate = `${d}/${m}/${y}`;

    const { data, error } = await supabase.from("transaction").insert([
      {
        roll_no: form.roll,
        student_name: form.student,
        father_name: form.father,
        amount_paid: form.amount,
        receipt_no: form.receipt,
        paid_on: formattedDate
      }
    ]);

    if (error) {
      console.error("Error inserting transaction:", error.message);
      alert("Failed to add transaction!");
      return;
    }

    console.log("Transaction added:", data);
    setOpen(false);

    // Reset form
    setForm({
      roll: "",
      student: "",
      father: "",
      amount: "",
      receipt: "",
      paidOn: today
    });
  };


  return (
    <div className="relative min-h-screen p-4">
      <div className="flex gap-4 mt-4">
        <button
          onClick={() => setOpen(true)}
          className="px-5 py-2 text-base font-medium text-white 
               bg-purple-700 hover:bg-purple-600 rounded-xl shadow-lg transition"
        >
          Update Fees
        </button>

        <button
          onClick={() => setHistoryOpen(true)}
          className="px-5 py-2 bg-green-500 text-white rounded-xl hover:bg-green-400 shadow-lg transition"
        >
          Fees History
        </button>
      </div>

      <TransactionTable />

      <h1 className="text-xl font-semibold text-gray-200 mt-12">Fees</h1>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-80 border border-purple-700">
            <h2 className="text-lg font-semibold text-black mb-4">Fees Payment</h2>

            <input
              name="roll"
              placeholder="Roll Number"
              value={form.roll}
              className="w-full p-2 mb-2 bg-gray-100 text-black rounded-md border border-purple-700"
              onChange={handleChange}
            />

            <input
              name="student"
              placeholder="Student Name"
              value={form.student}
              className="w-full p-2 mb-2 bg-gray-100 text-black rounded-md border border-purple-700"
              readOnly
            />

            <input
              name="father"
              placeholder="Father Name"
              value={form.father}
              className="w-full p-2 mb-2 bg-gray-100 text-black rounded-md border border-purple-700"
              readOnly
            />

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
              placeholder="Receipt Number"
              value={form.receipt}
              className="w-full p-2 mb-2 bg-gray-100 text-black rounded-md border border-purple-700"
              onChange={handleChange}
            />

            <label className="text-xs text-gray-600">Paid On</label>
            <input
              name="paidOn"
              type="date"
              value={form.paidOn}
              className="w-full p-2 mb-4 bg-gray-100 text-black rounded-md border border-purple-700"
              onChange={handleChange}
            />

            <div className="flex justify-between">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-md text-white"
              >
                Pay
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal for Fees History */}
      {historyOpen && !feesHistory.length && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-80 border border-purple-700 relative">
            <h2 className="text-lg font-semibold mb-4">Enter Roll Number</h2>
            <input
              type="text"
              placeholder="Roll Number"
              value={selectedRoll}
              onChange={(e) => setSelectedRoll(e.target.value)}
              className="w-full p-2 mb-4 bg-gray-100 rounded-md border border-purple-700"
            />
            <div className="flex justify-between">
              <button
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md text-white"
                onClick={() => {
                  setSelectedRoll("");
                  setHistoryOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-md text-white"
                onClick={async () => {
                  if (!selectedRoll) return;

                  // Fetch fees history
                  const { data, error } = await supabase
                    .from("transaction")
                    .select("*")
                    .eq("roll_no", selectedRoll)
                    .order("paid_on", { ascending: false });

                  if (error) {
                    alert("Failed to fetch fees history: " + error.message);
                    return;
                  }

                  if (data.length === 0) {
                    alert("No transactions found for this roll number.");
                    return;
                  }

                  setFeesHistory(data);
                }}
              >
                Fetch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to display Fees History */}
      {feesHistory.length > 0 && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-11/12 md:w-1/2 border border-purple-700 relative">
            <h2 className="text-lg font-semibold mb-4">
              Fees History - Roll {selectedRoll}
            </h2>
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => {
                setFeesHistory([]);
                setSelectedRoll("");
                setHistoryOpen(false);
              }}
            >
              ✖
            </button>
            <div>
              <h3 className="font-semibold text-lg mb-2 text-center">
                {feesHistory[0].student_name.toUpperCase()}
              </h3>
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-purple-700 text-white">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Receipt Number</th>
                    <th className="px-4 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {feesHistory.map((f) => (
                    <tr key={f.id} className="text-center border-b">
                      <td className="px-4 py-2">{f.paid_on}</td>
                      <td className="px-4 py-2">{f.receipt_no || "-"}</td>
                      <td className="px-4 py-2">₹{f.amount_paid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Fees;
