import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../createClient";
import TransactionTable from "../components/TransactionTable";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";

const HISTORY_PAGE_LIMIT = 20;

export default function Fees() {
  const location = useLocation();
  const passedRoll = location.state?.roll;
  useEffect(() => {
    if (passedRoll) {
      setSelectedRoll(passedRoll);
      setHistoryOpen(true);
    }
  }, [passedRoll]);

  const today = new Date().toISOString().split("T")[0];

  // form state
  const [form, setForm] = useState({
    roll: "",
    student: "",
    father: "",
    amount: "",
    receipt: "",
    paidOn: today, // we keep your date handling untouched
  });

  // UI state
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState("");
  const [feesHistory, setFeesHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  // loading flags
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // refs for debounce & latest roll
  const rollLookupTimer = useRef(null);
  const latestRollRef = useRef("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        // close payment modal
        if (open) setOpen(false);

        // close history prompt modal
        if (historyOpen) {
          setFeesHistory([]);
          setSelectedRoll("");
          setHistoryOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, historyOpen]);

  // ------------------------------
  // Helpers: dispatch event to notify TransactionTable to refresh
  // ------------------------------
  const notifyTransactionTable = () => {
    try {
      window.dispatchEvent(new Event("transactionsUpdated"));
    } catch (e) {
      // noop
    }
  };

  const openPayForSelectedRoll = () => {
    if (!selectedRoll) return;

    // close history modal
    setHistoryOpen(false);
    setFeesHistory([]);

    // open payment modal
    setOpen(true);

    // set roll immediately
    setForm((prev) => ({
      ...prev,
      roll: selectedRoll,
    }));

    // trigger student lookup manually
    fetchStudentByRoll(selectedRoll);
  };

  // ------------------------------
  // Fetch single student by roll (DEBOUNCED CALLER)
  // ------------------------------
  const fetchStudentByRoll = useCallback(async (roll) => {
    if (!roll) {
      // clear fields if roll is empty
      setForm((prev) => ({
        ...prev,
        student: "",
        father: "",
        amount: "",
        receipt: "",
      }));
      return;
    }

    setLoadingStudent(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("student_name, father_name, fee_month")
        .eq("roll_number", roll)
        .limit(1)
        .single();

      if (error) {
        // If no row found, just clear details (don't spam user)
        setForm((prev) => ({
          ...prev,
          student: "",
          father: "",
          amount: "",
          receipt: "",
        }));
      } else if (data) {
        setForm((prev) => ({
          ...prev,
          student: data.student_name,
          father: data.father_name,
          amount: data.fee_month ?? prev.amount,
          receipt: "",
        }));
      }
    } catch (err) {
      console.error("fetchStudentByRoll:", err);
    } finally {
      setLoadingStudent(false);
    }
  }, []);

  // ------------------------------
  // handle input changes (debounce student lookup on roll)
  // ------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "roll") {
      latestRollRef.current = value;
      // clear existing timer
      if (rollLookupTimer.current) clearTimeout(rollLookupTimer.current);

      // debounce 400ms
      rollLookupTimer.current = setTimeout(() => {
        // only fetch if modal is open (we won't fetch while modal closed)
        if (open) fetchStudentByRoll(latestRollRef.current);
      }, 400);
    }
  };

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (rollLookupTimer.current) clearTimeout(rollLookupTimer.current);
    };
  }, []);

  // ------------------------------
  // Submit transaction (keeps your date handling)
  // ------------------------------
  const handleSubmit = async () => {
    // basic validation
    if (!form.roll || !form.student || !form.amount) {
      alert("Roll, student and amount are required.");
      return;
    }

    setLoadingSubmit(true);
    try {
      // NOTE: you insisted on not touching dates, so I keep your formatting logic
      const [y, m, d] = form.paidOn.split("-");
      const formattedDate = `${d}/${m}/${y}`;

      const { data, error } = await supabase.from("transaction").insert([
        {
          roll_no: form.roll,
          student_name: form.student,
          father_name: form.father,
          amount_paid: form.amount,
          receipt_no: form.receipt,
          paid_on: formattedDate, // unchanged per your request
        },
      ]);

      if (error) {
        console.error("Error inserting transaction:", error);
        alert("Failed to add transaction: " + (error.message || "Unknown"));
        return;
      }

      // success: close modal, reset, notify table
      setOpen(false);
      notifyTransactionTable();

      setForm({
        roll: "",
        student: "",
        father: "",
        amount: "",
        receipt: "",
        paidOn: today,
      });
    } catch (err) {
      console.error("handleSubmit:", err);
      alert("Unexpected error while adding transaction.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  // ------------------------------
  // Fetch history (paginated)
  // ------------------------------
  const fetchFeesHistory = async (roll, page = 0) => {
    if (!roll) return;
    setLoadingHistory(true);
    try {
      const from = page * HISTORY_PAGE_LIMIT;
      const to = from + HISTORY_PAGE_LIMIT - 1;

      const { data, error } = await supabase
        .from("transaction")
        .select("id, paid_on, receipt_no, amount_paid, student_name")
        .eq("roll_no", roll)
        .order("id", { ascending: false }) // use id ordering to be deterministic; keep date untouched
        .range(from, to);

      if (error) {
        alert("Failed to fetch fees history: " + error.message);
        return;
      }

      if (page === 0) {
        setFeesHistory(data);
      } else {
        setFeesHistory((prev) => [...prev, ...data]);
      }

      // if returned rows == page limit, we might have more
      setHasMoreHistory(data.length === HISTORY_PAGE_LIMIT);
      setHistoryPage(page);
    } catch (err) {
      console.error("fetchFeesHistory:", err);
      alert("Error fetching history.");
    } finally {
      setLoadingHistory(false);
    }
  };

  // initial fetch when user opens the history modal (and selectedRoll is present)
  useEffect(() => {
    if (historyOpen && selectedRoll) {
      // reset and fetch first page
      setFeesHistory([]);
      setHistoryPage(0);
      setHasMoreHistory(false);
      fetchFeesHistory(selectedRoll, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyOpen, selectedRoll]);

  // helper to start history for a roll (from the 'Fees History' button)
  const openHistoryPrompt = () => {
    setSelectedRoll("");
    setHistoryOpen(true);
    setFeesHistory([]);
  };

  return (
    <div className="relative min-h-screen p-4">
      <div className="flex gap-4 mt-4">
        <button
          onClick={() => setOpen(true)}
          className="px-5 py-2 text-base font-medium text-white bg-purple-700 hover:bg-purple-600 rounded-xl shadow-lg transition"
        >
          Update Fees
        </button>

        <button
          onClick={openHistoryPrompt}
          className="px-5 py-2 bg-green-500 text-white rounded-xl hover:bg-green-400 shadow-lg transition"
        >
          Fees History
        </button>
      </div>

      <TransactionTable />

      <h1 className="text-xl font-semibold text-gray-200 mt-12">Fees</h1>

      {/* ----- Payment Modal ----- */}
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-80 border border-purple-700">
            <h2 className="text-lg font-semibold text-black mb-4">Fees Payment</h2>

            <input
              name="roll"
              placeholder="Roll Number"
              value={form.roll}
              className="w-full p-2 mb-2 bg-gray-100 text-black rounded-md border border-purple-700"
              onChange={handleChange}
              autoFocus
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
                disabled={loadingSubmit}
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className={`px-4 py-2 rounded-md text-white ${loadingSubmit ? "bg-gray-400 cursor-not-allowed" : "bg-purple-700 hover:bg-purple-600"}`}
                disabled={loadingSubmit}
              >
                {loadingSubmit ? "Processing..." : "Pay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----- History Prompt Modal (ask roll) ----- */}
      {historyOpen && !feesHistory.length && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-80 border border-purple-700 relative">
            <h2 className="text-lg font-semibold mb-4">Enter Roll Number</h2>

            <input
              type="text"
              placeholder="Roll Number"
              value={selectedRoll.toLowerCase()}
              onChange={(e) => setSelectedRoll(e.target.value)}
              className="w-full p-2 mb-4 bg-gray-100 rounded-md border border-purple-700"
              autoFocus
            />
            <div className="flex items-center justify-between gap-3 mt-6">
              <button
                onClick={openPayForSelectedRoll}
                className="h-11 flex-1 bg-green-600 hover:bg-green-500 text-white rounded-lg shadow font-medium transition"
              >
                Pay Fees
              </button>

              <button
                onClick={() => {
                  setSelectedRoll("");
                  setHistoryOpen(false);
                }}
                disabled={loadingHistory}
                className="h-11 flex-1 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow font-medium transition disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (!selectedRoll) return alert("Enter a roll number.");
                  setFeesHistory([]);
                  fetchFeesHistory(selectedRoll, 0);
                }}
                disabled={loadingHistory}
                className={`h-11 flex-1 rounded-lg shadow font-medium text-white transition ${loadingHistory
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-purple-700 hover:bg-purple-600"
                  }`}
              >
                {loadingHistory ? "Fetching..." : "Fetch"}
              </button>
            </div>

          </div>
        </div>
      )
      }

      {/* ----- History Display Modal ----- */}
      {
        feesHistory.length > 0 && (
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
                  {feesHistory[0].student_name ? feesHistory[0].student_name.toUpperCase() : ""}
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

                <div className="flex justify-center mt-4">
                  {hasMoreHistory ? (
                    <button
                      onClick={() => fetchFeesHistory(selectedRoll, historyPage + 1)}
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-md text-white"
                      disabled={loadingHistory}
                    >
                      {loadingHistory ? "Loading..." : "Load More"}
                    </button>
                  ) : (
                    <div className="text-sm text-gray-500 py-2">No more records</div>

                  )}
                </div>
                <div className="flex justify-center mt-6 gap-4">
                  <button
                    onClick={openPayForSelectedRoll}
                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg shadow"
                  >
                    Pay Fees
                  </button>

                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
