import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../createClient";
import TransactionTable from "../components/TransactionTable";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR } from "../components/ui/Table";
import { renderBatchTime } from "../components/ui/BatchTimePicker";

const HISTORY_PAGE_LIMIT = 20;

const printReceipt = (receipt) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.write(`
    <html>
      <head>
        <title>Receipt - ${receipt.receipt_no || "N/A"}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 20mm;
          }
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #333;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .receipt-container {
            max-width: 100%;
            margin: 20px 0 0 0;
            border: 1px dashed #7c3aed;
            padding: 12px 16px;
            border-radius: 8px;
            background: #fff;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #7c3aed;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .logo {
            font-size: 15px;
            font-weight: 800;
            color: #7c3aed;
            margin: 0 0 2px 0;
            text-transform: uppercase;
          }
          .subtitle {
            font-size: 9px;
            color: #666;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .receipt-title {
            font-size: 12px;
            font-weight: 700;
            margin: 4px 0 0 0;
            color: #111;
          }
          .details-grid {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 8px;
          }
          .detail-item {
            font-size: 12px;
            display: flex;
            justify-content: space-between;
            line-height: 1.1;
          }
          .label {
            font-weight: 600;
            color: #666;
          }
          .value {
            color: #111;
            font-weight: 500;
          }
          .fee-row {
            border-top: 1px solid #e5e7eb;
            border-bottom: 1px solid #e5e7eb;
            padding: 4px 0;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
          }
          .fee-label {
            font-weight: 600;
            color: #4b5563;
          }
          .fee-amount {
            font-weight: 700;
            color: #111;
          }
          .total-box {
            background: #f3f4f6;
            padding: 6px 10px;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-sizing: border-box;
          }
          .total-label {
            font-size: 10px;
            color: #4b5563;
            font-weight: 600;
            text-transform: uppercase;
          }
          .total-amount {
            font-size: 14px;
            font-weight: 800;
            color: #111;
          }
          .footer-note {
            text-align: center;
            font-size: 9px;
            color: #9ca3af;
            margin-top: 10px;
            border-top: 1px dashed #e5e7eb;
            padding-top: 4px;
          }
          @media print {
            body {
              padding: 0;
            }
            .receipt-container {
              border: 1px dashed #7c3aed !important;
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h1 class="logo">Vintech Computer Education</h1>
            <p class="subtitle">VCE, Bareilly</p>
            <h2 class="receipt-title">FEE RECEIPT</h2>
          </div>
          
          <div class="details-grid">
            <div class="detail-item">
              <span class="label">Receipt No:</span>
              <span class="value" style="font-weight: 700;">${receipt.receipt_no || "N/A"}</span>
            </div>
            <div class="detail-item">
              <span class="label">Date Paid:</span>
              <span class="value">${receipt.paid_on}</span>
            </div>
            <div class="detail-item">
              <span class="label">Student Name:</span>
              <span class="value" style="font-weight: 700;">${receipt.student_name.toUpperCase()}</span>
            </div>
            <div class="detail-item">
              <span class="label">Roll Number:</span>
              <span class="value" style="font-weight: 700; font-family: monospace;">${receipt.roll_no.toUpperCase()}</span>
            </div>
            <div class="detail-item">
              <span class="label">Father's Name:</span>
              <span class="value">${receipt.father_name || "N/A"}</span>
            </div>
            <div class="detail-item">
              <span class="label">Course:</span>
              <span class="value">${receipt.course || "N/A"}</span>
            </div>
            <div class="detail-item">
              <span class="label">Batch Time:</span>
              <span class="value">${receipt.batch_time || "N/A"}</span>
            </div>
          </div>

          <div class="fee-row">
            <span class="fee-label">Tuition Fee Payment</span>
            <span class="fee-amount">₹${receipt.amount_paid}</span>
          </div>

          <div class="total-box">
            <span class="total-label">Total Paid</span>
            <span class="total-amount">₹${receipt.amount_paid}</span>
          </div>

          <div class="footer-note">
            Thank you for your payment. This is a computer-generated receipt.
          </div>
        </div>
      </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
};

export default function Fees() {
  const location = useLocation();
  const navigate = useNavigate();
  const passedRoll = location.state?.roll;
  const fromStatus = location.state?.fromStatus ?? false;
  const fromStudents = location.state?.fromStudents ?? false;
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
    course: "",
    batchTime: "",
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
  const [successReceipt, setSuccessReceipt] = useState(null);

  // loading flags
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(false);

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

        // close print success modal
        if (successReceipt) {
          setSuccessReceipt(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, historyOpen, successReceipt]);

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
        course: "",
        batchTime: "",
        amount: "",
        receipt: "",
      }));
      return;
    }

    setLoadingStudent(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("student_name, father_name, fee_month, course, batch_time")
        .eq("roll_number", roll)
        .limit(1)
        .single();

      if (error) {
        // If no row found, just clear details (don't spam user)
        setForm((prev) => ({
          ...prev,
          student: "",
          father: "",
          course: "",
          batchTime: "",
          amount: "",
          receipt: "",
        }));
      } else if (data) {
        setForm((prev) => ({
          ...prev,
          student: data.student_name,
          father: data.father_name,
          course: data.course,
          batchTime: renderBatchTime(data.batch_time),
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
      const receiptData = {
        roll_no: form.roll,
        student_name: form.student,
        father_name: form.father,
        amount_paid: form.amount,
        receipt_no: form.receipt || "",
        paid_on: formattedDate,
        course: form.course,
        batch_time: form.batchTime,
      };

      setOpen(false);
      notifyTransactionTable();
      setSuccessReceipt(receiptData);

      setForm({
        roll: "",
        student: "",
        father: "",
        course: "",
        batchTime: "",
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
        maxWidth="max-w-md"
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
          <Input
            label="Student Name"
            value={form.student}
            readOnly
            placeholder={loadingStudent ? "Searching..." : "Auto-filled"}
            className={loadingStudent ? "animate-pulse" : ""}
          />
          <Input
            label="Father Name"
            value={form.father}
            readOnly
            placeholder={loadingStudent ? "Searching..." : "Auto-filled"}
            className={loadingStudent ? "animate-pulse" : ""}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Course"
              value={form.course}
              readOnly
              placeholder={loadingStudent ? "Searching..." : "Auto-filled"}
              className={loadingStudent ? "animate-pulse" : ""}
            />
            <Input
              label="Batch Time"
              value={form.batchTime}
              readOnly
              placeholder={loadingStudent ? "Searching..." : "Auto-filled"}
              className={loadingStudent ? "animate-pulse" : ""}
            />
          </div>

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
        maxWidth="max-w-md"
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
          <div className="text-center py-3 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col items-center gap-1">
            <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Student</p>
            <h3 className="text-xl font-black text-purple-700">
              {feesHistory[0]?.student_name?.toUpperCase() || "UNNAMED"}
            </h3>
            <Badge variant="emerald" className="mt-1 text-sm font-bold px-3 py-1">
              Total Paid: ₹{feesHistory.reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0)}
            </Badge>
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
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                if (fromStatus) {
                  // came from Status page — go back there
                  setFeesHistory([]);
                  setSelectedRoll("");
                  setHistoryOpen(false);
                  navigate("/portal/status");
                } else if (fromStudents) {
                  // came from Students page — go back there
                  setFeesHistory([]);
                  setSelectedRoll("");
                  setHistoryOpen(false);
                  navigate("/portal/students");
                } else {
                  backToHistoryPrompt();
                }
              }}
            >
              ← Back
            </Button>
            <Button variant="success" className="flex-1" onClick={openPayForSelectedRoll}>Pay New Fees</Button>
          </div>
        </div>
      </Modal>

      {/* ----- Receipt Print Prompt Modal ----- */}
      <Modal
        isOpen={!!successReceipt}
        onClose={() => setSuccessReceipt(null)}
        title="Payment Successful!"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setSuccessReceipt(null)}>Close</Button>
            <Button variant="success" onClick={() => printReceipt(successReceipt)}>Print Receipt</Button>
          </>
        }
      >
        {successReceipt && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-emerald-800">Fee Payment Received</h3>
              <p className="text-sm text-emerald-600 mt-1">Transaction has been recorded successfully.</p>
            </div>

            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Student Name:</span>
                <span className="text-gray-900 font-bold">{successReceipt.student_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Roll Number:</span>
                <span className="text-gray-900 font-mono font-bold uppercase">{successReceipt.roll_no}</span>
              </div>
              {successReceipt.father_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Father's Name:</span>
                  <span className="text-gray-900 font-medium">{successReceipt.father_name}</span>
                </div>
              )}
              {successReceipt.course && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Course:</span>
                  <span className="text-gray-900 font-medium">{successReceipt.course}</span>
                </div>
              )}
              {successReceipt.batch_time && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Batch Time:</span>
                  <span className="text-gray-900 font-medium">{successReceipt.batch_time}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Receipt No:</span>
                <span className="text-gray-900 font-medium">{successReceipt.receipt_no || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Amount Paid:</span>
                <span className="text-emerald-700 font-black">₹{successReceipt.amount_paid}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Paid On:</span>
                <span className="text-gray-900 font-medium">{successReceipt.paid_on}</span>
              </div>
            </div>

            <p className="text-xs text-center text-gray-400">
              Would you like to print a physical receipt for this transaction?
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
