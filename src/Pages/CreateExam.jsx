import React, { useState, useEffect } from "react";
import { thirdSupabase } from "../createClient";
import { Card, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { useAuth } from "../context/AuthContext";

// ─── Exam Detail / Edit View ─────────────────────────────────────────────────
function ExamDetailView({ exam, onBack, onSaved, questionPool }) {
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({ ...exam });
    const [questions, setQuestions] = useState([]);
    const [loadingQ, setLoadingQ] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });

    // Add-question state
    const [showPoolModal, setShowPoolModal] = useState(false);
    const [poolSearch, setPoolSearch] = useState("");
    const [selectedPoolIds, setSelectedPoolIds] = useState([]);
    const [newQuestions, setNewQuestions] = useState([]);
    const [addingQuestions, setAddingQuestions] = useState(false);
    const [showAddSection, setShowAddSection] = useState(false);

    // Inline question editing
    const [editingQuestion, setEditingQuestion] = useState(null); // { question_id, question_text, marks, options: [{option_id, option_text, is_correct}] }
    const [savingQuestion, setSavingQuestion] = useState(false);

    useEffect(() => { fetchLinkedQuestions(); }, [exam.exam_id]);

    const fetchLinkedQuestions = async () => {
        setLoadingQ(true);
        try {
            const { data, error } = await thirdSupabase
                .from("exam_questions")
                .select(`question_order, questions(question_id, question_text, marks, question_options(*))`)
                .eq("exam_id", exam.exam_id)
                .order("question_order", { ascending: true });
            if (error) throw error;
            setQuestions(data || []);
        } catch (err) { console.error(err); }
        finally { setLoadingQ(false); }
    };

    const handleSaveInfo = async () => {
        setSaving(true);
        setMsg({ type: "", text: "" });
        try {
            const { error } = await thirdSupabase.from("exam_info").update({
                branch: form.branch,
                duration_mins: Number(form.duration_mins),
                total_score: Number(form.total_score),
                total_questions: Number(form.total_questions),
                restricted: form.restricted,
            }).eq("exam_id", exam.exam_id);
            if (error) throw error;
            setMsg({ type: "success", text: "Exam updated successfully." });
            setEditMode(false);
            onSaved?.();
        } catch (err) { setMsg({ type: "error", text: err.message }); }
        finally { setSaving(false); }
    };

    const handleRemoveQuestion = async (questionId) => {
        try {
            const { error } = await thirdSupabase.from("exam_questions")
                .delete().eq("exam_id", exam.exam_id).eq("question_id", questionId);
            if (error) throw error;
            setMsg({ type: "success", text: "Question removed from exam." });
            fetchLinkedQuestions();
        } catch (err) { setMsg({ type: "error", text: err.message }); }
    };

    const startEditingQuestion = (q) => {
        setEditingQuestion({
            question_id: q.question_id,
            question_text: q.question_text,
            marks: q.marks ?? 1,
            options: q.question_options?.map(o => ({ option_id: o.option_id, option_text: o.option_text, is_correct: o.is_correct })) || [],
        });
    };

    const updateEQ = (field, value) => setEditingQuestion(prev => ({ ...prev, [field]: value }));
    const updateEQOpt = (oi, field, value) => setEditingQuestion(prev => {
        const opts = [...prev.options];
        opts[oi] = { ...opts[oi], [field]: value };
        return { ...prev, options: opts };
    });
    const addEQOpt = () => setEditingQuestion(prev => ({ ...prev, options: [...prev.options, { option_id: null, option_text: "", is_correct: false }] }));
    const removeEQOpt = (oi) => setEditingQuestion(prev => { const opts = [...prev.options]; opts.splice(oi, 1); return { ...prev, options: opts }; });

    const handleSaveQuestion = async () => {
        if (!editingQuestion) return;
        setSavingQuestion(true);
        setMsg({ type: "", text: "" });
        try {
            // Update question text and marks
            const { error: qErr } = await thirdSupabase.from("questions").update({
                question_text: editingQuestion.question_text,
                marks: Number(editingQuestion.marks),
            }).eq("question_id", editingQuestion.question_id);
            if (qErr) throw qErr;

            // Upsert/delete options
            const toUpsert = editingQuestion.options.filter(o => o.option_text.trim()).map(o => ({
                ...(o.option_id ? { option_id: o.option_id } : {}),
                question_id: editingQuestion.question_id,
                option_text: o.option_text,
                is_correct: o.is_correct,
            }));
            if (toUpsert.length > 0) {
                const { error: uErr } = await thirdSupabase.from("question_options").upsert(toUpsert);
                if (uErr) throw uErr;
            }

            setMsg({ type: "success", text: "Question updated." });
            setEditingQuestion(null);
            fetchLinkedQuestions();
        } catch (err) { setMsg({ type: "error", text: err.message }); }
        finally { setSavingQuestion(false); }
    };

    const handleAddQuestions = async () => {
        setAddingQuestions(true);
        setMsg({ type: "", text: "" });
        try {
            const currentOrder = questions.length;
            const insertedIds = [];

            for (let i = 0; i < newQuestions.length; i++) {
                const q = newQuestions[i];
                const { data: qData, error: qErr } = await thirdSupabase
                    .from("questions").insert({ question_text: q.question_text, marks: q.marks })
                    .select("question_id").single();
                if (qErr) throw qErr;

                if (q.options.length > 0) {
                    const opts = q.options.map(o => ({ question_id: qData.question_id, option_text: o.text, is_correct: o.is_correct }));
                    const { error: optsErr } = await thirdSupabase.from("question_options").insert(opts);
                    if (optsErr) throw optsErr;
                }
                insertedIds.push(qData.question_id);
            }

            const allIds = [...selectedPoolIds, ...insertedIds];
            if (allIds.length > 0) {
                const links = allIds.map((qid, idx) => ({ exam_id: exam.exam_id, question_id: qid, question_order: currentOrder + idx + 1 }));
                const { error: linkErr } = await thirdSupabase.from("exam_questions").insert(links);
                if (linkErr) throw linkErr;
            }

            setMsg({ type: "success", text: `${allIds.length} question(s) added successfully.` });
            setShowAddSection(false);
            setNewQuestions([]);
            setSelectedPoolIds([]);
            fetchLinkedQuestions();
        } catch (err) { setMsg({ type: "error", text: err.message }); }
        finally { setAddingQuestions(false); }
    };

    const updateNewQ = (i, field, value) => { const u = [...newQuestions]; u[i][field] = value; setNewQuestions(u); };
    const updateOpt = (qi, oi, field, value) => { const u = [...newQuestions]; u[qi].options[oi][field] = value; setNewQuestions(u); };
    const addOpt = (qi) => { const u = [...newQuestions]; u[qi].options.push({ text: "", is_correct: false }); setNewQuestions(u); };
    const removeOpt = (qi, oi) => { const u = [...newQuestions]; u[qi].options.splice(oi, 1); setNewQuestions(u); };

    const alreadyLinkedIds = questions.map(eq => eq.questions?.question_id).filter(Boolean);
    const filteredPool = (questionPool || []).filter(q =>
        q.question_text.toLowerCase().includes(poolSearch.toLowerCase()) && !alreadyLinkedIds.includes(q.question_id)
    );

    return (
        <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-2xl text-gray-400 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">{exam.exam_id}</h1>
                        <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">{exam.branch}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant={exam.restricted ? "red" : "green"}>{exam.restricted ? "Restricted" : "Public"}</Badge>
                    {!editMode ? (
                        <Button onClick={() => setEditMode(true)} variant="outline">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Info
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => { setEditMode(false); setForm({ ...exam }); }}>Cancel</Button>
                            <Button onClick={handleSaveInfo} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Message */}
            {msg.text && (
                <div className={`p-4 rounded-2xl border ${msg.type === "success" ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"}`}>
                    <p className="font-bold">{msg.type === "success" ? "✓ " : "⚠ "}{msg.text}</p>
                </div>
            )}

            {/* Exam Info Card */}
            <Card>
                <CardHeader title="Exam Information" subtitle="Core configuration settings" />
                {editMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <Input label="Branch" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
                        <Input label="Duration (Minutes)" type="number" value={form.duration_mins} onChange={(e) => setForm({ ...form, duration_mins: e.target.value })} />
                        <Input label="Total Score" type="number" value={form.total_score} onChange={(e) => setForm({ ...form, total_score: e.target.value })} />
                        <Input label="Total Questions" type="number" value={form.total_questions} onChange={(e) => setForm({ ...form, total_questions: e.target.value })} />
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="restricted" checked={form.restricted} onChange={(e) => setForm({ ...form, restricted: e.target.checked })} className="w-5 h-5 rounded" />
                            <label htmlFor="restricted" className="font-bold text-gray-700">Restricted Access</label>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                        {[
                            { label: "Duration", value: `${exam.duration_mins} min` },
                            { label: "Total Score", value: exam.total_score },
                            { label: "Questions", value: exam.total_questions },
                            { label: "Created", value: exam.created_at ? new Date(exam.created_at).toLocaleDateString() : "—" },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-gray-50 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                                <p className="text-2xl font-black text-gray-900">{value}</p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Questions Card */}
            <Card>
                <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
                    <div>
                        <h3 className="text-lg md:text-xl font-bold text-gray-900">Questions</h3>
                        <p className="text-xs md:text-sm text-gray-500 font-medium">{questions.length} question(s) linked to this exam</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => { setShowPoolModal(true); setShowAddSection(true); }}>
                            Browse Pool
                        </Button>
                        <Button size="sm" onClick={() => {
                            setShowAddSection(true);
                            setNewQuestions(prev => [{ question_text: "", marks: 1, options: [{ text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }] }, ...prev]);
                        }}>
                            + Add Question
                        </Button>
                    </div>
                </div>

                {/* Existing Questions */}
                <div className="space-y-4">
                    {loadingQ ? (
                        [1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />)
                    ) : questions.length > 0 ? (
                        questions.map((eq, idx) => {
                            const q = eq.questions;
                            if (!q) return null;
                            const isEditing = editingQuestion?.question_id === q.question_id;

                            return (
                                <div key={q.question_id} className={`p-4 rounded-2xl border transition-all ${isEditing ? "bg-purple-50 border-purple-200" : "bg-gray-50 border-gray-100 group"}`}>
                                    {isEditing ? (
                                        // ── EDIT MODE ──
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                                                    {eq.question_order ?? idx + 1}
                                                </span>
                                                <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Editing</span>
                                            </div>
                                            <Input
                                                label="Question Text"
                                                value={editingQuestion.question_text}
                                                onChange={(e) => updateEQ("question_text", e.target.value)}
                                            />
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-500 uppercase">Marks:</span>
                                                <input type="number" className="w-16 p-1 border rounded-lg text-sm font-bold text-center" value={editingQuestion.marks}
                                                    onChange={(e) => updateEQ("marks", parseInt(e.target.value))} />
                                            </div>
                                            <div className="space-y-2 pl-4 border-l-2 border-purple-200">
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Options (check = correct answer)</p>
                                                {editingQuestion.options.map((opt, oi) => (
                                                    <div key={oi} className="flex items-center gap-3">
                                                        <input type="checkbox" checked={opt.is_correct} onChange={(e) => updateEQOpt(oi, "is_correct", e.target.checked)} className="w-4 h-4 rounded flex-shrink-0" />
                                                        <input
                                                            className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${opt.is_correct ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}
                                                            value={opt.option_text}
                                                            onChange={(e) => updateEQOpt(oi, "option_text", e.target.value)}
                                                            placeholder={`Option ${oi + 1}`}
                                                        />
                                                        <button onClick={() => removeEQOpt(oi)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                                <button onClick={addEQOpt} className="text-sm font-bold text-purple-600 hover:underline pl-8">+ Add Option</button>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button variant="outline" size="sm" onClick={() => setEditingQuestion(null)}>Cancel</Button>
                                                <Button size="sm" onClick={handleSaveQuestion} disabled={savingQuestion}>
                                                    {savingQuestion ? "Saving..." : "Save Question"}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        // ── READ MODE ──
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                                                        {eq.question_order ?? idx + 1}
                                                    </span>
                                                    <p className="font-bold text-gray-900">{q.question_text}</p>
                                                </div>
                                                {q.question_options && q.question_options.length > 0 && (
                                                    <div className="grid grid-cols-2 gap-2 pl-8">
                                                        {q.question_options.map(opt => (
                                                            <span key={opt.option_id} className={`text-sm px-3 py-1 rounded-xl font-medium ${opt.is_correct ? "bg-green-100 text-green-700 border border-green-200" : "bg-white text-gray-500 border border-gray-100"}`}>
                                                                {opt.option_text}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Badge variant="purple">{q.marks ?? 1} pt</Badge>
                                                <button
                                                    onClick={() => startEditingQuestion(q)}
                                                    className="p-1.5 text-gray-300 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Edit question"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveQuestion(q.question_id)}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Remove from exam"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-10 text-center text-gray-400">
                            <p className="font-bold">No questions linked yet.</p>
                            <p className="text-sm">Use the buttons above to add questions.</p>
                        </div>
                    )}
                </div>

                {/* Add Section */}
                {showAddSection && (
                    <div className="mt-8 pt-6 border-t border-gray-100 space-y-6">
                        <h4 className="font-black text-gray-700">New Questions to Add</h4>

                        {selectedPoolIds.length > 0 && (
                            <div className="flex items-center gap-3">
                                <Badge variant="purple">{selectedPoolIds.length} from pool selected</Badge>
                                <button onClick={() => setSelectedPoolIds([])} className="text-xs font-bold text-red-500 hover:underline">Clear</button>
                            </div>
                        )}

                        {newQuestions.map((q, qi) => (
                            <div key={qi} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                                <div className="flex gap-3 items-start">
                                    <div className="flex-1">
                                        <Input placeholder={`Question ${qi + 1} text...`} value={q.question_text} onChange={(e) => updateNewQ(qi, "question_text", e.target.value)} />
                                    </div>
                                    <button onClick={() => { const u = [...newQuestions]; u.splice(qi, 1); setNewQuestions(u); }} className="p-2 text-gray-300 hover:text-red-500 mt-1">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Marks:</span>
                                    <input type="number" className="w-16 p-1 border rounded-lg text-sm font-bold text-center" value={q.marks} onChange={(e) => updateNewQ(qi, "marks", parseInt(e.target.value))} />
                                </div>
                                <div className="space-y-2 pl-4 border-l-2 border-purple-50">
                                    {q.options.map((opt, oi) => (
                                        <div key={oi} className="flex items-center gap-3">
                                            <input type="checkbox" checked={opt.is_correct} onChange={(e) => updateOpt(qi, oi, "is_correct", e.target.checked)} className="w-4 h-4 rounded flex-shrink-0" />
                                            <Input placeholder={`Option ${oi + 1}`} className={opt.is_correct ? "bg-green-50 border-green-200" : ""} value={opt.text} onChange={(e) => updateOpt(qi, oi, "text", e.target.value)} />
                                            <button onClick={() => removeOpt(qi, oi)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={() => addOpt(qi)} className="text-sm font-bold text-purple-600 hover:underline pl-8">+ Add Option</button>
                                </div>
                            </div>
                        ))}

                        {(selectedPoolIds.length > 0 || newQuestions.length > 0) && (
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => { setShowAddSection(false); setNewQuestions([]); setSelectedPoolIds([]); }}>
                                    Cancel
                                </Button>
                                <Button onClick={handleAddQuestions} disabled={addingQuestions}>
                                    {addingQuestions ? "Adding..." : `Save ${selectedPoolIds.length + newQuestions.length} Question(s)`}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Pool Modal */}
            <Modal isOpen={showPoolModal} onClose={() => setShowPoolModal(false)} title="Question Bank Browser" size="xl">
                <div className="space-y-4">
                    <Input placeholder="Search questions..." value={poolSearch} onChange={(e) => setPoolSearch(e.target.value)} />
                    <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
                        {filteredPool.length === 0 ? (
                            <p className="text-center text-gray-400 py-8 font-bold">No available questions found.</p>
                        ) : (
                            filteredPool.map(q => (
                                <div
                                    key={q.question_id}
                                    onClick={() => {
                                        if (selectedPoolIds.includes(q.question_id)) {
                                            setSelectedPoolIds(selectedPoolIds.filter(id => id !== q.question_id));
                                        } else {
                                            setSelectedPoolIds([...selectedPoolIds, q.question_id]);
                                        }
                                    }}
                                    className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between gap-4 transition-all ${selectedPoolIds.includes(q.question_id) ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-100 hover:border-purple-200"}`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold truncate">{q.question_text}</p>
                                        <p className={`text-[10px] uppercase font-bold tracking-widest ${selectedPoolIds.includes(q.question_id) ? "text-purple-200" : "text-gray-400"}`}>
                                            {q.marks ?? 1} Mark(s) &bull; {q.question_options?.length || 0} Options
                                        </p>
                                    </div>
                                    {selectedPoolIds.includes(q.question_id) && (
                                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    <div className="pt-4 flex justify-between items-center border-t border-gray-50">
                        <p className="text-sm font-bold text-gray-500">{selectedPoolIds.length} selected</p>
                        <Button onClick={() => setShowPoolModal(false)}>Confirm Selection</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CreateExam() {
    const { user } = useAuth();
    const [view, setView] = useState("list");
    const [selectedExam, setSelectedExam] = useState(null);

    const [exams, setExams] = useState([]);
    const [fetchingExams, setFetchingExams] = useState(true);
    const [listMessage, setListMessage] = useState({ type: "", text: "" });

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [createMessage, setCreateMessage] = useState({ type: "", text: "" });
    const [examInfo, setExamInfo] = useState({ exam_id: "", branch: "", duration_mins: 60, total_score: 100, total_questions: 20, restricted: false, created_by: 1 });
    const [selectedPoolIds, setSelectedPoolIds] = useState([]);
    const [newQuestions, setNewQuestions] = useState([]);

    const [showPoolModal, setShowPoolModal] = useState(false);
    const [questionPool, setQuestionPool] = useState([]);
    const [poolSearch, setPoolSearch] = useState("");

    useEffect(() => { fetchExams(); fetchQuestionPool(); }, []);

    const fetchExams = async () => {
        setFetchingExams(true);
        try {
            const { data, error } = await thirdSupabase.from("exam_info").select("*").order("created_at", { ascending: false });
            if (error) throw error;
            setExams(data || []);
        } catch (err) { console.error(err); }
        finally { setFetchingExams(false); }
    };

    const fetchQuestionPool = async () => {
        try {
            const { data, error } = await thirdSupabase.from("questions").select("*, question_options(*)").order("created_at", { ascending: false });
            if (error) throw error;
            setQuestionPool(data || []);
        } catch (err) { console.error(err); }
    };

    const handleAddNewQuestion = () => {
        setNewQuestions([{ question_text: "", marks: 1, options: [{ text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }] }, ...newQuestions]);
    };

    const updateNewQuestion = (i, field, value) => { const u = [...newQuestions]; u[i][field] = value; setNewQuestions(u); };
    const updateOption = (qi, oi, field, value) => { const u = [...newQuestions]; u[qi].options[oi][field] = value; setNewQuestions(u); };
    const addOption = (qi) => { const u = [...newQuestions]; u[qi].options.push({ text: "", is_correct: false }); setNewQuestions(u); };
    const removeOption = (qi, oi) => { const u = [...newQuestions]; u[qi].options.splice(oi, 1); setNewQuestions(u); };

    const handleSubmit = async () => {
        setLoading(true);
        setCreateMessage({ type: "", text: "" });
        try {
            if (!examInfo.exam_id || !examInfo.branch) throw new Error("Exam ID and Branch are required.");
            const { data, error } = await thirdSupabase.rpc("create_complete_exam", {
                p_exam_info: { ...examInfo, created_by: 1 },
                p_new_questions: newQuestions,
                p_existing_question_ids: selectedPoolIds.length > 0 ? selectedPoolIds : null,
            });
            if (error) throw error;
            setListMessage({ type: "success", text: `Exam "${data}" published successfully!` });
            setView("list");
            setStep(1);
            setExamInfo({ exam_id: "", branch: "", duration_mins: 60, total_score: 100, total_questions: 20, restricted: false, created_by: 1 });
            setNewQuestions([]);
            setSelectedPoolIds([]);
            fetchExams();
        } catch (err) { setCreateMessage({ type: "error", text: err.message }); }
        finally { setLoading(false); }
    };

    const filteredPool = questionPool.filter(q => q.question_text.toLowerCase().includes(poolSearch.toLowerCase()));

    // ── Detail View ──
    if (view === "detail" && selectedExam) {
        return (
            <ExamDetailView
                exam={selectedExam}
                onBack={() => { setSelectedExam(null); setView("list"); }}
                onSaved={fetchExams}
                questionPool={questionPool}
            />
        );
    }

    // ── List View ──
    if (view === "list") {
        return (
            <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Active Exams</h1>
                        <p className="text-gray-500 font-medium">Manage and monitor current examination modules</p>
                    </div>
                    <Button onClick={() => { setView("create"); setStep(1); }} size="lg" className="h-14 px-8">
                        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Exam
                    </Button>
                </div>

                {listMessage.text && (
                    <div className={`p-4 rounded-2xl border ${listMessage.type === "success" ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"}`}>
                        <p className="font-bold">{listMessage.type === "success" ? "✓ " : "⚠ "}{listMessage.text}</p>
                    </div>
                )}

                {fetchingExams ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-56 bg-gray-50 rounded-3xl animate-pulse border border-gray-100" />)}
                    </div>
                ) : exams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.map(exam => (
                            <button
                                key={exam.exam_id}
                                type="button"
                                onClick={() => { setSelectedExam(exam); setView("detail"); }}
                                className="text-left w-full group"
                            >
                                <Card className="group-hover:border-purple-200 group-hover:shadow-lg group-hover:shadow-purple-50 transition-all h-full relative">
                                    <div className="absolute top-4 right-4 z-10">
                                        <Badge variant={exam.restricted ? "red" : "green"}>{exam.restricted ? "Restricted" : "Public"}</Badge>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-900 group-hover:text-purple-600 transition-colors uppercase truncate pr-24">{exam.exam_id}</h3>
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{exam.branch}</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-50">
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration</p>
                                                <p className="text-lg font-black text-gray-900">{exam.duration_mins}m</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Questions</p>
                                                <p className="text-lg font-black text-gray-900">{exam.total_questions}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Score</p>
                                                <p className="text-lg font-black text-gray-900">{exam.total_score}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2">
                                            <span className="text-xs font-bold text-gray-400">{exam.created_at ? new Date(exam.created_at).toLocaleDateString() : "—"}</span>
                                            <span className="text-xs font-bold text-purple-600 flex items-center gap-1">
                                                View &amp; Edit
                                                <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <p className="text-xl font-bold text-gray-400">No exams yet.</p>
                        <p className="text-gray-400 mb-6">Start by creating your first exam module.</p>
                        <Button onClick={() => setView("create")} variant="outline">Begin Configuration</Button>
                    </div>
                )}
            </div>
        );
    }

    // ── Create View ──
    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView("list")} className="p-2 hover:bg-gray-100 rounded-2xl text-gray-400 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Create Exam</h1>
                        <p className="text-gray-500 font-medium">New examination configuration</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {[1, 2].map(i => (
                        <div key={i} className={`h-2 rounded-full transition-all duration-500 ${step >= i ? "bg-purple-600 w-16" : "bg-gray-200 w-10"}`} />
                    ))}
                </div>
            </div>

            {createMessage.text && (
                <div className={`p-4 rounded-2xl border ${createMessage.type === "success" ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"}`}>
                    <p className="font-bold">{createMessage.type === "success" ? "✓ " : "⚠ "}{createMessage.text}</p>
                </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
                <Card>
                    <CardHeader title="Exam Metadata" subtitle="Core settings for the examination" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <Input label="Exam ID" placeholder="e.g. MS:101" value={examInfo.exam_id} onChange={(e) => setExamInfo({ ...examInfo, exam_id: e.target.value.toUpperCase() })} />
                        <Input label="Target Branch" placeholder="e.g. main" value={examInfo.branch} onChange={(e) => setExamInfo({ ...examInfo, branch: e.target.value })} />
                        <Input label="Duration (Minutes)" type="number" value={examInfo.duration_mins} onChange={(e) => setExamInfo({ ...examInfo, duration_mins: parseInt(e.target.value) })} />
                        <Input label="Total Score" type="number" value={examInfo.total_score} onChange={(e) => setExamInfo({ ...examInfo, total_score: parseInt(e.target.value) })} />
                    </div>
                    <div className="mt-4 flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <input
                            type="checkbox"
                            id="create-restricted"
                            checked={examInfo.restricted}
                            onChange={(e) => setExamInfo({ ...examInfo, restricted: e.target.checked })}
                            className="w-5 h-5 rounded"
                        />
                        <div>
                            <label htmlFor="create-restricted" className="font-bold text-gray-700 cursor-pointer">Restricted Access</label>
                            <p className="text-xs text-gray-400">Only authorised students can access this exam</p>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                        <Button onClick={() => setStep(2)} disabled={!examInfo.exam_id || !examInfo.branch}>
                            Continue to Questions
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Button>
                    </div>
                </Card>
            )}

            {/* Step 2 */}
            {step === 2 && (
                <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-purple-50 p-6 rounded-3xl border border-purple-100">
                        <div>
                            <h2 className="text-xl font-black text-purple-900">Configure Questions</h2>
                            <p className="text-purple-600 font-medium">Add new questions or reuse from the pool</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={() => setShowPoolModal(true)} className="bg-white">
                                Browse Question Pool
                            </Button>
                            <Button onClick={handleAddNewQuestion}>
                                + Write New Question
                            </Button>
                        </div>
                    </div>

                    {selectedPoolIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <Badge variant="purple">{selectedPoolIds.length} Pool Question(s) Selected</Badge>
                            <button onClick={() => setSelectedPoolIds([])} className="text-[10px] font-bold text-red-500 hover:underline uppercase tracking-widest">Clear</button>
                        </div>
                    )}

                    <div className="space-y-6">
                        {newQuestions.map((q, qi) => (
                            <Card key={qi} className="bg-white border-gray-100">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex-1 space-y-4">
                                        <Input placeholder={`Question ${qi + 1} text...`} value={q.question_text} onChange={(e) => updateNewQuestion(qi, "question_text", e.target.value)} />
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Marks:</span>
                                            <input type="number" className="w-16 p-1 border rounded-lg text-sm font-bold text-center" value={q.marks} onChange={(e) => updateNewQuestion(qi, "marks", parseInt(e.target.value))} />
                                        </div>
                                    </div>
                                    <button onClick={() => { const u = [...newQuestions]; u.splice(qi, 1); setNewQuestions(u); }} className="p-2 text-gray-300 hover:text-red-600 transition-colors ml-3">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="space-y-3 pl-4 border-l-2 border-purple-50">
                                    {q.options.map((opt, oi) => (
                                        <div key={oi} className="flex items-center gap-3">
                                            <input type="checkbox" checked={opt.is_correct} onChange={(e) => updateOption(qi, oi, "is_correct", e.target.checked)} className="w-5 h-5 rounded text-purple-600 flex-shrink-0" />
                                            <Input placeholder={`Option ${oi + 1}`} className={opt.is_correct ? "bg-green-50 border-green-200" : ""} value={opt.text} onChange={(e) => updateOption(qi, oi, "text", e.target.value)} />
                                            <button onClick={() => removeOption(qi, oi)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={() => addOption(qi)} className="text-sm font-bold text-purple-600 hover:underline pl-8">+ Add Option</button>
                                </div>
                            </Card>
                        ))}

                        {newQuestions.length === 0 && selectedPoolIds.length === 0 && (
                            <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                                <p className="text-gray-400 font-bold">No questions selected yet.</p>
                                <p className="text-sm text-gray-400">Add custom questions or browse the pool to continue.</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                        <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Items</p>
                                <p className="text-2xl font-black text-gray-900">{selectedPoolIds.length + newQuestions.length}</p>
                            </div>
                            <Button size="lg" onClick={handleSubmit} disabled={loading || (selectedPoolIds.length === 0 && newQuestions.length === 0)}>
                                {loading ? "Saving..." : "Finalize & Publish"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pool Modal (Create flow) */}
            <Modal isOpen={showPoolModal} onClose={() => setShowPoolModal(false)} title="Question Bank Browser" size="xl">
                <div className="space-y-4">
                    <Input placeholder="Search questions..." value={poolSearch} onChange={(e) => setPoolSearch(e.target.value)} />
                    <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
                        {filteredPool.length === 0 ? (
                            <p className="text-center text-gray-400 py-8 font-bold">No questions found.</p>
                        ) : (
                            filteredPool.map(q => (
                                <div
                                    key={q.question_id}
                                    onClick={() => {
                                        if (selectedPoolIds.includes(q.question_id)) {
                                            setSelectedPoolIds(selectedPoolIds.filter(id => id !== q.question_id));
                                        } else {
                                            setSelectedPoolIds([...selectedPoolIds, q.question_id]);
                                        }
                                    }}
                                    className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between gap-4 transition-all ${selectedPoolIds.includes(q.question_id) ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-100 hover:border-purple-200"}`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold truncate">{q.question_text}</p>
                                        <p className={`text-[10px] uppercase font-bold tracking-widest ${selectedPoolIds.includes(q.question_id) ? "text-purple-200" : "text-gray-400"}`}>
                                            {q.marks ?? 1} Mark(s) &bull; {q.question_options?.length || 0} Options
                                        </p>
                                    </div>
                                    {selectedPoolIds.includes(q.question_id) && (
                                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    <div className="pt-4 flex justify-between items-center border-t border-gray-50">
                        <p className="text-sm font-bold text-gray-500">{selectedPoolIds.length} question(s) selected</p>
                        <Button onClick={() => setShowPoolModal(false)}>Confirm Selection</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
