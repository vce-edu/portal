import React, { useState, useCallback, useRef, useEffect } from "react";
import { supabase, secSupabase } from "../createClient";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME = "application/pdf";
const BUCKET = "diplomas";

// ─── Step identifiers ─────────────────────────────────────────────────────────
const STEP = { LOOKUP: 1, FEE_CHECK: 2, UPLOAD: 3 };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sanitizeFileName(name) {
    // Remove path separators and keep only safe characters
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function generatePath(rollNumber) {
    const safeRoll = rollNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
    return safeRoll;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StepIndicator({ currentStep }) {
    const steps = [
        { id: STEP.LOOKUP, label: "Student Lookup" },
        { id: STEP.FEE_CHECK, label: "Fee Verification" },
        { id: STEP.UPLOAD, label: "Upload Diploma" },
    ];

    return (
        <div className="flex items-center gap-0 mb-8">
            {steps.map((s, i) => (
                <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center gap-1">
                        <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300 ${currentStep === s.id
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-200 scale-110"
                                : currentStep > s.id
                                    ? "bg-green-500 text-white"
                                    : "bg-gray-100 text-gray-400"
                                }`}
                        >
                            {currentStep > s.id ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                s.id
                            )}
                        </div>
                        <span
                            className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${currentStep === s.id ? "text-purple-600" : currentStep > s.id ? "text-green-500" : "text-gray-400"
                                }`}
                        >
                            {s.label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div
                            className={`flex-1 h-0.5 mx-3 mb-5 transition-all duration-500 ${currentStep > s.id ? "bg-green-400" : "bg-gray-200"
                                }`}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

function WarningBanner({ message, onContinue, onCancel, loading }) {
    return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-bold text-amber-800">Fee Warning</p>
                    <p className="text-sm text-amber-700 mt-0.5">{message}</p>
                </div>
            </div>
            <div className="flex gap-3">
                <Button variant="danger" size="sm" onClick={onContinue} disabled={loading} className="flex-1">
                    Continue Anyway
                </Button>
                <Button variant="outline" size="sm" onClick={onCancel} disabled={loading} className="flex-1">
                    Cancel
                </Button>
            </div>
        </div>
    );
}

function FileDropZone({ file, onFile, error }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            setDragOver(false);
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) onFile(droppedFile);
        },
        [onFile]
    );

    const handleChange = (e) => {
        const selected = e.target.files[0];
        if (selected) onFile(selected);
    };

    return (
        <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">Diploma PDF</label>
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-200 group
          ${dragOver ? "border-purple-400 bg-purple-50" : error ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50/40"}
        `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="sr-only"
                    onChange={handleChange}
                />

                {file ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                            <svg className="w-7 h-7 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v1H8zm0-3h8v1H8zm0-3h5v1H8z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900 truncate max-w-xs">{file.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <Badge variant="purple">PDF Selected · Click to Change</Badge>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                            <svg className="w-7 h-7 text-gray-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-700">
                                Drag & drop or <span className="text-purple-600 font-bold">browse</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-1">PDF only · Max {MAX_FILE_SIZE_MB} MB</p>
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="text-[11px] text-red-500 ml-1 font-bold italic">{error}</p>}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UploadDiploma() {
    // Step tracking
    const [step, setStep] = useState(STEP.LOOKUP);

    // Step 1 — Student lookup
    const [rollInput, setRollInput] = useState("");
    const [student, setStudent] = useState(null);       // { student_name, father_name, branch, ... }
    const [lookupError, setLookupError] = useState("");
    const [lookupLoading, setLookupLoading] = useState(false);

    // Step 2 — Fee status
    const [feeStatus, setFeeStatus] = useState(null);   // "up-to-date" | "pending" | "not-found"
    const [feeLoading, setFeeLoading] = useState(false);
    const [feeConfirmed, setFeeConfirmed] = useState(false);

    // Step 3 — Upload
    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);  // { path } on success
    const [uploadError, setUploadError] = useState("");

    // Debounce timer ref
    const debounceRef = useRef(null);

    // ── Clean up debounce on unmount ────────────────────────────────────────────
    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    // ── Step 1: Lookup student ──────────────────────────────────────────────────
    const lookupStudent = useCallback(async (roll) => {
        if (!roll.trim()) {
            setLookupError("");
            setStudent(null);
            return;
        }

        setLookupLoading(true);
        setLookupError("");
        setStudent(null);

        try {
            const { data, error } = await supabase
                .from("students")
                .select("student_name, father_name, branch, roll_number")
                .eq("roll_number", roll.trim())
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                // Not found is now a soft state handled in the UI, not a hard error
                setStudent({
                    roll_number: roll.trim(),
                    student_name: "Unknown Student",
                    father_name: "Manual Entry",
                    branch: "main",
                    isPlaceholder: true
                });
                return;
            }

            setStudent(data);
        } catch (err) {
            console.error("lookupStudent:", err);
            setLookupError("Failed to look up student. Please try again.");
        } finally {
            setLookupLoading(false);
        }
    }, []);

    const handleRollChange = (e) => {
        const val = e.target.value;
        setRollInput(val);
        setStudent(null);
        setLookupError("");

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => lookupStudent(val), 450);
    };

    const handleProceedToFeeCheck = async () => {
        if (!student) return;

        setFeeLoading(true);
        setFeeStatus(null);
        setFeeConfirmed(false);
        setStep(STEP.FEE_CHECK);

        try {
            // Use main supabase RPC — takes p_branch, p_search, p_limit, p_offset, p_only_pending
            const { data, error } = await supabase.rpc("get_student_fee_status", {
                p_branch: student.branch || "main",
                p_search: student.roll_number,
                p_limit: 1,
                p_offset: 0,
                p_only_pending: false,
            });

            if (error) throw error;

            const row = data?.[0];
            if (!row) {
                // No record found → treat as warning
                setFeeStatus("not-found");
            } else {
                const isUpToDate = row.status?.toLowerCase().includes("up");
                setFeeStatus(isUpToDate ? "up-to-date" : "pending");
                if (isUpToDate) {
                    // Auto-advance to upload
                    setFeeConfirmed(true);
                    setStep(STEP.UPLOAD);
                }
            }
        } catch (err) {
            console.error("feeCheck:", err);
            // Gracefully degrade — show warning so user can decide
            setFeeStatus("not-found");
        } finally {
            setFeeLoading(false);
        }
    };

    const handleFeeConfirm = () => {
        setFeeConfirmed(true);
        setStep(STEP.UPLOAD);
    };

    const handleFeeCancel = () => {
        // Reset everything back to step 1
        setStep(STEP.LOOKUP);
        setFeeStatus(null);
        setFeeConfirmed(false);
        setFile(null);
        setFileError("");
    };

    // ── Step 3: File validation ─────────────────────────────────────────────────
    const handleFileSelect = (selectedFile) => {
        setFileError("");
        setUploadResult(null);
        setUploadError("");

        if (!selectedFile) return;

        // MIME check (belt + suspenders over the accept attr)
        if (selectedFile.type !== ALLOWED_MIME) {
            setFileError("Only PDF files are allowed. Please select a valid .pdf file.");
            setFile(null);
            return;
        }

        // Size check
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            setFileError(`File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
            setFile(null);
            return;
        }

        // Empty file check
        if (selectedFile.size === 0) {
            setFileError("The selected file appears to be empty.");
            setFile(null);
            return;
        }

        setFile(selectedFile);
    };

    // ── Step 3: Upload ──────────────────────────────────────────────────────────
    const handleUpload = async () => {
        if (!file || !student) return;

        setUploading(true);
        setUploadError("");
        setUploadResult(null);

        try {
            const storagePath = generatePath(student.roll_number);

            const { error: uploadErr } = await secSupabase.storage
                .from(BUCKET)
                .upload(storagePath, file, {
                    contentType: ALLOWED_MIME,
                    upsert: false,       // never silently overwrite
                    cacheControl: "3600",
                });

            if (uploadErr) {
                // Supabase storage error objects have a `message` property
                throw new Error(uploadErr.message || "Upload failed");
            }

            setUploadResult({ path: storagePath });
            setFile(null);
        } catch (err) {
            console.error("upload:", err);
            setUploadError(err.message || "Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    // ── Reset entire flow ───────────────────────────────────────────────────────
    const handleReset = () => {
        setStep(STEP.LOOKUP);
        setRollInput("");
        setStudent(null);
        setLookupError("");
        setLookupLoading(false);
        setFeeStatus(null);
        setFeeLoading(false);
        setFeeConfirmed(false);
        setFile(null);
        setFileError("");
        setUploading(false);
        setUploadResult(null);
        setUploadError("");
    };

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="p-2 sm:p-6 max-w-2xl mx-auto space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">Upload Diploma</h1>
                <p className="text-gray-500 mt-2 font-medium">Issue and archive student diplomas securely</p>
            </div>

            <Card>
                <StepIndicator currentStep={step} />

                {/* ── STEP 1: Lookup ── */}
                {step === STEP.LOOKUP && (
                    <div className="space-y-6">
                        <div>
                            <Input
                                label="Student Roll Number"
                                placeholder="e.g. m_101"
                                value={rollInput}
                                onChange={handleRollChange}
                                error={lookupError}
                                autoFocus
                                icon={() => (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                )}
                            />
                            {lookupLoading && (
                                <div className="flex items-center gap-2 mt-2 ml-1">
                                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs text-gray-400 font-medium">Looking up student…</span>
                                </div>
                            )}
                        </div>

                        {/* Student preview card */}
                        {student && (
                            <div className={`border rounded-2xl p-5 space-y-3 animate-in fade-in duration-200 ${student.isPlaceholder ? "bg-amber-50 border-amber-100" : "bg-purple-50 border-purple-100"}`}>
                                <div className="flex items-center justify-between">
                                    <p className={`text-xs font-bold uppercase tracking-widest ${student.isPlaceholder ? "text-amber-500" : "text-purple-400"}`}>
                                        {student.isPlaceholder ? "Student Not Registered" : "Student Found"}
                                    </p>
                                    <Badge variant={student.isPlaceholder ? "yellow" : "green"}>
                                        {student.isPlaceholder ? "Unverified" : "Verified"}
                                    </Badge>
                                </div>

                                {student.isPlaceholder ? (
                                    <div className="space-y-2">
                                        <p className="text-sm text-amber-800 leading-relaxed font-medium">
                                            Roll number <span className="font-black">"{student.roll_number}"</span> is not in our records. You can still proceed if this is a valid manual entry.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</p>
                                            <p className="text-sm font-bold text-gray-900 mt-0.5">{student.student_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Roll No.</p>
                                            <p className="text-sm font-bold text-gray-900 mt-0.5">{student.roll_number}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Father's Name</p>
                                            <p className="text-sm font-medium text-gray-700 mt-0.5">{student.father_name || "—"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Branch</p>
                                            <p className="text-sm font-medium text-gray-700 mt-0.5 capitalize">{student.branch || "—"}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <Button
                            variant={student?.isPlaceholder ? "warning" : "primary"}
                            size="full"
                            disabled={!student || lookupLoading}
                            onClick={handleProceedToFeeCheck}
                        >
                            {student?.isPlaceholder ? "Bypass & Use this Roll Number →" : "Verify Fee Status →"}
                        </Button>
                    </div>
                )}

                {/* ── STEP 2: Fee Check ── */}
                {step === STEP.FEE_CHECK && (
                    <div className="space-y-6">
                        {/* Student summary strip */}
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Checking fees for</p>
                                <p className="text-sm font-black text-gray-900">{student?.student_name} · {student?.roll_number}</p>
                            </div>
                            <Button variant="ghost" size="xs" onClick={handleFeeCancel}>← Back</Button>
                        </div>

                        {feeLoading && (
                            <div className="flex flex-col items-center gap-4 py-10">
                                <div className="w-10 h-10 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm font-medium text-gray-500">Checking fee records…</p>
                            </div>
                        )}

                        {!feeLoading && feeStatus === "up-to-date" && (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-4">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-green-800">Fees are up-to-date</p>
                                    <p className="text-xs text-green-600 mt-0.5">Proceeding to diploma upload…</p>
                                </div>
                            </div>
                        )}

                        {!feeLoading && feeStatus === "pending" && (
                            <WarningBanner
                                message="Fee dues are pending for this student. Do you want to continue uploading the diploma anyway?"
                                onContinue={handleFeeConfirm}
                                onCancel={handleFeeCancel}
                            />
                        )}

                        {!feeLoading && feeStatus === "not-found" && (
                            <WarningBanner
                                message="No fee records were found for this student. The fees status could not be verified. Do you want to continue uploading the diploma anyway?"
                                onContinue={handleFeeConfirm}
                                onCancel={handleFeeCancel}
                            />
                        )}
                    </div>
                )}

                {/* ── STEP 3: Upload ── */}
                {step === STEP.UPLOAD && (
                    <div className="space-y-6">
                        {/* Student + fee status summary strip */}
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Uploading diploma for</p>
                                <p className="text-sm font-black text-gray-900">{student?.student_name} · {student?.roll_number}</p>
                            </div>
                            {feeStatus === "up-to-date" ? (
                                <Badge variant="green">Fees OK</Badge>
                            ) : (
                                <Badge variant="yellow">Fee Warning Bypassed</Badge>
                            )}
                        </div>

                        {/* Success state */}
                        {uploadResult ? (
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 space-y-4 animate-in fade-in duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                                        <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-green-800">Diploma Uploaded Successfully!</p>
                                        <p className="text-xs text-green-600 mt-0.5">The diploma has been archived in secure storage.</p>
                                    </div>
                                </div>
                                <div className="bg-white/70 rounded-xl p-3 border border-green-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Storage Path</p>
                                    <p className="text-xs font-mono text-gray-700 break-all">{BUCKET}/{uploadResult.path}</p>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="primary" size="sm" className="flex-1" onClick={handleReset}>
                                        Upload Another
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <FileDropZone file={file} onFile={handleFileSelect} error={fileError} />

                                {uploadError && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                        <p className="text-sm text-red-600 font-bold">{uploadError}</p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        size="md"
                                        onClick={handleReset}
                                        disabled={uploading}
                                        className="flex-1"
                                    >
                                        Start Over
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="md"
                                        onClick={handleUpload}
                                        disabled={!file || uploading}
                                        className="flex-1"
                                        icon={uploading ? () => (
                                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        ) : undefined}
                                    >
                                        {uploading ? "Uploading…" : "Upload Diploma"}
                                    </Button>
                                </div>

                                <p className="text-[10px] text-gray-400 text-center font-medium">
                                    Saved as <code className="bg-gray-100 px-1 rounded">{BUCKET}/{student?.roll_number?.replace(/[^a-zA-Z0-9_-]/g, "_")}</code>
                                </p>
                            </>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}
