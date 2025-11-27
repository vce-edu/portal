import { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";
export default function Fees() {
  const {branch} = useAuth();
  const [fees, setFees] = useState([]);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const [roll, setRoll] = useState("");

  // merged history
  const [history, setHistory] = useState(null);

  // merged update form logic
  const [formData, setFormData] = useState({
    roll_number: "",
    student_name: "",
    father_name: "",
    amount: "",
    date: "",
  });

  const [locked, setLocked] = useState(false);

  const getBranchPrefix = (branch) => {
  if (!branch || branch === "all") return null;
  return branch[0].toLowerCase(); // m, s, t
};

// load fees based on logged-in user's branch
useEffect(() => {
  (async () => {
    const prefix = getBranchPrefix(branch);

    let query = supabase.from("fees").select("*");

    // If branch is not "all", filter by roll_number prefix
    if (prefix) {
      query = query.ilike("roll_number", `${prefix}_%`);
    }

    const { data, error } = await query;

    if (error) return setErr(error.message);
    setFees(data || []);
  })();
}, [branch]);

  // FETCH STUDENT FOR UPDATE FEES
  const fetchStudent = async (r) => {
    if (!r) return;

    const { data, error } = await supabase
      .from("students")
      .select("student_name, father_name, roll_number, fee_month")
      .eq("roll_number", r)
      .single();

    if (!error && data) {
      setFormData({
        roll_number: data.roll_number || r,
        student_name: data.student_name || "",
        father_name: data.father_name || "",
        amount: data.fee_month || "",
        date: new Date().toISOString().split("T")[0],
      });
      setLocked(true);
    } else {
      setFormData((prev) => ({ ...prev, roll_number: r }));
      setLocked(false);
    }
  };

  // FORM CHANGE HANDLER (respects locking)
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (locked && (name === "student_name" || name === "father_name" || name === "roll_number"))
      return;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };


const saveFees = async () => {
  setSaving(true);
  const payload = {
    roll_number: formData.roll_number,
    student_name: formData.student_name,
    father_name: formData.father_name,
    last_amount_paid: Number(formData.amount),
    last_paid: formData.date,
  };

  try {
    const res = await fetch(
      "https://script.google.com/macros/s/AKfycbwDg-690dcyvMdjIqGHpEE85CkxI5cUYkdc5VbbogGrPZzwqkwFMi92e9KeUSAyjGs2/exec", 
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    console.log("Sent to Apps Script:", payload);
  } catch (err) {
    console.error("Apps Script POST Failed:", err);
  }
  setSaving(false); 
  // Close modal + reset form (same as before)
  setShowUpdateModal(false);
  setFormData({
    roll_number: "",
    student_name: "",
    father_name: "",
    amount: "",
    date: "",
  });
  setLocked(false);
};

  // MERGED FEE HISTORY FUNCTION
  const handleFetchHistory = async () => {
    const r = roll.trim();
    if (!r) return;
    setFetching(true);

    // Supabase local history
    const { data, error } = await supabase.from("fees").select("*").eq("roll_number", r);
    if (error) setErr(error.message);
    else setFees(data || []);

    // Apps Script history
    try {
      const res = await fetch(
        `https://script.google.com/macros/s/AKfycbyu_SszhPo_gOgSgm2oUXwBD6eC_092UgKHmIP018PZrLbq9z_yDAWV9EYeXxcyOe2S/exec?roll=${encodeURIComponent(
          r
        )}`
      );
      const json = await res.json();

      if (json.success && json.exists && json.fees) setHistory(json.fees);
      else setHistory(null);
    } catch (e) {
      console.error(e);
      setHistory(null);
    }
    
    setFetching(false);
    setShowHistoryModal(false);
    setRoll("");
  };

return (
  <div className="p-6 relative">

    {/* PAGE HEADER BUTTONS */}
    <div className="flex gap-4 mb-6">
      <button
        onClick={() => setShowUpdateModal(true)}
        className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-2xl shadow-md transition-all"
      >
        Update Fees
      </button>

      <button
        onClick={() => setShowHistoryModal(true)}
        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-2xl shadow-md transition-all"
      >
        Fees History
      </button>
    </div>

    {/* MAIN TABLE CARD */}
    <div className="bg-white/70 backdrop-blur-xl border border-purple-200 rounded-3xl shadow-xl p-4">
      <h2 className="text-xl font-semibold text-purple-700 mb-4">Fees Overview</h2>

      <div className="overflow-auto rounded-2xl border">
        <table className="w-full text-sm text-gray-700">
          <thead className="bg-purple-600 text-white font-semibold text-left">
            <tr>
              {fees[0] &&
                Object.keys(fees[0]).map((k) => (
                  <th key={k} className="px-4 py-3 capitalize">
                    {k.replaceAll("_", " ")}
                  </th>
                ))}
            </tr>
          </thead>

          <tbody>
            {fees.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-500">
                  No fee records found
                </td>
              </tr>
            )}

            {fees.map((row, i) => (
              <tr
                key={i}
                className="border-t hover:bg-purple-50/60 transition"
              >
                {Object.values(row).map((v, j) => (
                  <td key={j} className="px-4 py-2.5">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* GOOGLE HISTORY CARD */}
    {history && (
      <div className="flex justify-center mt-8">
        <div className="bg-white/70 backdrop-blur-xl border border-purple-300 p-6 rounded-3xl w-full max-w-md shadow-lg">
          <h3 className="font-semibold text-purple-700 mb-4 text-lg text-center">
            Fee History
          </h3>

          <ul className="space-y-2">
            {Object.entries(history).map(([date, amount]) => (
              <li key={date} className="flex justify-between py-2 border-b">
                <span>{date}</span>
                <span className="font-bold text-purple-700">₹{amount}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}

    {/* HISTORY MODAL */}
    {showHistoryModal && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/90 backdrop-blur-xl w-[340px] p-6 rounded-3xl shadow-2xl border border-purple-200">
          <h2 className="text-xl font-semibold mb-4 text-purple-700 text-center">
            Search History
          </h2>

          <input
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            placeholder="Enter Roll Number"
            className="w-full border border-purple-300 rounded-xl px-3 py-2 mb-4 focus:ring-2 focus:ring-purple-400 outline-none"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition"
            >
              Cancel
            </button>

            <button
              onClick={handleFetchHistory}
              disabled={fetching}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition disabled:opacity-50"
            >
              {fetching ? "Fetching..." : "Fetch"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* UPDATE FEES MODAL */}
    {showUpdateModal && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/90 backdrop-blur-xl w-[360px] p-7 rounded-3xl shadow-2xl border border-purple-200">
          <h2 className="text-xl font-semibold text-purple-700 mb-5 text-center">
            Update Fees
          </h2>

          <input
            name="roll_number"
            value={formData.roll_number}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, roll_number: e.target.value }));
              setLocked(false);
            }}
            onBlur={(e) => fetchStudent(e.target.value.trim())}
            placeholder="Roll Number"
            disabled={locked}
            className="w-full border border-purple-300 rounded-xl px-3 py-2 mb-3 disabled:bg-gray-200 focus:ring-2 focus:ring-purple-400 outline-none"
          />

          <input
            name="student_name"
            value={formData.student_name}
            disabled
            className="w-full bg-gray-100 border rounded-xl px-3 py-2 mb-3"
          />

          <input
            name="father_name"
            value={formData.father_name}
            disabled
            className="w-full bg-gray-100 border rounded-xl px-3 py-2 mb-3"
          />

          <input
            name="amount"
            value={formData.amount}
            onChange={handleFormChange}
            type="number"
            placeholder="Amount"
            className="w-full border border-purple-300 rounded-xl px-3 py-2 mb-3 focus:ring-2 focus:ring-purple-400 outline-none"
          />

          <input
            name="date"
            type="date"
            value={formData.date}
            onChange={handleFormChange}
            className="w-full border border-purple-300 rounded-xl px-3 py-2 mb-4 focus:ring-2 focus:ring-purple-400 outline-none"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowUpdateModal(false);
                setFormData({
                  roll_number: "",
                  student_name: "",
                  father_name: "",
                  amount: "",
                  date: "",
                });
                setLocked(false);
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition"
            >
              Cancel
            </button>

            <button
              onClick={saveFees}
              disabled={saving || !formData.roll_number || !formData.amount}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);

}
