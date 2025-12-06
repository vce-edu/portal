import React, { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";

function TransactionTable() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const { branch, role } = useAuth();
  const [editForm, setEditForm] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  // 🔍 SEARCH + PAGINATION
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);

  const handleEdit = (t) => {
    let formattedDate = "";

    if (t.paid_on && t.paid_on.includes("/")) {
      const [dd, mm, yyyy] = t.paid_on.split("/");
      formattedDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }

    setEditForm({
      id: t.id,
      receipt_no: t.receipt_no,
      roll_no: t.roll_no,
      student_name: t.student_name,
      amount_paid: t.amount_paid,
      paid_on: formattedDate,
    });
  };


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedTransaction(null); // close View modal
        setEditForm(null);            // close Edit modal
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);


  const handleUpdate = async () => {
    const { id, ...fields } = editForm;

    // convert back for DB save
    if (fields.paid_on && fields.paid_on.includes("-")) {
      const [yyyy, mm, dd] = fields.paid_on.split("-");
      fields.paid_on = `${dd}/${mm}/${yyyy}`;
    }

    const { error } = await supabase
      .from("transaction")
      .update(fields)
      .eq("id", id);

    if (error) {
      alert("Update failed: " + error.message);
      return;
    }

    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...fields } : t))
    );

    setEditForm(null);
    alert("Transaction updated successfully!");
  };

  function getBranchPrefix(branch) {
    if (!branch || branch === "all") return "";
    return branch.charAt(0).toLowerCase() + "_";
  }

  const b_prefix = getBranchPrefix(branch);

  // ---------------------------------------
  // FETCH BY LIMIT + SEARCH + FILTERS
  // ---------------------------------------
  const fetchTransactions = async () => {
    setLoading(true);

    let query = supabase
      .from("transaction")
      .select("*")
      .order("id", { ascending: false });

    if (search.trim() === "") {
      query = query.limit(limit);
    }

    if (search.trim() !== "") {
      query = query.or(
        `student_name.ilike.%${search}%,receipt_no.ilike.%${search}%,roll_no.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error:", error.message);
      setLoading(false);
      return;
    }

    let filtered = data;

    // Branch filter
    if (b_prefix) {
      filtered = filtered.filter((t) =>
        t.roll_no?.toString().startsWith(b_prefix)
      );
    }

    // Month filter
    if (selectedMonth) {
      filtered = filtered.filter((t) => {
        if (!t.paid_on) return false;
        const [d, m, y] = t.paid_on.split("/").map(Number);
        return m === parseInt(selectedMonth);
      });
    }

    // Year filter
    if (selectedYear) {
      filtered = filtered.filter((t) => {
        if (!t.paid_on) return false;
        const [d, m, y] = t.paid_on.split("/").map(Number);
        return y === parseInt(selectedYear);
      });
    }

    setTransactions(filtered);
    setLoading(false);
  };

  // 🔁 Re-fetch when any filter/search/limit changes
  useEffect(() => {
    const delay = setTimeout(fetchTransactions, 300);
    return () => clearTimeout(delay);
  }, [selectedMonth, selectedYear, search, limit]);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    const { error } = await supabase.from("transaction").delete().eq("id", id);
    if (!error)
      setTransactions(transactions.filter((t) => t.id !== id));
    else alert("Delete failed: " + error.message);
  };

  const closeModal = () => setSelectedTransaction(null);

  return (
    <div className="p-4 min-h-screen bg-gray-50 mt-20">

      <h1 className="text-2xl font-semibold mb-4">Transaction History</h1>

      {/* 🔍 SEARCH BAR */}
      <input
        type="text"
        placeholder="Search by name, receipt, roll..."
        className="border p-2 rounded mb-4 w-full"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setLimit(200); // auto-load more when searching
        }}
      />

      {/* MONTH + YEAR FILTERS */}
      <div className="flex gap-4 mb-4">
        <select className="border p-2 rounded" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          <option value="">All Months</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
            <option value={m} key={m}>{m}</option>
          ))}
        </select>

        <select className="border p-2 rounded" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
          <option value="">All Years</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      </div>

      {/* TABLE */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow p-4">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-purple-700 text-white">
                <th className="px-4 py-2">Receipt Number</th>
                <th className="px-4 py-2">Roll Number</th>
                <th className="px-4 py-2">Student's Name</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Paid On</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="text-center border-b">
                  <td className="px-4 py-2">{t.receipt_no}</td>
                  <td className="px-4 py-2">{t.roll_no}</td>
                  <td className="px-4 py-2">{t.student_name}</td>
                  <td className="px-4 py-2">₹{t.amount_paid}</td>
                  <td className="px-4 py-2">{t.paid_on}</td>

                  <td className="px-4 py-2 space-x-2">
                    <button className="px-2 py-1 bg-blue-500 text-white rounded"
                      onClick={() => setSelectedTransaction(t)}>View</button>

                    {role === "owner" && (
                      <button className="px-2 py-1 bg-yellow-500 text-white rounded"
                        onClick={() => handleEdit(t)}>Edit</button>
                    )}

                    <button className="px-2 py-1 bg-red-500 text-white rounded"
                      onClick={() => handleDelete(t.id)}>Delete</button>
                  </td>
                </tr>
              ))}

              {transactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-4 text-gray-500">No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* LOAD MORE */}
          {transactions.length >= limit - 10 && (
            <div className="flex justify-center mt-4">
              <button
                className="px-6 py-2 bg-purple-700 text-white rounded"
                onClick={() => setLimit(limit + 50)}
              >
                Load More (+50)
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW + EDIT MODALS ARE SAME AS BEFORE */}
      {/* (kept fully intact) */}

      {/* VIEW MODAL */}
      {selectedTransaction && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-11/12 md:w-1/2 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Transaction Details</h2>
            <button className="absolute top-3 right-3" onClick={closeModal}>✖</button>
            {Object.entries(selectedTransaction).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b pb-1">
                <span className="font-semibold">{k.replace(/_/g, " ")}:</span>
                <span>{v || "-"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-xl w-11/12 md:w-1/2 shadow-lg relative">
            <h2 className="text-xl font-bold mb-4">Edit Transaction</h2>
            <button onClick={() => setEditForm(null)}
              className="absolute top-3 right-3 text-gray-700">✖</button>

            <div className="space-y-3">
              <input className="border p-2 w-full" value={editForm.receipt_no}
                onChange={(e) => setEditForm({ ...editForm, receipt_no: e.target.value })} />
              <input className="border p-2 w-full" value={editForm.roll_no}
                onChange={(e) => setEditForm({ ...editForm, roll_no: e.target.value })} />
              <input className="border p-2 w-full" value={editForm.student_name}
                onChange={(e) => setEditForm({ ...editForm, student_name: e.target.value })} />

              <div className="border p-2 w-full flex items-center">
                <span className="mr-2">₹</span>
                <input type="number" className="w-full"
                  value={editForm.amount_paid}
                  onChange={(e) => setEditForm({ ...editForm, amount_paid: e.target.value })} />
              </div>

              <input type="date" className="border p-2 w-full"
                value={editForm.paid_on}
                onChange={(e) => setEditForm({ ...editForm, paid_on: e.target.value })} />
            </div>

            <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded"
              onClick={handleUpdate}>Save</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default TransactionTable;
