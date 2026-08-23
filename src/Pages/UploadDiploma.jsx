import React, { useState, useCallback, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import { supabase, secSupabase } from "../createClient";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";

// ─── Constants ────────────────────────────────────────────────────────────────
const ALLOWED_MIME = "application/pdf";
const BUCKET = "diplomas";

const INSTITUTE_NAME = "VINTECH COMPUTER EDUCATION";

const BRANCH_ADDRESS_BY_PREFIX = {
    m_: "ADDRESS : DHORA ROAD, BAREILLY",
    s_: "ADDRESS : GREEN PARK, BAREILLY",
    t_: "ADDRESS : BHUTA, BAREILLY",
    a_: "ADDRESS : AGRA",
};
const DEFAULT_INSTITUTE_ADDRESS = "ADDRESS : DHORA ROAD, BAREILLY";

function getInstituteAddress(rollNumber) {
    if (!rollNumber) return DEFAULT_INSTITUTE_ADDRESS;
    const prefix = rollNumber.toLowerCase().match(/^[a-z]+_/)?.[0];
    return (prefix && BRANCH_ADDRESS_BY_PREFIX[prefix]) || DEFAULT_INSTITUTE_ADDRESS;
}
const INSTITUTE_REGD_NO = "3177";
const INSTITUTE_VERIFY_URL = "Online Certificate Verification - Vintecheducation.in";
const DIRECTOR_NAME = "Manish Vishwakarma";
const DIRECTOR_TITLE = "Center Director";
const SIGNATURE_IMAGE_BASE64 = "data:image/png;base64,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KARCIARCIATmE4hDn88sZ4RACIRACITA4gjEoS+uS9KgEAiBEAiBEJhPIA59PrOcEQIhEAIhEAKLIxCHvrguSYNCIARCIARCYD6BOPT5zHJGCIRACIRACCyOQBz64rokDQqBEAiBEAiB+QTi0OczyxkhEAIhEAIhsDgCceiL65I0KARCIARCIATmE4hDn88sZ4RACIRACITA4gjEoS+uS9KgEAiBEAiBEJhPIA59PrOcEQIhEAIhEAKLIxCHvrguSYNCIARCIARCYD6BOPT5zHJGCIRACIRACCyOQBz64rokDQqBEAiBEAiB+QTi0OczyxkhEAIhEAIhsDgCceiL65I0KARCIARCIATmE4hDn88sZ4RACIRACITA4gjEoS+uS9KgEAiBEAiBEJhPIA59PrOcEQIhEAIhEAKLIxCHvrguSYNCIARCIARCYD6BOPT5zHJGCIRACIRACCyOQBz64rokDQqBEAiBEAiB+QTi0OczyxkhEAIhEAIhsDgCceiL65I0KARCIARCIATmE4hDn88sZ4RACIRACITA4gjEoS+uS9KgEAiBEAiBEJhPIA59PrOcEQIhEAIhEAKLIxCHvrguSYNCIARCIARCYD6BOPT5zHJGCIRACIRACCyOQBz64rokDQqBEAiBEAiB+QTi0OczyxkhEAIhEAIhsDgCceiL65I0KARCIARCIATmE4hDn88sZ4RACIRACITA4gjEoS+uS9KgEAiBEAiBEJhPIA59PrOcEQIhEAIhEAKLIxCHvrguSYNCIARCIARCYD6BOPT5zHJGCIRACIRACCyOQBz64rokDQqBEAiBEAiB+QTi0OczyxkhEAIhEAIhsDgCceiL65I0KARCIARCIATmE4hDn88sZ4RACIRACITA4gjEoS+uS9KgEAiBEAiBEJhPIA59PrOcEQIhEAIhEAKLIxCHvrguSYNCIARCIARCYD6BOPT5zHJGCIRACIRACCyOQBz64rokDQqBEAiBEAiB+QTi0OczyxkhEAIhEAIhsDgCceiL65I0KARCIARCIATmE4hDn88sZ4RACIRACITA4gjEoS+uS9KgEAiBEAiBEJhPIA59PrOcEQIhEAIhEAKLIxCHvrguSYNCIARCIARCYD6B/wd37EoPJh3bmAAAAABJRU5ErkJggg==";
// ─── Step identifiers ─────────────────────────────────────────────────────────
const STEP = { LOOKUP: 1, FEE_CHECK: 2, DETAILS: 3, GENERATE: 4 };

let subjectIdCounter = 0;
function makeEmptySubject() {
    subjectIdCounter += 1;
    return {
        id: `subj_${subjectIdCounter}`,
        subject: "",
        examType: "",
        maxMarks: "",
        minMarks: 0,
        obtainedMarks: "",
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generatePath(rollNumber) {
    const safeRoll = (rollNumber || "diploma").replace(/[^a-zA-Z0-9_-]/g, "_");
    return safeRoll;
}

function toNumber(val) {
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : 0;
}

// admission_date is stored as free-form text — display it nicely if it parses as a date,
// otherwise fall back to the raw stored value.
function formatAdmissionDate(raw) {
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// Derives grade + division from a percentage, matching the classification table
function classify(percentage, hasMarks) {
    if (!hasMarks) return { grade: "—", division: "—" };
    if (percentage >= 85) return { grade: "A+", division: "Distinction" };
    if (percentage >= 60) return { grade: "A", division: "1st Division" };
    if (percentage >= 45) return { grade: "B", division: "2nd Division" };
    if (percentage >= 33) return { grade: "C", division: "3rd Division" };
    return { grade: "F", division: "Fail" };
}

function computeTotals(subjects) {
    const totalMax = subjects.reduce((sum, s) => sum + toNumber(s.maxMarks), 0);
    const totalObtained = subjects.reduce((sum, s) => sum + toNumber(s.obtainedMarks), 0);
    const hasMarks = totalMax > 0;
    const percentage = hasMarks ? (totalObtained / totalMax) * 100 : 0;
    const { grade, division } = classify(percentage, hasMarks);
    return { totalMax, totalObtained, percentage, grade, division, hasMarks };
}

// Generates the Marksheet & Diploma certificate PDF and returns a Blob.
function generateDiplomaPDF(data) {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 26;
    const inner = margin + 10;

    // ── Decorative borders ──
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(1.2);
    doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);
    doc.setLineWidth(0.6);
    doc.rect(inner, inner, pageWidth - inner * 2, pageHeight - inner * 2);

    // Small "+" cross pattern tracing the outer border
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    const step = 13;
    for (let x = margin; x <= pageWidth - margin; x += step) {
        doc.text("+", x, margin - 4, { align: "center" });
        doc.text("+", x, pageHeight - margin + 8, { align: "center" });
    }
    for (let y = margin; y <= pageHeight - margin; y += step) {
        doc.text("+", margin - 10, y, { align: "center" });
        doc.text("+", pageWidth - margin + 10, y, { align: "center" });
    }

    // ── Header: logo + institute info ──
    const logoCx = inner + 45;
    const logoCy = inner + 48;
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(1.2);
    doc.circle(logoCx, logoCy, 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.text("VCE", logoCx, logoCy + 5, { align: "center" });

    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.text(INSTITUTE_NAME, pageWidth / 2 + 20, inner + 38, { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(getInstituteAddress(data.rollNumber), pageWidth / 2 + 20, inner + 56, { align: "center" });
    doc.text(`REGD. NO. ${INSTITUTE_REGD_NO}`, pageWidth / 2 + 20, inner + 72, { align: "center" });
    let y = inner + 110;

    // ── Marksheet / Certificate / Roll numbers ──
    doc.setFont("times", "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    doc.text(`Marksheet No. ${data.marksheetNo || "................."}`, inner + 20, y);
    doc.text(`Certificate No. ${data.certificateNo || "................."}`, pageWidth - inner - 20, y, { align: "right" });
    y += 18;
    doc.text(`Roll No. ${data.rollNumber || "................."}`, inner + 20, y);
    y += 26;

    // ── Title band ──
    const bandW = 230;
    doc.setFillColor(35, 35, 35);
    doc.roundedRect(pageWidth / 2 - bandW / 2, y - 14, bandW, 26, 5, 5, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("Marksheet and Diploma", pageWidth / 2, y + 4, { align: "center" });
    y += 34;

    doc.setFont("times", "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    doc.text(`Marksheet Issued Year..... ${data.marksheetYear || ""}`, pageWidth / 2, y, { align: "center" });
    y += 28;

    // ── Certification paragraph ──
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    const fieldLine = (label, value) => {
        doc.text(label, inner + 20, y);
        const labelWidth = doc.getTextWidth(label);
        const lineStartX = inner + 20 + labelWidth + 4;
        const lineEndX = pageWidth - inner - 20;
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.5);
        doc.line(lineStartX, y + 2, lineEndX, y + 2);
        doc.setFont("times", "bold");
        doc.text(value || "", lineStartX + 4, y);
        doc.setFont("times", "italic");
        y += 22;
    };

    fieldLine("This is Certified that Mr./Mrs.", data.studentName?.toUpperCase() || "—");
    fieldLine("Father Name", data.fatherName?.toUpperCase() || "—");
    fieldLine("Mother Name", data.motherName?.toUpperCase() || "—");

    doc.setFont("times", "italic");
    doc.setFontSize(10.5);
    const completedLine = `HAS SUCCESSFULLY COMPLETED THE COURSE ${data.course?.toUpperCase() || "—"}  FROM ${data.courseFrom?.toUpperCase() || "—"}`;
    doc.text(doc.splitTextToSize(completedLine, pageWidth - inner * 2 - 40), inner + 20, y);
    y += 18;
    doc.text(`OUR INSTITUTE COURSE DURATION IS ${data.courseDuration || "—"}`, inner + 20, y);
    y += 20;
    doc.setFont("times", "bold");
    const assessLine =
        "WE ARE ISSUING A MARK SHEET OBTAINED BY YOU IN COMPUTER BASED TEST EXAM BY OUR INSTITUTE ASSESSMENT.";
    const assessLines = doc.splitTextToSize(assessLine, pageWidth - inner * 2 - 40);
    doc.text(assessLines, inner + 20, y);
    y += assessLines.length * 13 + 12;

    // ── Subjects table ──
    const tableX = inner + 20;
    const tableW = pageWidth - inner * 2 - 40;
    const colWidths = {
        sno: tableW * 0.08,
        subject: tableW * 0.33,
        examType: tableW * 0.19,
        max: tableW * 0.13,
        min: tableW * 0.13,
        obtained: tableW * 0.14,
    };
    const headerH = 30;
    const subjects = data.subjects && data.subjects.length ? data.subjects : [{}];
    const availableH = Math.max(70, pageHeight - inner - 210 - y);
    const rowH = Math.min(24, Math.max(16, availableH / subjects.length));

    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.7);
    doc.rect(tableX, y, tableW, headerH + rowH * subjects.length);

    let cx = tableX;
    const cols = ["sno", "subject", "examType", "max", "min", "obtained"];
    const tableBottomY = y + headerH + rowH * subjects.length;
    cols.forEach((c) => {
        if (c === "min") {
            doc.line(cx, y + headerH / 2, cx, tableBottomY);
        } else {
            doc.line(cx, y, cx, tableBottomY);
        }
        cx += colWidths[c];
    });
    doc.line(tableX + tableW, y, tableX + tableW, tableBottomY);

    // Header row
    doc.setLineWidth(0.7);
    doc.line(tableX, y + headerH, tableX + tableW, y + headerH);
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);

    const totalMarksColX = tableX + colWidths.sno + colWidths.subject + colWidths.examType;
    const totalMarksColW = colWidths.max + colWidths.min;
    const midHeaderY = y + headerH / 2; 
    const singleRowBaselineY = y + headerH / 2 + 3; 

    let hx = tableX;
    doc.text("S.No", hx + colWidths.sno / 2, singleRowBaselineY, { align: "center" });
    hx += colWidths.sno;
    doc.text("Subject Name", hx + colWidths.subject / 2, singleRowBaselineY, { align: "center" });
    hx += colWidths.subject;
    doc.text("Exam Type", hx + colWidths.examType / 2, singleRowBaselineY, { align: "center" });
    hx += colWidths.examType;

    // "Total Marks" merged header spanning MAX + MIN, split from its sub-row by a divider line
    doc.text("Total Marks", totalMarksColX + totalMarksColW / 2, y + headerH / 2 - 3, { align: "center" });
    doc.setLineWidth(0.5);
    doc.line(totalMarksColX, midHeaderY, totalMarksColX + totalMarksColW, midHeaderY);
    doc.setFontSize(7.5);
    doc.text("MAX", totalMarksColX + colWidths.max / 2, y + headerH - 6, { align: "center" });
    doc.text("MIN", totalMarksColX + colWidths.max + colWidths.min / 2, y + headerH - 6, { align: "center" });
    hx += colWidths.max + colWidths.min;

    doc.setFontSize(9);
    doc.text("Obtain Marks", hx + colWidths.obtained / 2, singleRowBaselineY, { align: "center" });

    // Body rows
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    let ry = y + headerH;
    subjects.forEach((s, i) => {
        if (i > 0) doc.line(tableX, ry, tableX + tableW, ry);
        const rowMidY = ry + rowH / 2 + 3;
        let rx = tableX;
        doc.text(String(i + 1), rx + colWidths.sno / 2, rowMidY, { align: "center" });
        rx += colWidths.sno;
        doc.text(s.subject || "—", rx + 6, rowMidY);
        rx += colWidths.subject;
        doc.text(s.examType || "—", rx + colWidths.examType / 2, rowMidY, { align: "center" });
        rx += colWidths.examType;
        doc.text(s.maxMarks !== "" && s.maxMarks != null ? String(s.maxMarks) : "—", rx + colWidths.max / 2, rowMidY, { align: "center" });
        rx += colWidths.max;
        doc.text(s.minMarks !== "" && s.minMarks != null ? String(s.minMarks) : "—", rx + colWidths.min / 2, rowMidY, { align: "center" });
        rx += colWidths.min;
        doc.text(s.obtainedMarks !== "" && s.obtainedMarks != null ? String(s.obtainedMarks) : "—", rx + colWidths.obtained / 2, rowMidY, { align: "center" });
        ry += rowH;
    });

    y = y + headerH + rowH * subjects.length + 22;

    // ── Totals / percentage / division / grade ──
    doc.setFont("times", "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    doc.text(
        `YOUR OBTAINED TOTAL MARKS ${data.totalObtained ?? 0} FROM ${data.totalMax ?? 0}`,
        tableX,
        y
    );
    y += 20;
    doc.text(
        `PERCENTAGE ${data.hasMarks ? data.percentage.toFixed(2) + "%" : "—"}   DIVISION ${data.division}   GRADE ${data.grade}`,
        tableX,
        y
    );
    y += 18;

    // ── Classification of grade (small static table, bottom right) ──
    const classifyRows = [
        ["% OF MARKS", "GRADE", "DIVISION"],
        ["85% ABOVE", "A+", "DISTINCTION"],
        ["60% ABOVE", "A", "1st DIVISION"],
        ["45% ABOVE", "B", "2nd DIVISION"],
        ["33% ABOVE", "C", "3rd DIVISION"],
        ["33% BELOW", "-", "FAIL"],
    ];
    const clW = 240;
    const clColW = [clW * 0.4, clW * 0.25, clW * 0.35];
    const clRowH = 13;
    const clX = tableX + tableW - clW;
    let clY = y + 4;
    doc.setLineWidth(0.5);
    doc.setDrawColor(90, 90, 90);
    doc.rect(clX, clY, clW, clRowH * classifyRows.length);
    let colX = clX;
    clColW.forEach((w) => {
        doc.line(colX, clY, colX, clY + clRowH * classifyRows.length);
        colX += w;
    });
    doc.line(clX + clW, clY, clX + clW, clY + clRowH * classifyRows.length);
    doc.setFontSize(7.5);
    classifyRows.forEach((row, i) => {
        const rowY = clY + i * clRowH;
        if (i > 0) doc.line(clX, rowY, clX + clW, rowY);
        doc.setFont("times", i === 0 ? "bold" : "normal");
        let tx = clX;
        row.forEach((cell, j) => {
            doc.text(cell, tx + clColW[j] / 2, rowY + 9.5, { align: "center" });
            tx += clColW[j];
        });
    });
    y = clY + clRowH * classifyRows.length + 26;

    // ── Footer: verification + signature ──
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    doc.text(INSTITUTE_VERIFY_URL, tableX, y);

    const sigX2 = tableX + tableW;
const sigX1 = sigX2 - 170;

// Signature image, sized to fit above the line while preserving its aspect ratio
const sigImgW = 130;
const sigImgH = sigImgW * (150 / 500); // source image is 500x150
const sigLineY = y + 34;
doc.addImage(
    SIGNATURE_IMAGE_BASE64,
    "PNG",
    (sigX1 + sigX2) / 2 - sigImgW / 2,
    sigLineY - 4 - sigImgH - 2,
    sigImgW,
    sigImgH
);

doc.setDrawColor(60, 60, 60);
doc.setLineWidth(0.6);
doc.line(sigX1, sigLineY - 4, sigX2, sigLineY - 4);
doc.setFont("times", "bold");
doc.setFontSize(9.5);
doc.setTextColor(20, 20, 20);
doc.text(DIRECTOR_NAME, (sigX1 + sigX2) / 2, sigLineY + 10, { align: "center" });
doc.setFont("times", "normal");
doc.text(DIRECTOR_TITLE, (sigX1 + sigX2) / 2, sigLineY + 22, { align: "center" });
    return doc.output("blob");
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StepIndicator({ currentStep }) {
    const steps = [
        { id: STEP.LOOKUP, label: "Student Lookup" },
        { id: STEP.FEE_CHECK, label: "Fee Verification" },
        { id: STEP.DETAILS, label: "Diploma Details" },
        { id: STEP.GENERATE, label: "Generate & Upload" },
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

function TextField({ label, value, onChange, placeholder, className = "" }) {
    return (
        <div className={className}>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="mt-1 w-full text-sm font-medium text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300"
            />
        </div>
    );
}

function SubjectsTable({ subjects, onChange, onAdd, onRemove }) {
    const update = (id, field, value) => {
        onChange(subjects.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Subjects & Marks</label>
                <Button variant="outline" size="sm" onClick={onAdd}>+ Add New Subject</Button>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-auto max-h-80">
                <div className="min-w-[600px]">
                <div className="grid grid-cols-[2.2fr_1.4fr_0.9fr_0.9fr_0.9fr_40px] bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">
                    <span>Subject Name</span>
                    <span>Exam Type</span>
                    <span>Max</span>
                    <span>Obtained</span>
                    <span></span>
                </div>
                {subjects.map((s, i) => (
                    <div
                        key={s.id}
                        className={`grid grid-cols-[2.2fr_1.4fr_0.9fr_0.9fr_0.9fr_40px] gap-2 items-center px-3 py-2 ${i % 2 ? "bg-white" : "bg-gray-50/40"}`}
                    >
                        <input
                            value={s.subject}
                            onChange={(e) => update(s.id, "subject", e.target.value)}
                            placeholder="e.g. MS Excel"
                            className="text-sm font-medium bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                        <input
                            value={s.examType}
                            onChange={(e) => update(s.id, "examType", e.target.value)}
                            placeholder="Practical"
                            className="text-sm font-medium bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                        <input
                            type="number"
                            value={s.maxMarks}
                            onChange={(e) => update(s.id, "maxMarks", e.target.value)}
                            placeholder="100"
                            className="text-sm font-medium bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                        <input
                            type="number"
                            value={s.obtainedMarks}
                            onChange={(e) => update(s.id, "obtainedMarks", e.target.value)}
                            placeholder="88"
                            className="text-sm font-medium bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                        <button
                            type="button"
                            onClick={() => onRemove(s.id)}
                            disabled={subjects.length === 1}
                            className="text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-300 transition-colors"
                            title="Remove subject"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
                </div>
            </div>
        </div>
    );
}

function TotalsSummary({ totals }) {
    return (
        <div className="grid grid-cols-4 gap-3">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Total</p>
                <p className="text-sm font-black text-purple-700 mt-0.5">{totals.totalObtained} / {totals.totalMax}</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Percentage</p>
                <p className="text-sm font-black text-purple-700 mt-0.5">{totals.hasMarks ? `${totals.percentage.toFixed(2)}%` : "—"}</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Division</p>
                <p className="text-sm font-black text-purple-700 mt-0.5">{totals.division}</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Grade</p>
                <p className="text-sm font-black text-purple-700 mt-0.5">{totals.grade}</p>
            </div>
        </div>
    );
}

// Shows a generated diploma PDF preview with download + regenerate controls
function DiplomaPreview({ previewUrl, fileName, onRegenerate, generating }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">Diploma Preview</label>
                {!generating && <Badge variant="purple">Auto-generated PDF</Badge>}
            </div>

            <div className="relative rounded-2xl border-2 border-gray-200 bg-gray-50 overflow-hidden">
                {generating || !previewUrl ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20">
                        <div className="w-8 h-8 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-medium text-gray-500">Generating diploma…</p>
                    </div>
                ) : (
                    <iframe title="Diploma preview" src={previewUrl} className="w-full h-[520px] bg-white" />
                )}
            </div>

            {!generating && previewUrl && (
                <div className="flex gap-3">
                    <a href={previewUrl} download={fileName} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">Download PDF</Button>
                    </a>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={onRegenerate}>Regenerate</Button>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UploadDiploma() {
    // Step tracking
    const [step, setStep] = useState(STEP.LOOKUP);

    // Step 1 — Student lookup
    const [rollInput, setRollInput] = useState("");
    const [student, setStudent] = useState(null);       // { student_name, father_name, branch, roll_number }
    const [lookupError, setLookupError] = useState("");
    const [lookupLoading, setLookupLoading] = useState(false);

    // Step 2 — Fee status
    const [feeStatus, setFeeStatus] = useState(null);   // "up-to-date" | "pending" | "not-found"
    const [feeLoading, setFeeLoading] = useState(false);
    const [feeConfirmed, setFeeConfirmed] = useState(false);

    // Step 3 — Diploma details (mix of DB-sourced + manual)
    const [studentNameInput, setStudentNameInput] = useState("");
    const [fatherNameInput, setFatherNameInput] = useState("");
    const [motherName, setMotherName] = useState("");
    const [course, setCourse] = useState("");
    const [courseFrom, setCourseFrom] = useState("");
    const [courseDuration, setCourseDuration] = useState("");
    const [marksheetNo, setMarksheetNo] = useState("");
    const [certificateNo, setCertificateNo] = useState("");
    const [marksheetYear, setMarksheetYear] = useState(String(new Date().getFullYear()));
    const [subjects, setSubjects] = useState([makeEmptySubject()]);
    const [detailsError, setDetailsError] = useState("");

    // Step 4 — Generate + upload
    const [pdfBlob, setPdfBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);  // { path } on success
    const [uploadError, setUploadError] = useState("");

    // Debounce timer ref
    const debounceRef = useRef(null);

    // ── Clean up debounce + object URL on unmount ───────────────────────────────
    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);
    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

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
                .select("student_name, father_name, mother_name, branch, roll_number, course, duration, addmission_date")
                .eq("roll_number", roll.trim())
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                // Not found is a soft state — everything for this student becomes manual entry
                setStudent({
                    roll_number: roll.trim(),
                    student_name: "",
                    father_name: "",
                    mother_name: "",
                    branch: "main",
                    course: "",
                    duration: "",
                    addmission_date: "",
                    isPlaceholder: true,
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
                setFeeStatus("not-found");
            } else {
                const isUpToDate = row.status?.toLowerCase().includes("up");
                setFeeStatus(isUpToDate ? "up-to-date" : "pending");
                if (isUpToDate) {
                    setFeeConfirmed(true);
                    setStep(STEP.DETAILS);
                }
            }
        } catch (err) {
            console.error("feeCheck:", err);
            setFeeStatus("not-found");
        } finally {
            setFeeLoading(false);
        }
    };

    const handleFeeConfirm = () => {
        setFeeConfirmed(true);
        setStep(STEP.DETAILS);
    };

    const handleFeeCancel = () => {
        setStep(STEP.LOOKUP);
        setFeeStatus(null);
        setFeeConfirmed(false);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPdfBlob(null);
        setPreviewUrl(null);
        setGenerateError("");
    };

    // ── Step 3: Prefill DB-sourced fields when entering the details step ───────
    useEffect(() => {
        if (step === STEP.DETAILS && student) {
            setStudentNameInput(student.isPlaceholder ? "" : student.student_name || "");
            setFatherNameInput(student.isPlaceholder ? "" : student.father_name || "");
            setMotherName(student.isPlaceholder ? "" : student.mother_name || "");
            setCourse(student.isPlaceholder ? "" : student.course || "");
            setCourseDuration(student.isPlaceholder ? "" : student.duration || "");
            setCourseFrom(student.isPlaceholder ? "" : formatAdmissionDate(student.addmission_date));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, student]);

    const totals = computeTotals(subjects);

    const addSubjectRow = () => setSubjects((prev) => [...prev, makeEmptySubject()]);
    const removeSubjectRow = (id) => setSubjects((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));

    const handleProceedToGenerate = () => {
        if (!studentNameInput.trim() || !fatherNameInput.trim() || !course.trim()) {
            setDetailsError("Student name, father's name, and course are required.");
            return;
        }
        setDetailsError("");
        setStep(STEP.GENERATE);
    };

    const handleBackToDetails = () => {
        setStep(STEP.DETAILS);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPdfBlob(null);
        setPreviewUrl(null);
        setUploadResult(null);
        setUploadError("");
        setGenerateError("");
    };

    // ── Step 4: Generate diploma PDF ────────────────────────────────────────────
    const runGenerate = useCallback(() => {
        setGenerating(true);
        setGenerateError("");
        setUploadResult(null);
        setUploadError("");

        try {
            const t = computeTotals(subjects);
            const blob = generateDiplomaPDF({
                studentName: studentNameInput,
                fatherName: fatherNameInput,
                motherName,
                rollNumber: student?.roll_number,
                course,
                courseFrom,
                courseDuration,
                marksheetNo,
                certificateNo,
                marksheetYear,
                subjects,
                totalMax: t.totalMax,
                totalObtained: t.totalObtained,
                percentage: t.percentage,
                division: t.division,
                grade: t.grade,
                hasMarks: t.hasMarks,
            });
            const url = URL.createObjectURL(blob);
            setPdfBlob(blob);
            setPreviewUrl((prevUrl) => {
                if (prevUrl) URL.revokeObjectURL(prevUrl);
                return url;
            });
        } catch (err) {
            console.error("generateDiplomaPDF:", err);
            setGenerateError("Failed to generate the diploma PDF. Please try again.");
        } finally {
            setGenerating(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentNameInput, fatherNameInput, motherName, student, course, courseFrom, courseDuration, marksheetNo, certificateNo, marksheetYear, subjects]);

    // Auto-generate as soon as we land on the generate step
    useEffect(() => {
        if (step === STEP.GENERATE && !pdfBlob && !generating) {
            runGenerate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const handleRegenerate = () => runGenerate();

    // ── Step 4: Upload generated PDF to storage ─────────────────────────────────
    const handleUpload = async () => {
        if (!pdfBlob || !student) return;

        setUploading(true);
        setUploadError("");
        setUploadResult(null);

        try {
            const storagePath = generatePath(student.roll_number);
            const fileName = `${storagePath}.pdf`;
            const pdfFile = new File([pdfBlob], fileName, { type: ALLOWED_MIME });

            const { error: uploadErr } = await secSupabase.storage
                .from(BUCKET)
                .upload(storagePath, pdfFile, {
                    contentType: ALLOWED_MIME,
                    upsert: false,
                    cacheControl: "3600",
                });

            if (uploadErr) {
                throw new Error(uploadErr.message || "Upload failed");
            }

            setUploadResult({ path: storagePath });
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
        setStudentNameInput("");
        setFatherNameInput("");
        setMotherName("");
        setCourse("");
        setCourseFrom("");
        setCourseDuration("");
        setMarksheetNo("");
        setCertificateNo("");
        setMarksheetYear(String(new Date().getFullYear()));
        setSubjects([makeEmptySubject()]);
        setDetailsError("");
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPdfBlob(null);
        setPreviewUrl(null);
        setGenerating(false);
        setGenerateError("");
        setUploading(false);
        setUploadResult(null);
        setUploadError("");
    };

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="p-2 sm:p-6 max-w-3xl mx-auto space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">Upload Diploma</h1>
                <p className="text-gray-500 mt-2 font-medium">Generate and archive student diplomas securely</p>
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
                                    <p className="text-sm text-amber-800 leading-relaxed font-medium">
                                        Roll number <span className="font-black">"{student.roll_number}"</span> is not in our records.
                                        You can still proceed — all diploma details will need to be entered manually.
                                    </p>
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
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Checking fees for</p>
                                <p className="text-sm font-black text-gray-900">{student?.student_name || student?.roll_number} · {student?.roll_number}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100" onClick={handleFeeCancel}>← Back</Button>
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
                                    <p className="text-xs text-green-600 mt-0.5">Proceeding to diploma details…</p>
                                </div>
                            </div>
                        )}

                        {!feeLoading && feeStatus === "pending" && (
                            <WarningBanner
                                message="Fee dues are pending for this student. Do you want to continue generating the diploma anyway?"
                                onContinue={handleFeeConfirm}
                                onCancel={handleFeeCancel}
                            />
                        )}

                        {!feeLoading && feeStatus === "not-found" && (
                            <WarningBanner
                                message="No fee records were found for this student. The fees status could not be verified. Do you want to continue generating the diploma anyway?"
                                onContinue={handleFeeConfirm}
                                onCancel={handleFeeCancel}
                            />
                        )}
                    </div>
                )}

                {/* ── STEP 3: Diploma Details ── */}
                {step === STEP.DETAILS && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Diploma details for</p>
                                <p className="text-sm font-black text-gray-900">{student?.roll_number}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100" onClick={handleFeeCancel}>← Back</Button>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                Student Info {student?.isPlaceholder ? "(manual — not in records)" : "(from records — editable)"}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <TextField label="Student Name" value={studentNameInput} onChange={(e) => setStudentNameInput(e.target.value)} placeholder="Full name" />
                                <TextField label="Father's Name" value={fatherNameInput} onChange={(e) => setFatherNameInput(e.target.value)} placeholder="Father's name" />
                                <TextField label="Mother's Name" value={motherName} onChange={(e) => setMotherName(e.target.value)} placeholder="Mother's name" />
                                <TextField label="Roll No." value={student?.roll_number || ""} onChange={() => { }} className="opacity-60 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                Course Info {student?.isPlaceholder ? "(manual — not in records)" : "(from records — editable)"}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <TextField label="Course Name" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. DCA" className="col-span-2" />
                                <TextField label="Course From (Admission Date)" value={courseFrom} onChange={(e) => setCourseFrom(e.target.value)} placeholder="e.g. January 15, 2025" />
                                <TextField label="Course Duration" value={courseDuration} onChange={(e) => setCourseDuration(e.target.value)} placeholder="e.g. 6 Months" />
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Certificate Info (manual)</p>
                            <div className="grid grid-cols-3 gap-3">
                                <TextField label="Marksheet No." value={marksheetNo} onChange={(e) => setMarksheetNo(e.target.value)} placeholder="e.g. 1042" />
                                <TextField label="Certificate No." value={certificateNo} onChange={(e) => setCertificateNo(e.target.value)} placeholder="e.g. 1042" />
                                <TextField label="Marksheet Issued Year" value={marksheetYear} onChange={(e) => setMarksheetYear(e.target.value)} placeholder="2026" />
                            </div>
                        </div>

                        <SubjectsTable subjects={subjects} onChange={setSubjects} onAdd={addSubjectRow} onRemove={removeSubjectRow} />

                        <TotalsSummary totals={totals} />

                        {detailsError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                <p className="text-sm text-red-600 font-bold">{detailsError}</p>
                            </div>
                        )}

                        <Button variant="primary" size="full" onClick={handleProceedToGenerate}>
                            Generate Diploma →
                        </Button>
                    </div>
                )}

                {/* ── STEP 4: Generate + Upload ── */}
                {step === STEP.GENERATE && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Generating diploma for</p>
                                <p className="text-sm font-black text-gray-900">{studentNameInput} · {student?.roll_number}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100" onClick={handleBackToDetails}>← Edit Details</Button>
                        </div>

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
                                {previewUrl && (
                                    <a href={previewUrl} download={`${uploadResult.path}.pdf`}>
                                        <Button variant="outline" size="sm" className="w-full">Download PDF</Button>
                                    </a>
                                )}
                                <div className="flex gap-3">
                                    <Button variant="primary" size="sm" className="flex-1" onClick={handleReset}>Generate Another</Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <DiplomaPreview
                                    previewUrl={previewUrl}
                                    fileName={`${generatePath(student?.roll_number)}.pdf`}
                                    onRegenerate={handleRegenerate}
                                    generating={generating}
                                />

                                {generateError && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                        <p className="text-sm text-red-600 font-bold">{generateError}</p>
                                    </div>
                                )}

                                {uploadError && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                        <p className="text-sm text-red-600 font-bold">{uploadError}</p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <Button variant="outline" size="md" onClick={handleReset} disabled={uploading} className="flex-1">
                                        Start Over
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="md"
                                        onClick={handleUpload}
                                        disabled={!pdfBlob || generating || uploading}
                                        className="flex-1"
                                        icon={uploading ? () => (
                                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        ) : undefined}
                                    >
                                        {uploading ? "Uploading…" : "Upload to Storage"}
                                    </Button>
                                </div>

                                <p className="text-[10px] text-gray-400 text-center font-medium">
                                    Will be saved as <code className="bg-gray-100 px-1 rounded">{BUCKET}/{generatePath(student?.roll_number)}</code>
                                </p>
                            </>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}