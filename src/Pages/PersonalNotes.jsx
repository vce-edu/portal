import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Card, CardHeader } from "../components/ui/Card";

function PersonalNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [editNote, setEditNote] = useState(null);

  // Fetch notes belonging to the logged-in user
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) fetchNotes();
  }, [user, fetchNotes]);

  // Add new note
  const addNote = async () => {
    if (!title.trim() || !content.trim()) return;

    const { error } = await supabase.from("notes").insert([
      {
        user_id: user.id,
        title,
        content
      }
    ]);

    if (!error) {
      fetchNotes();
      setTitle("");
      setContent("");
    }
  };

  // Update a note
  const updateNote = async () => {
    const { error } = await supabase
      .from("notes")
      .update({
        title: editNote.title,
        content: editNote.content
      })
      .eq("id", editNote.id);

    if (!error) {
      fetchNotes();
      setEditNote(null);
    }
  };

  // Delete a note
  const deleteNote = async (id) => {
    await supabase.from("notes").delete().eq("id", id);
    fetchNotes();
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-12">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-6xl font-black text-gray-900 tracking-tight">Personal Notes</h1>
          <p className="text-gray-500 mt-2 font-medium">Capture thoughts, reminders, and strategic ideas</p>
        </div>
      </div>

      {/* New Note Form */}
      <Card className="bg-gradient-to-br from-white to-purple-50/30 border-purple-100 shadow-xl shadow-purple-900/5">
        <h3 className="text-lg font-black text-purple-900 mb-6 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Compose New Note
        </h3>

        <div className="space-y-4">
          <Input
            placeholder="Executive Title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-bold text-lg"
          />

          <textarea
            className="w-full h-32 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 focus:border-purple-300 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-gray-700 font-medium resize-none shadow-inner"
            placeholder="Elaborate your thoughts here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="flex justify-end">
            <Button
              onClick={addNote}
              className="px-8 shadow-purple-200"
              icon={() => (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            >
              Add to Collection
            </Button>
          </div>
        </div>
      </Card>

      {/* Loader */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
        </div>
      )}

      {/* Notes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {notes.map((note) => (
          <Card key={note.id} className="hover:shadow-xl transition-all border-gray-100 group flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{note.title}</h3>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => setEditNote(note)}
                >
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="danger"
                  onClick={() => deleteNote(note.id)}
                >
                  Delete
                </Button>
              </div>
            </div>

            <p className="text-gray-600 font-medium whitespace-pre-wrap flex-1 text-sm leading-relaxed">{note.content}</p>
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
              <div className="w-1 h-1 bg-purple-300 rounded-full"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {new Date(note.created_at).toLocaleDateString()}
              </span>
            </div>
          </Card>
        ))}

        {notes.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold">Your collection is empty. Start writing!</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editNote}
        onClose={() => setEditNote(null)}
        title="Revise Note"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditNote(null)}>Discard</Button>
            <Button onClick={updateNote}>Commit Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={editNote?.title || ""}
            onChange={(e) => setEditNote({ ...editNote, title: e.target.value })}
          />

          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-tighter">Content</label>
            <textarea
              className="w-full h-48 p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:border-purple-300 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-gray-700 font-medium resize-none shadow-inner"
              value={editNote?.content || ""}
              onChange={(e) => setEditNote({ ...editNote, content: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default PersonalNotes;
