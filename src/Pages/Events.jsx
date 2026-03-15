import React, { useEffect, useState, useCallback } from "react";
import { secSupabase } from "../createClient";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { Input, Select } from "../components/ui/Input";
import { Card, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR } from "../components/ui/Table";

export default function Events() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        event_name: "",
        event_date: new Date().toISOString().split("T")[0],
        event_type: "Scholarship",
        event_description: "",
        buttons: []
    });

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await secSupabase
                .from("events")
                .select(`
          *,
          event_buttons (*)
        `)
                .order("event_date", { ascending: false });

            if (error) throw error;
            setEvents(data || []);
        } catch (err) {
            console.error("Error fetching events:", err);
            alert("Failed to load events");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleOpenModal = (event = null) => {
        if (event) {
            setEditingEvent(event);
            setForm({
                event_name: event.event_name,
                event_date: event.event_date,
                event_type: event.event_type || "Scholarship",
                event_description: event.event_description || "",
                buttons: event.event_buttons.sort((a, b) => a.button_order - b.button_order) || []
            });
        } else {
            setEditingEvent(null);
            setForm({
                event_name: "",
                event_date: new Date().toISOString().split("T")[0],
                event_type: "Scholarship",
                event_description: "",
                buttons: [{ button_text: "information", button_url: "vintecheducation.org/scholarship.html", button_order: 1 }]
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEvent(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => {
            const newState = { ...prev, [name]: value };

            if (name === "event_type" && value === "Scholarship") {
                const hasInfoButton = prev.buttons.some(b => b.button_text.toLowerCase() === "information");
                if (!hasInfoButton) {
                    newState.buttons = [
                        ...prev.buttons,
                        { button_text: "information", button_url: "vintecheducation.org/scholarship.html", button_order: prev.buttons.length + 1 }
                    ];
                }
            }

            return newState;
        });
    };

    const handleAddButton = () => {
        setForm(prev => ({
            ...prev,
            buttons: [...prev.buttons, { button_text: "", button_url: "", button_order: prev.buttons.length + 1 }]
        }));
    };

    const handleRemoveButton = (index) => {
        setForm(prev => ({
            ...prev,
            buttons: prev.buttons.filter((_, i) => i !== index)
        }));
    };

    const handleButtonChange = (index, field, value) => {
        const newButtons = [...form.buttons];
        newButtons[index][field] = value;
        setForm(prev => ({ ...prev, buttons: newButtons }));
    };

    const handleSubmit = async () => {
        if (!form.event_name || !form.event_date) {
            alert("Please fill in event name and date");
            return;
        }

        setSaving(true);
        try {
            let eventId = editingEvent?.event_id;

            if (editingEvent) {
                // Update Event
                const { error: updateError } = await secSupabase
                    .from("events")
                    .update({
                        event_name: form.event_name,
                        event_date: form.event_date,
                        event_type: form.event_type,
                        event_description: form.event_description
                    })
                    .eq("event_id", eventId);

                if (updateError) throw updateError;

                // Simplify buttons update: Delete all and re-insert
                const { error: deleteError } = await secSupabase
                    .from("event_buttons")
                    .delete()
                    .eq("event_id", eventId);

                if (deleteError) throw deleteError;
            } else {
                // Insert Event
                const { data, error: insertError } = await secSupabase
                    .from("events")
                    .insert({
                        event_name: form.event_name,
                        event_date: form.event_date,
                        event_type: form.event_type,
                        event_description: form.event_description
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;
                eventId = data.event_id;
            }

            // Insert Buttons
            if (form.buttons.length > 0) {
                const buttonsToInsert = form.buttons.map((btn, idx) => ({
                    event_id: eventId,
                    button_text: btn.button_text,
                    button_url: btn.button_url,
                    button_order: idx + 1
                }));

                const { error: buttonsError } = await secSupabase
                    .from("event_buttons")
                    .insert(buttonsToInsert);

                if (buttonsError) throw buttonsError;
            }

            await fetchEvents();
            handleCloseModal();
        } catch (err) {
            console.error("Error saving event:", err);
            alert("Failed to save event");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (eventId) => {
        if (!window.confirm("Are you sure you want to delete this event?")) return;

        try {
            const { error } = await secSupabase
                .from("events")
                .delete()
                .eq("event_id", eventId);

            if (error) throw error;
            fetchEvents();
        } catch (err) {
            console.error("Error deleting event:", err);
            alert("Failed to delete event");
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">Events</h1>
                    <p className="text-gray-500 mt-2 font-medium">Manage campus events and associated actions</p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => handleOpenModal()}
                    icon={() => (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    )}
                >
                    Add Event
                </Button>
            </div>

            <Card noPadding className="overflow-hidden shadow-xl border-gray-100">
                <Table>
                    <THead>
                        <TR className="hover:bg-transparent">
                            <TH>Event Name</TH>
                            <TH>Date</TH>
                            <TH>Type</TH>
                            <TH>Description</TH>
                            <TH>Buttons</TH>
                            <TH className="text-right">Actions</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {loading ? (
                            <TR>
                                <TD colSpan={5} className="text-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700 mx-auto"></div>
                                </TD>
                            </TR>
                        ) : events.length === 0 ? (
                            <TR>
                                <TD colSpan={5} className="text-center py-10 text-gray-500">
                                    No events found.
                                </TD>
                            </TR>
                        ) : (
                            events.map((event) => (
                                <TR key={event.event_id}>
                                    <TD className="font-bold text-gray-900">{event.event_name}</TD>
                                    <TD className="text-gray-500 whitespace-nowrap">{new Date(event.event_date).toLocaleDateString()}</TD>
                                    <TD>
                                        <Badge variant={
                                            event.event_type === "Scholarship" ? "blue" :
                                                event.event_type === "Celebration" ? "purple" : "yellow"
                                        }>
                                            {event.event_type || "Scholarship"}
                                        </Badge>
                                    </TD>
                                    <TD className="text-gray-500 max-w-xs truncate">{event.event_description || "—"}</TD>
                                    <TD>
                                        <div className="flex flex-wrap gap-1">
                                            {event.event_buttons.map(btn => (
                                                <Badge key={btn.button_id} variant="purple">{btn.button_text}</Badge>
                                            ))}
                                        </div>
                                    </TD>
                                    <TD className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="secondary" className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100" onClick={() => handleOpenModal(event)}>
                                                Edit
                                            </Button>
                                            <Button size="sm" variant="danger" onClick={() => handleDelete(event.event_id)}>
                                                Delete
                                            </Button>
                                        </div>
                                    </TD>
                                </TR>
                            ))
                        )}
                    </TBody>
                </Table>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingEvent ? "Edit Event" : "Create Event"}
                maxWidth="max-w-2xl"
                footer={
                    <>
                        <Button variant="outline" onClick={handleCloseModal} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} loading={saving}>
                            {editingEvent ? "Update Event" : "Create Event"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Event Name"
                            name="event_name"
                            value={form.event_name}
                            onChange={handleInputChange}
                            placeholder="e.g. Annual Sports Meet"
                        />
                        <Input
                            label="Event Date"
                            name="event_date"
                            type="date"
                            value={form.event_date}
                            onChange={handleInputChange}
                        />
                    </div>
                    <Select
                        label="Event Type"
                        name="event_type"
                        value={form.event_type}
                        onChange={handleInputChange}
                        options={[
                            { value: "Scholarship", label: "Scholarship" },
                            { value: "Celebration", label: "Celebration" },
                            { value: "Educational", label: "Educational" },
                        ]}
                    />
                    <Input
                        label="Description"
                        name="event_description"
                        value={form.event_description}
                        onChange={handleInputChange}
                        placeholder="Briefly describe the event..."
                    />

                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Action Buttons</h3>
                            <Button size="sm" variant="secondary" className="bg-purple-50 text-purple-600 hover:bg-purple-100" onClick={handleAddButton}>
                                + Add Button
                            </Button>
                        </div>

                        {form.buttons.length === 0 && (
                            <p className="text-xs text-center py-4 text-gray-400 italic">
                                No buttons added yet. Adding buttons allows users to take actions (e.g. Register, View Details).
                            </p>
                        )}

                        <div className="space-y-3">
                            {form.buttons.map((btn, index) => (
                                <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 rounded-2xl relative group">
                                    <div className="flex-1">
                                        <Input
                                            label="Button Text"
                                            value={btn.button_text}
                                            onChange={(e) => handleButtonChange(index, "button_text", e.target.value)}
                                            placeholder="e.g. Register Now"
                                        />
                                    </div>
                                    <div className="flex-[2]">
                                        <Input
                                            label="URL/Link"
                                            value={btn.button_url}
                                            onChange={(e) => handleButtonChange(index, "button_url", e.target.value)}
                                            placeholder="https://example.com/register"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveButton(index)}
                                        className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-500 rounded-full hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
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
            </Modal>
        </div>
    );
}
