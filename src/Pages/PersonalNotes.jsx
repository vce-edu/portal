import React, { useState, useEffect } from "react";
import { supabase } from "../createClient";
import { useAuth } from "../context/AuthContext";

function PersonalNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [editNote, setEditNote] = useState(null);

  // Fetch notes belonging to the logged-in user
  const fetchNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setNotes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  // Add new note
  const addNote = async () => {
    if (!title.trim() || !content.trim()) return;

    const { data, error } = await supabase.from("notes").insert([
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
    <div className="p-4 mt-10 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Your Personal Notes</h2>

      {/* New Note Form */}
      <div className="bg-white shadow rounded p-4 mb-6">
        <h3 className="font-semibold mb-2">Add a new note</h3>

        <input
          className="border w-full p-2 rounded mb-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="border w-full p-2 rounded mb-2"
          placeholder="Write something..."
          rows="3"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <button
          onClick={addNote}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-500"
        >
          Add Note
        </button>
      </div>

      {/* Loader */}
      {loading && <p>Loading notes...</p>}

      {/* Notes List */}
      <div className="space-y-4">
        {notes.map((note) => (
          <div key={note.id} className="bg-white shadow p-4 rounded">
            <div className="flex justify-between">
              <h3 className="text-xl font-semibold">{note.title}</h3>

              <div className="space-x-2">
                <button
                  className="px-3 py-1 text-sm bg-yellow-500 text-white rounded"
                  onClick={() => setEditNote(note)}
                >
                  Edit
                </button>
                <button
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded"
                  onClick={() => deleteNote(note.id)}
                >
                  Delete
                </button>
              </div>
            </div>

            <p className="mt-2 text-gray-700 whitespace-pre-wrap">{note.content}</p>
          </div>
        ))}

        {notes.length === 0 && !loading && (
          <p className="text-gray-500">No notes yet. Write something!</p>
        )}
      </div>

      {/* Edit Modal */}
      {editNote && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-96 shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Edit Note</h3>

            <input
              className="border w-full p-2 rounded mb-2"
              value={editNote.title}
              onChange={(e) =>
                setEditNote({ ...editNote, title: e.target.value })
              }
            />

            <textarea
              className="border w-full p-2 rounded mb-2"
              rows="4"
              value={editNote.content}
              onChange={(e) =>
                setEditNote({ ...editNote, content: e.target.value })
              }
            />

            <button
              onClick={updateNote}
              className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-500 mb-2"
            >
              Save Changes
            </button>

            <button
              onClick={() => setEditNote(null)}
              className="border w-full py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonalNotes;
