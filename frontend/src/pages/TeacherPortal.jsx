import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Plus, X, Calendar, CheckCircle, Clock, Send } from 'lucide-react';

const API_URL = 'http://localhost:8000/api';

export default function TeacherPortal() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ title: '', date: '', planned_students: '' });
    const [submitting, setSubmitting] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) fetchSessions();
    }, [user]);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/network/teachers/${user.id}/sessions`);
            setSessions(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSession = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await axios.post(`${API_URL}/network/teachers/${user.id}/sessions`, {
                title: form.title,
                date: new Date(form.date).toISOString(),
                planned_students: parseInt(form.planned_students) || 0
            });
            setShowAdd(false);
            setForm({ title: '', date: '', planned_students: '' });
            fetchSessions();
        } catch (err) {
            setError(err.response?.data?.detail || err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const markDone = async (sessionId) => {
        const attended = prompt("Enter the number of students who attended this session:");
        if (attended === null) return;
        const attendedCount = parseInt(attended);
        if (isNaN(attendedCount)) {
            alert("Please enter a valid number");
            return;
        }

        setActionLoading(sessionId);
        try {
            await axios.put(`${API_URL}/network/sessions/${sessionId}/done`, { attended_students: attendedCount });
            fetchSessions();
        } catch (err) {
            alert(err.response?.data?.detail || err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const statusConfig = {
        pending: { label: 'Pending Approval', style: 'bg-surface border-secondary text-secondary', icon: <Clock size={14} /> },
        approved: { label: 'Approved', style: 'bg-primary-90 border-primary text-on-surface', icon: <CheckCircle size={14} /> },
        done: { label: 'Done', style: 'bg-green-500/20 border-green-500/30 text-green-400', icon: <CheckCircle size={14} /> },
    };

    return (
        <div className="p-md max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-lg">
                <div>
                    <h1 className="text-headline-lg text-on-surface mb-2">My Sessions</h1>
                    <p className="text-body-lg text-secondary">
                        Submit and manage your industry sessions sponsored by Spacepoint.
                    </p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="mt-4 md:mt-0 flex items-center bg-primary hover:bg-primary-60 text-on-surface px-6 py-3 rounded-full font-semibold transition-colors"
                >
                    <Plus size={18} className="mr-2" />
                    Add Session
                </button>
            </div>

            {/* How it works */}
            <div className="bg-tertiary border border-primary-90 rounded-lg p-md mb-lg">
                <h3 className="text-label-lg text-on-surface font-semibold mb-3">How it works</h3>
                <div className="flex flex-col md:flex-row gap-sm text-body-sm text-secondary">
                    <Step n="1" text="Submit session with planned student count" />
                    <Step n="2" text="Your ambassador reviews and approves it" />
                    <Step n="3" text="Receive session material from your ambassador" />
                    <Step n="4" text="Deliver session, report attendees and mark done" />
                </div>
            </div>

            {loading ? (
                <p className="text-secondary text-center py-lg">Loading sessions...</p>
            ) : sessions.length === 0 ? (
                <div className="bg-tertiary border border-primary-90 rounded-lg p-xl text-center">
                    <BookOpen size={40} className="mx-auto text-secondary mb-3 opacity-40" />
                    <p className="text-on-surface font-semibold mb-1">No sessions yet</p>
                    <p className="text-secondary text-body-sm">Click "Add Session" to submit your first session for approval.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((s) => {
                        const cfg = statusConfig[s.status] || statusConfig.pending;
                        const canMarkDone = s.status === 'approved' && s.material_sent;
                        return (
                            <div key={s.id} className="bg-tertiary border border-primary-90 rounded-lg p-md flex items-center justify-between">
                                <div className="flex-grow">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <p className="text-label-lg font-semibold text-on-surface">{s.title}</p>
                                        <span className={`flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.style}`}>
                                            {cfg.icon}
                                            <span className="ml-1">{cfg.label}</span>
                                        </span>
                                        {s.material_sent && (
                                            <span className="flex items-center space-x-1 text-xs bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                                                <Send size={11} />
                                                <span>Material Received</span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-body-sm text-secondary">
                                        <p className="flex items-center">
                                            <Calendar size={13} className="mr-1" />
                                            {new Date(s.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                        </p>
                                        <p className="flex items-center">
                                            <span className="font-semibold text-on-surface mr-1">{s.planned_students || 0}</span> Students Planned
                                        </p>
                                        {s.status === 'done' && (
                                            <p className="flex items-center text-green-400">
                                                <span className="font-semibold mr-1">{s.attended_students || 0}</span> Attended
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {canMarkDone && (
                                    <button
                                        onClick={() => markDone(s.id)}
                                        disabled={actionLoading === s.id}
                                        className="flex items-center space-x-1 bg-green-600 hover:bg-green-500 text-white text-label-sm px-4 py-2 rounded-full font-semibold transition-colors disabled:opacity-50"
                                    >
                                        <CheckCircle size={15} />
                                        <span>{actionLoading === s.id ? '...' : 'Mark Done'}</span>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Session Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-tertiary border border-primary-90 rounded-lg w-full max-w-2xl shadow-2xl p-lg">
                        <div className="flex items-center justify-between mb-md">
                            <h2 className="text-headline-sm text-on-surface">Add New Session</h2>
                            <button onClick={() => { setShowAdd(false); setError(''); }} className="text-secondary hover:text-on-surface">
                                <X size={22} />
                            </button>
                        </div>
                        {error && (
                            <div className="bg-error/20 border border-error text-error text-body-sm p-3 rounded-md mb-md">{error}</div>
                        )}
                        <form onSubmit={handleAddSession} className="space-y-md">
                            <div>
                                <label className="block text-label-md text-secondary mb-2">Session Title</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="w-full bg-surface border border-primary-90 rounded-md p-4 text-on-surface focus:outline-none focus:border-primary transition-colors text-headline-sm"
                                    placeholder="e.g. Intro to Robotics for Beginners"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                                <div>
                                    <label className="block text-label-md text-secondary mb-2">Session Date & Time</label>
                                    <div className="relative">
                                        <input
                                            type="datetime-local"
                                            required
                                            value={form.date}
                                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                                            className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-label-md text-secondary mb-2">Planned Students</label>
                                    <input
                                        type="number"
                                        min={1}
                                        required
                                        value={form.planned_students}
                                        onChange={(e) => setForm({ ...form, planned_students: e.target.value })}
                                        className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                                        placeholder="e.g. 50"
                                    />
                                </div>
                            </div>
                            <div className="pt-md">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-primary hover:bg-primary-60 text-on-surface font-bold py-4 rounded-full transition-colors disabled:opacity-50 text-headline-sm shadow-lg shadow-primary/20"
                                >
                                    {submitting ? 'Submitting...' : 'Submit for Approval'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function Step({ n, text }) {
    return (
        <div className="flex items-start space-x-2 flex-1">
            <span className="w-6 h-6 rounded-full bg-primary-90 text-primary-60 text-label-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
            <p>{text}</p>
        </div>
    );
}