import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";
import Button from "./ui/Button";
import { Card } from "./ui/Card";
import Modal from "./ui/Modal";
import { Input, Select } from "./ui/Input";
import Badge from "./ui/Badge";
import { Table, THead, TBody, TH, TD, TR } from "./ui/Table";

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
  const fetchTransactions = useCallback(async () => {
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
        `student_name.ilike.%${search}%,receipt_no.ilike.%${search}%,roll_no.ilike.%${search}%,father_name.ilike.%${search}%`
      );
    }

    // Date filtering (assuming DD/MM/YYYY string format)
    if (selectedYear) {
      if (selectedMonth) {
        query = query.ilike("paid_on", `%/${selectedMonth.padStart(2, '0')}/${selectedYear}`);
      } else {
        query = query.ilike("paid_on", `%/%/${selectedYear}`);
      }
    } else if (selectedMonth) {
      query = query.ilike("paid_on", `%/${selectedMonth.padStart(2, '0')}/%`);
    }

    const { data, error } = await query;

    if (!error) setTransactions(data || []);
    setLoading(false);
  }, [page, limit, branchPrefix, search, selectedMonth, selectedYear]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchTransactions();
    }, 250);

    return () => clearTimeout(delay);
  }, [fetchTransactions]);

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
    const updateData = {
      ...rest,
      paid_on: editForm.paid_on
    };

    const { error } = await supabase
      .from("transaction")
      .update(updateData)
      .eq("id", id);

    if (!error) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updateData } : t))
      );
      setEditForm(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Transaction History</h1>
        <div className="flex items-center gap-2">
          <Badge variant="purple">{transactions.length} items</Badge>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <Card className="bg-white">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, father, receipt, or roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={() => (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            />
          </div>

          <div className="flex gap-3">
            <Select
              className="w-40"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              options={[
                { value: "", label: "All Months" },
                ...Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
                  value: m.toString(),
                  label: new Date(0, m - 1).toLocaleString('default', { month: 'long' }),
                })),
              ]}
            />

            <Select
              className="w-32"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={[
                { value: "", label: "All Years" },
                { value: "2024", label: "2024" },
                { value: "2025", label: "2025" },
                { value: "2026", label: "2026" },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* TABLE */}
      <Card noPadding className="shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
          </div>
        ) : (
          <>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Receipt</TH>
                  <TH className="hidden sm:table-cell">Roll</TH>
                  <TH>Name</TH>
                  <TH>Amount</TH>
                  <TH className="hidden md:table-cell">Paid On</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>

              <TBody>
                {transactions.map((t) => (
                  <TR key={t.id}>
                    <TD className="font-bold text-gray-900">{t.receipt_no}</TD>
                    <TD className="text-gray-500 hidden sm:table-cell">{t.roll_no}</TD>
                    <TD className="font-medium text-gray-700">{t.student_name}</TD>
                    <TD>
                      <Badge variant="green" className="font-black text-sm">₹{t.amount_paid}</Badge>
                    </TD>
                    <TD className="text-gray-500 hidden md:table-cell">{t.paid_on}</TD>
                    <TD>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-none shadow-none font-bold"
                          onClick={() => setSelectedTransaction(t)}
                        >
                          View
                        </Button>
                        {role === "owner" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border-none shadow-none font-bold"
                            onClick={() => handleEdit(t)}
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="danger"
                          className="border-none font-bold"
                          onClick={() => handleDelete(t.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}

                {transactions.length === 0 && (
                  <TR>
                    <TD colSpan="6" className="py-20 text-center text-gray-400 font-medium italic">
                      No records found matching filters.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>

            {/* PAGINATION */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>

              <span className="text-sm font-bold text-gray-500 underline decoration-purple-200 decoration-4">Page {page + 1}</span>

              <Button
                size="sm"
                onClick={() => setPage((p) => p + 1)}
              >
                Next Page
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* VIEW MODAL */}
      <Modal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        title="Transaction Record"
      >
        {selectedTransaction && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(selectedTransaction).map(([k, v]) => (
                <div key={k} className="flex flex-col sm:flex-row sm:justify-between border-b border-gray-50 pb-2 gap-1 group">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{k.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-bold text-gray-800 break-all group-hover:text-purple-600 transition-colors">{v}</span>
                </div>
              ))}
            </div>
            <Button variant="secondary" className="w-full mt-6" onClick={() => setSelectedTransaction(null)}>Close</Button>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editForm}
        onClose={() => setEditForm(null)}
        title="Edit Transaction"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditForm(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </>
        }
      >
        {editForm && (
          <div className="space-y-4">
            <Input label="Receipt No" value={editForm.receipt_no} onChange={(e) => setEditForm({ ...editForm, receipt_no: e.target.value })} />
            <Input label="Roll No" value={editForm.roll_no} onChange={(e) => setEditForm({ ...editForm, roll_no: e.target.value })} />
            <Input label="Student Name" value={editForm.student_name} onChange={(e) => setEditForm({ ...editForm, student_name: e.target.value })} />
            <Input label="Amount Paid" type="number" value={editForm.amount_paid} onChange={(e) => setEditForm({ ...editForm, amount_paid: e.target.value })} />
            <Input label="Paid On" value={editForm.paid_on} onChange={(e) => setEditForm({ ...editForm, paid_on: e.target.value })} />
          </div>
        )}
      </Modal>
    </div>
  );
}
