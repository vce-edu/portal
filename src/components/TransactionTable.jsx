import React, { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";
function TransactionTable() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const { branch, role } = useAuth();
  const [editForm, setEditForm] = useState(null);
  const handleEdit = (t) => {
    setEditForm({
      id: t.id,
      receipt_no: t.receipt_no,
      roll_no: t.roll_no,
      student_name: t.student_name,
      amount_paid: t.amount_paid,
      paid_on: t.paid_on,
    });
  };
  const handleUpdate = async () => {
    const { id, ...fields } = editForm;

    const { error } = await supabase
      .from("transaction")
      .update(fields)
      .eq("id", id);

    if (error) {
      alert("Update failed: " + error.message);
      return;
    }

    // Update UI without re-fetch
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
  // Fetch transaction data from Supabase
  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transaction")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error.message);
    } else {
      if (b_prefix) {
        const filtered = data.filter((t) =>
          t.roll_no?.toString().startsWith(b_prefix)
        );
        setTransactions(filtered);
      } else {
        setTransactions(data);
      }
    }
    setLoading(false);
  };


  useEffect(() => {
    fetchTransactions();
  }, []);

  // Delete a transaction
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    const { error } = await supabase.from("transaction").delete().eq("id", id);
    if (error) {
      alert("Failed to delete transaction: " + error.message);
    } else {
      setTransactions(transactions.filter((t) => t.id !== id));
    }
  };

  // Close modal
  const closeModal = () => setSelectedTransaction(null);

  return (
    <div className="p-4 min-h-screen bg-gray-50 mt-20">
      <h1 className="text-2xl font-semibold mb-4">Transaction History</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow p-4">
          <table className="w-full table-auto border-collapse">
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
                    <button
                      className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-400"
                      onClick={() => setSelectedTransaction(t)}
                    >
                      View
                    </button>

                    {role === "owner" && (
                      <button
                        className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-400"
                        onClick={() => handleEdit(t)}
                      >
                        Edit
                      </button>
                    )}

                    <button
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-400"
                      onClick={() => handleDelete(t.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {transactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-4 px-70 text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>


          </table>
        </div>
      )}

      {/* Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-6 w-11/12 md:w-1/2 lg:w-1/3 shadow-lg relative">
            <h2 className="text-xl font-bold mb-4">Transaction Details</h2>
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={closeModal}
            >
              ✖
            </button>
            <div className="space-y-2">
              {Object.entries(selectedTransaction).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b pb-1">
                  <span className="font-semibold">{key.replace(/_/g, " ")}:</span>
                  <span>{value !== null ? value.toString() : "-"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {editForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-6 w-11/12 md:w-1/2 lg:w-1/3 shadow-lg relative">
            <h2 className="text-xl font-bold mb-4">Edit Transaction</h2>
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setEditForm(null)}
            >
              ✖
            </button>

            <div className="space-y-3">
              {/* Receipt No */}
              <input
                className="border p-2 w-full rounded"
                value={editForm.receipt_no}
                onChange={(e) =>
                  setEditForm({ ...editForm, receipt_no: e.target.value })
                }
                placeholder="Receipt Number"
              />

              {/* Roll No */}
              <input
                className="border p-2 w-full rounded"
                value={editForm.roll_no}
                onChange={(e) =>
                  setEditForm({ ...editForm, roll_no: e.target.value })
                }
                placeholder="Roll Number"
              />

              {/* Student Name */}
              <input
                className="border p-2 w-full rounded"
                value={editForm.student_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, student_name: e.target.value })
                }
                placeholder="Student Name"
              />

              {/* Amount with Rupee sign */}
              <div className="border p-2 w-full rounded flex items-center">
                <span className="mr-2">₹</span>
                <input
                  className="w-full outline-none"
                  type="number"
                  value={editForm.amount_paid}
                  onChange={(e) =>
                    setEditForm({ ...editForm, amount_paid: e.target.value })
                  }
                  placeholder="Amount"
                />
              </div>

              {/* Paid On */}
              <input
                type="date"
                className="border p-2 w-full rounded"
                value={editForm.paid_on}
                onChange={(e) =>
                  setEditForm({ ...editForm, paid_on: e.target.value })
                }
              />
            </div>

            <button
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-500"
              onClick={handleUpdate}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default TransactionTable;
