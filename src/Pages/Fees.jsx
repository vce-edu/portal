import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../createClient";
import TransactionTable from "../components/TransactionTable";
import { useLocation } from "react-router-dom";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR } from "../components/ui/Table";

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
    } catch {
      // noop
    }
  };
  const backToHistoryPrompt = () => {
    setFeesHistory([]);
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
      // noop
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
      const formattedDate = form.paidOn.split('-').reverse().join('/');

      const { error } = await supabase.from("transaction").insert([
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div className="p-2 sm:p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl md:text-5xl font-black text-gray-900 tracking-tight">Finance</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setOpen(true)}
            variant="primary"
            className="flex-1 sm:flex-none shadow-purple-200"
            icon={() => (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          >
            Update Fees
          </Button>

          <Button
            onClick={openHistoryPrompt}
            variant="secondary"
            className="flex-1 sm:flex-none"
            icon={() => (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          >
            Fees History
          </Button>
        </div>
      </div>

      <Card className="bg-white/50 backdrop-blur-sm border-purple-50">
        <TransactionTable />
      </Card>

      {/* ----- Payment Modal ----- */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Fees Payment"
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loadingSubmit}>Cancel</Button>
            <Button onClick={handleSubmit} loading={loadingSubmit}>Pay Now</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Roll Number"
            name="roll"
            value={form.roll}
            onChange={handleChange}
            placeholder="e.g. m_101"
            autoFocus
          />
          <Input label="Student Name" value={form.student} readOnly placeholder="Auto-filled" />
          <Input label="Father Name" value={form.father} readOnly placeholder="Auto-filled" />

          <div className="grid grid-cols-2 gap-4">
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

      {/* ----- History Prompt Modal ----- */}
      <Modal
        isOpen={historyOpen && !feesHistory.length}
        onClose={() => setHistoryOpen(false)}
        title="Lookup History"
        maxWidth="max-w-sm"
      >
        <div className="space-y-6">
          <Input
            label="Student Roll"
            placeholder="Enter roll number..."
            value={selectedRoll}
            onChange={(e) => setSelectedRoll(e.target.value)}
            autoFocus
          />

          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={() => {
                if (!selectedRoll) return alert("Enter a roll number.");
                fetchFeesHistory(selectedRoll, 0);
              }}
              loading={loadingHistory}
              className="w-full"
            >
              Fetch History
            </Button>
            <div className="flex gap-2">
              <Button variant="success" className="flex-1" onClick={openPayForSelectedRoll}>Pay Fees</Button>
              <Button variant="outline" className="flex-1" onClick={() => setHistoryOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ----- History Display Modal ----- */}
      <Modal
        isOpen={feesHistory.length > 0}
        onClose={() => {
          setFeesHistory([]);
          setSelectedRoll("");
          setHistoryOpen(false);
        }}
        title={`History: ${selectedRoll.toUpperCase()}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="text-center py-2 bg-purple-50 rounded-2xl border border-purple-100">
            <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Student</p>
            <h3 className="text-xl font-black text-purple-700">
              {feesHistory[0]?.student_name?.toUpperCase() || "UNNAMED"}
            </h3>
          </div>

          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Date</TH>
                <TH>Receipt</TH>
                <TH>Amount</TH>
              </TR>
            </THead>
            <TBody>
              {feesHistory.map((f) => (
                <TR key={f.id}>
                  <TD className="text-gray-600 font-medium">{f.paid_on}</TD>
                  <TD className="text-gray-500">{f.receipt_no || "-"}</TD>
                  <TD><Badge variant="green">₹{f.amount_paid}</Badge></TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {hasMoreHistory && (
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => fetchFeesHistory(selectedRoll, historyPage + 1)} loading={loadingHistory}>
                Load More Records
              </Button>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-gray-100">
            <Button variant="secondary" className="flex-1" onClick={backToHistoryPrompt}>← Back</Button>
            <Button variant="success" className="flex-1" onClick={openPayForSelectedRoll}>Pay New Fees</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
