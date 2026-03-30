import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Input, Select } from "../components/ui/Input";
import { Card, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR } from "../components/ui/Table";
import NoteTooltip from "../components/ui/NoteTooltip";
import BatchTimePicker, { renderBatchTime } from "../components/ui/BatchTimePicker";

export default function Status() {
  const today = new Date().toISOString().split("T")[0];
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(0);
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [form, setForm] = useState({
    roll: "",
    student: "",
    father: "",
    amount: "",
    receipt: "",
    paidOn: today,
  });

  const { branch } = useAuth();
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState(branch === "all" ? "main" : branch);
  const [search, setSearch] = useState("");
  // Default start = current hour, end = start + 1
  const defaultBatchFilter = () => {
    const now = new Date();
    const sH24 = now.getHours();
    const eH24 = sH24 + 1;
    const toH12 = (h24) => ({ h: String(h24 % 12 || 12), m: "00", p: h24 < 12 ? "AM" : "PM" });
    const s = toH12(sH24), e = toH12(eH24 > 23 ? 23 : eH24);
    return { sH: s.h, sM: s.m, sP: s.p, eH: e.h, eM: e.m, eP: e.p, startH24: sH24, endH24: eH24 > 23 ? 23 : eH24 };
  };
  const [batchTimeFilter, setBatchTimeFilter] = useState(defaultBatchFilter);

  // Parse a batch_time string like "09:00 AM - 10:30 PM" or "03 : 00 PM to 04 : 00 PM" → start hour in 24h
  const parseBatchStartH24 = (batchTime) => {
    if (!batchTime) return null;
    // Allow optional spaces around colon (DB stores "03 : 00 PM to 04 : 00 PM")
    const re = /(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)/i;
    const m = re.exec(batchTime.trim());
    if (!m) return null;
    const h12 = parseInt(m[1], 10);
    const period = m[3].toUpperCase();
    if (period === "AM") return h12 === 12 ? 0 : h12;
    return h12 === 12 ? 12 : h12 + 12;
  };

  // Client-side filter: hour-based matching
  const { startH24, endH24 } = batchTimeFilter || {};
  const hasFilter = startH24 != null;
  const filteredRows = hasFilter
    ? rows.filter((r) => {
        const bH24 = parseBatchStartH24(r.batch_time);
        if (bH24 === null) return false;
        if (endH24 != null) {
          // Range: batch start must fall within [startH24, endH24)
          return bH24 >= startH24 && bH24 < endH24;
        }
        // Start only: batch start hour must equal startH24
        return bH24 === startH24;
      })
    : rows;
  useEffect(() => {
    fetchStatus(selectedBranch, 0, search);
  }, [showOnlyPending, selectedBranch, search]);




  // ----------------------------------------------------
  // LOAD ALL STUDENTS ONCE (NOT EVERY MODAL OPEN)
  // ----------------------------------------------------
  async function fetchStudentByRoll(roll) {
    const { data, error } = await supabase
      .from("students")
      .select("student_name, father_name, fee_month")
      .eq("roll_number", roll)
      .single();

    if (error) return null;
    return data;
  }


  // ----------------------------------------------------
  // LOAD STATUS DATA
  // ----------------------------------------------------
  const fetchStatus = useCallback(async (branchToUse, pageToLoad = 0, searchTerm = null) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "get_student_fee_status",
        {
          p_branch: branchToUse,
          p_search: searchTerm && searchTerm.trim() !== "" ? searchTerm : null,
          p_only_pending: showOnlyPending,
          p_limit: PAGE_SIZE,
          p_offset: pageToLoad * PAGE_SIZE,
        }
      );

      if (rpcError) throw rpcError;

      const rows = data || [];

      // Supplement with notes from students table
      if (rows.length > 0) {
        const rolls = rows.map((r) => r.roll_number);
        const { data: noteData } = await supabase
          .from("students")
          .select("roll_number, notes")
          .in("roll_number", rolls);

        const notesMap = {};
        (noteData || []).forEach((n) => { notesMap[n.roll_number] = n.notes; });
        setRows(rows.map((r) => ({ ...r, notes: notesMap[r.roll_number] || null })));
      } else {
        setRows([]);
      }

      setPage(pageToLoad);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [showOnlyPending]);




  useEffect(() => {
    fetchStatus(selectedBranch, 0);
  }, [selectedBranch, fetchStatus]);


  // ----------------------------------------------------
  // FORM CHANGE HANDLER
  // ----------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "roll" && value) {
      fetchStudentByRoll(value).then((s) => {
        if (!s) return;

        setForm((prev) => ({
          ...prev,
          roll: value,
          student: s.student_name,
          father: s.father_name,
          amount: s.fee_month,
        }));
      });
    }

  };

  // ----------------------------------------------------
  // SUBMIT PAYMENT
  // ----------------------------------------------------
  const handleSubmit = async () => {
    // eslint-disable-next-line no-unused-vars
    const { error } = await supabase.from("transaction").insert({
      roll_no: form.roll,
      student_name: form.student,
      father_name: form.father,
      amount_paid: form.amount,
      receipt_no: form.receipt,
      paid_on: form.paidOn.split('-').reverse().join('/'),
    });

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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">Audit Status</h1>
          <p className="text-gray-500 mt-2 font-medium">Monitoring fee compliance across the network</p>
        </div>

        {branch === "all" && (
          <div className="w-full sm:w-64">
            <Select
              label="Active Branch"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              options={[
                { value: "main", label: "Main Office" },
                { value: "second", label: "Second Unit" },
                { value: "third", label: "Third Unit" },
              ]}
            />
          </div>
        )}
      </div>

      <Card className="bg-white/80 backdrop-blur-md shadow-sm border-purple-100 !overflow-visible">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchStatus(selectedBranch, 0, search);
              }}
            >
              <Input
                placeholder="Search by roll, student or father's name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={() => (
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              />
            </form>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/* Pending filter */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-2xl border border-gray-100">
              <input
                type="checkbox"
                id="pendingOnly"
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                checked={showOnlyPending}
                onChange={(e) => setShowOnlyPending(e.target.checked)}
              />
              <label htmlFor="pendingOnly" className="text-sm font-bold text-gray-600 cursor-pointer select-none">
                Pending Only
              </label>
            </div>

            {/* Batch time filter */}
            <div className="flex items-end gap-2">
              <BatchTimePicker
                label="Filter by Batch"
                value={batchTimeFilter}
                onChange={setBatchTimeFilter}
              />
              {hasFilter && (
                <button
                  type="button"
                  onClick={() => setBatchTimeFilter({})}
                  className="mb-0.5 text-xs font-bold text-red-400 hover:text-red-600 px-2 py-2 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Loading & Error */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
        </div>
      )}
      {error && (
        <Card className="bg-red-50 border-red-100 p-6 text-center">
          <p className="text-red-600 font-bold">{error}</p>
        </Card>
      )}

      {/* TABLE */}
      {!loading && !error && (
        <Card noPadding className="overflow-hidden shadow-xl border-gray-100">
          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Roll</TH>
                <TH>Name</TH>
                <TH className="hidden lg:table-cell">Father's Name</TH>
                <TH className="hidden md:table-cell">Batch</TH>
                <TH>Expect</TH>
                <TH>Paid</TH>
                <TH>Status</TH>
                <TH>Action</TH>
              </TR>
            </THead>

            <TBody>
              {filteredRows.length === 0 && !loading && (
                <TR>
                  <TD colSpan={8} className="py-12 text-center text-gray-400 font-medium italic">
                    {batchTimeFilter ? "No students found for this batch time." : "No records found."}
                  </TD>
                </TR>
              )}
              {filteredRows.map((r, i) => (
                <TR key={i}>
                  <TD className="font-bold text-gray-900">{r.roll_number}</TD>
                  <TD className="font-medium text-gray-700">
                    <span className="inline-flex items-center gap-0.5">
                      {r.student_name}
                      <NoteTooltip
                        note={r.notes}
                        rollNumber={r.roll_number}
                        onNoteSaved={(newNote) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.roll_number === r.roll_number ? { ...x, notes: newNote } : x
                            )
                          )
                        }
                      />
                    </span>
                  </TD>
                  <TD className="text-gray-500 hidden lg:table-cell">{r.father_name}</TD>
                  <TD className="text-gray-500 hidden md:table-cell">{renderBatchTime(r.batch_time)}</TD>
                  <TD className="font-bold text-gray-400">₹{r.expected_amount}</TD>
                  <TD className="font-black text-purple-700">₹{r.paid_amount}</TD>
                  <TD>
                    <Badge variant={r.status.toLowerCase().includes("up") ? "green" : "danger"}>
                      {r.status}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      {!r.status.toLowerCase().includes("up") && (
                        <Button
                          size="sm"
                          variant="success"
                          className="bg-green-50 text-green-700 hover:bg-green-100 border-none shadow-none"
                          onClick={async () => {
                            const s = await fetchStudentByRoll(r.roll_number);
                            setForm({
                              roll: r.roll_number,
                              student: s?.student_name || r.student_name,
                              father: s?.father_name || r.father_name || "",
                              amount: s?.fee_month || "",
                              receipt: "",
                              paidOn: today,
                            });
                            setOpen(true);
                          }}
                        >
                          Pay
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-none shadow-none"
                        onClick={() =>
                          navigate("/portal/fees", {
                            state: { roll: r.roll_number, fromStatus: true },
                          })
                        }
                      >
                        Fees
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {/* PAGINATION */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || loading}
              onClick={() => fetchStatus(selectedBranch, page - 1)}
            >
              Previous
            </Button>

            <span className="text-sm font-bold text-gray-500 underline decoration-purple-200 decoration-4">Page {page + 1}</span>

            <Button
              size="sm"
              disabled={rows.length < PAGE_SIZE || loading}
              onClick={() => fetchStatus(selectedBranch, page + 1)}
            >
              Next Page
            </Button>
          </div>
        </Card>
      )}

      {/* PAYMENT MODAL */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Fees Payment"
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Confirm Payment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Roll Number" name="roll" value={form.roll} onChange={handleChange} />
          <Input label="Student Name" value={form.student} readOnly placeholder="Search result..." />
          <Input label="Father Name" value={form.father} readOnly placeholder="Search result..." />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              name="amount"
              type="number"
              value={form.amount}
              onChange={handleChange}
              icon={() => <span className="text-gray-400 font-bold">₹</span>}
            />
            <Input label="Receipt" name="receipt" value={form.receipt} onChange={handleChange} />
          </div>

          <Input label="Paid On" name="paidOn" type="date" value={form.paidOn} onChange={handleChange} />
        </div>
      </Modal>
    </div>
  );
}