import React, { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";

export default function TransactionTable() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const { branch, role } = useAuth();
  const limit = 50;

  function getBranchPrefix(branch) {
    if (!branch || branch === "all") return "";
    return branch.charAt(0).toLowerCase() + "_";
  }

  const branchPrefix = getBranchPrefix(branch);

  // 🚀 MAIN FETCH
  const fetchTransactions = async () => {
    setLoading(true);

    let query = supabase
      .from("transaction")
      .select("*")
      .order("id", { ascending: false })
      .range(page * limit, page * limit + limit - 1);

    // branch filter
    if (branchPrefix) {
      query = query.ilike("roll_no", `${branchPrefix}%`);
    }

    // search filter
    if (search.trim()) {
      query = query.or(
        `student_name.ilike.%${search}%,receipt_no.ilike.%${search}%,roll_no.ilike.%${search}%`
      );
    }

    // MONTH filter — NO DATE CHANGE
    if (selectedMonth) {
      const m = selectedMonth.toString().padStart(2, "0");
      query = query.ilike("paid_on", `__/${m}/%`);
    }

    // YEAR filter — NO DATE CHANGE
    if (selectedYear) {
      query = query.like("paid_on", `%/${selectedYear}`);
    }

    const { data, error } = await query;

    if (!error) setTransactions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      setPage(0); // reset page on filter change
      fetchTransactions();
    }, 250);

    return () => clearTimeout(delay);
  }, [search, selectedMonth, selectedYear, branch]);

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  // DELETE
  const handleDelete = async (id) => {
    if (!confirm("Delete transaction?")) return;

    const { error } = await supabase.from("transaction").delete().eq("id", id);
    if (!error) {
      setTransactions((p) => p.filter((t) => t.id !== id));
    }
  };

  // EDIT – No touching dates except reading/writing exact same format
  const handleEdit = (t) => {
    setEditForm({ ...t });
  };

  const handleUpdate = async () => {
    const { id, ...rest } = editForm;

    const { error } = await supabase
      .from("transaction")
      .update(rest)
      .eq("id", id);

    if (!error) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...rest } : t))
      );
      setEditForm(null);
    }
  };

  return (
    <div className="p-4 min-h-screen bg-gray-50 mt-20">
      <h1 className="text-2xl font-semibold mb-4">Transaction History</h1>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search..."
        className="border p-2 w-full rounded mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* FILTERS */}
      <div className="flex gap-4 mb-4">
        <select
          className="border p-2 rounded"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          <option value="">All Months</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="">All Years</option>
          <option>2024</option>
          <option>2025</option>
          <option>2026</option>
        </select>
      </div>

      {/* TABLE */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white shadow rounded p-4 overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-purple-700 text-white">
                <th className="px-4 py-2">Receipt</th>
                <th className="px-4 py-2">Roll</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Paid On</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b text-center">
                  <td className="px-4 py-2">{t.receipt_no}</td>
                  <td className="px-4 py-2">{t.roll_no}</td>
                  <td className="px-4 py-2">{t.student_name}</td>
                  <td className="px-4 py-2">₹{t.amount_paid}</td>
                  <td className="px-4 py-2">{t.paid_on}</td>
                  <td className="px-4 py-2 space-x-2">
                    <button
                      onClick={() => setSelectedTransaction(t)}
                      className="px-2 py-1 bg-blue-600 text-white rounded"
                    >
                      View
                    </button>

                    {role === "owner" && (
                      <button
                        onClick={() => handleEdit(t)}
                        className="px-2 py-1 bg-yellow-500 text-white rounded"
                      >
                        Edit
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(t.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {transactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-4 text-gray-500">
                    No transactions
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* PAGINATION */}
          <div className="flex justify-between mt-4">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-4 py-2 bg-gray-300 rounded"
            >
              Previous
            </button>

            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-purple-700 text-white rounded"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow w-96 relative">
            <button
              className="absolute right-3 top-3"
              onClick={() => setSelectedTransaction(null)}
            >
              ✖
            </button>
            <h2 className="font-bold text-xl mb-3">Transaction Details</h2>

            {Object.entries(selectedTransaction).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b py-1">
                <span className="font-semibold">{k}:</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow w-96 relative">
            <button
              className="absolute right-3 top-3"
              onClick={() => setEditForm(null)}
            >
              ✖
            </button>

            <h2 className="font-bold text-xl mb-4">Edit Transaction</h2>

            <input
              className="border p-2 w-full mb-2"
              value={editForm.receipt_no}
              onChange={(e) =>
                setEditForm({ ...editForm, receipt_no: e.target.value })
              }
            />

            <input
              className="border p-2 w-full mb-2"
              value={editForm.roll_no}
              onChange={(e) =>
                setEditForm({ ...editForm, roll_no: e.target.value })
              }
            />

            <input
              className="border p-2 w-full mb-2"
              value={editForm.student_name}
              onChange={(e) =>
                setEditForm({ ...editForm, student_name: e.target.value })
              }
            />

            <input
              type="number"
              className="border p-2 w-full mb-2"
              value={editForm.amount_paid}
              onChange={(e) =>
                setEditForm({ ...editForm, amount_paid: e.target.value })
              }
            />

            <input
              className="border p-2 w-full mb-2"
              value={editForm.paid_on}
              onChange={(e) =>
                setEditForm({ ...editForm, paid_on: e.target.value })
              }
            />

            <button
              onClick={handleUpdate}
              className="w-full bg-blue-600 text-white py-2 rounded mt-3"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
