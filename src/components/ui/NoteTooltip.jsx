import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../../createClient";

/**
 * NoteTooltip — click to view, edit, or delete a student's note.
 * Props:
 *   note         — current note string (or null)
 *   rollNumber   — student's roll_number (for DB update)
 *   onNoteSaved  — callback(newNote) called after save/delete
 */
export default function NoteTooltip({ note, rollNumber, onNoteSaved }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note || "");
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setDraft(note || ""); }, [note]);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setEditing(false);
        setDraft(note || "");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, note]);

  const persist = async (value) => {
    if (!rollNumber) return;
    setSaving(true);
    const { error } = await supabase
      .from("students")
      .update({ notes: value || null })
      .eq("roll_number", rollNumber);
    if (!error) onNoteSaved?.(value || null);
    setSaving(false);
  };

  const handleSave = async () => {
    await persist(draft.trim());
    setEditing(false);
  };

  const handleDelete = async () => {
    await persist(null);
    setDraft("");
    setEditing(false);
  };

  const hasNote = !!note;

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center ml-1.5 align-middle"
      style={{ verticalAlign: "middle" }}
    >
      {/* Trigger */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => { setOpen((v) => !v); setEditing(false); setDraft(note || ""); }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all focus:outline-none ${
          hasNote
            ? "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100"
            : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        }`}
        title={hasNote ? "View / edit note" : "Add note"}
      >
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        {hasNote ? "Note" : "+ Note"}
      </button>

      {/* Popover */}
      {open && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 text-left drop-shadow-xl">
          {/* Arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white" />

          <span className="block bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <span className="flex items-center justify-between px-3 py-2 bg-purple-50 border-b border-purple-100">
              <span className="flex items-center gap-1.5">
                <svg className="w-3 h-3 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest">Note</span>
              </span>
              <span className="flex items-center gap-2">
                {hasNote && !editing && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Delete note"
                  >
                    Delete
                  </button>
                )}
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-[10px] font-bold text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    {hasNote ? "Edit" : "+ Add"}
                  </button>
                )}
              </span>
            </span>

            {/* Body */}
            {editing ? (
              <span className="block p-2.5 space-y-2">
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="Write a note…"
                  className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-gray-400 transition"
                />
                <span className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-1.5 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setDraft(note || ""); }}
                    className="flex-1 text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl py-1.5 transition-colors"
                  >
                    Cancel
                  </button>
                </span>
              </span>
            ) : (
              <span className="block px-3 py-2.5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words min-h-[36px]">
                {note || (
                  <span className="text-xs italic text-gray-400">No note yet — click <strong className="font-bold not-italic text-purple-500">+ Add</strong> to write one.</span>
                )}
              </span>
            )}
          </span>
        </span>
      )}
    </span>
  );
}
