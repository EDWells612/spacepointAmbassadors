import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Users, GraduationCap, Copy, Check, Share2, Plus, X, Calendar, CheckCircle, BookOpen, Send } from 'lucide-react';

const API_URL = 'http://localhost:8000/api';

export default function Network() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [activeTab, setActiveTab] = useState('recruits'); // 'recruits' or 'sessions'
  
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (user) {
      fetchNetworkData();
      fetchAllSessions();
    }
  }, [user]);

  const fetchNetworkData = async () => {
    setLoading(true);
    try {
      const [teachersRes, instructorsRes, meRes] = await Promise.all([
        axios.get(`${API_URL}/network/teachers`),
        axios.get(`${API_URL}/network/instructors`),
        axios.get(`${API_URL}/auth/me`),
      ]);
      setTeachers(teachersRes.data);
      setInstructors(instructorsRes.data);
      setInviteCode(meRes.data.invite_code || '');
    } catch (err) {
      console.error('Failed to fetch network data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSessions = async () => {
    try {
      const res = await axios.get(`${API_URL}/network/all-sessions`);
      setAllSessions(res.data);
    } catch (err) { console.error(err); }
  };

  const updateTeacherStatus = async (teacherId, newStatus) => {
    try {
      await axios.put(`${API_URL}/network/teachers/${teacherId}/status`, { status: newStatus });
      fetchNetworkData();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const approveSession = async (sessionId) => {
    setActionLoading(sessionId + '-approve');
    try {
      await axios.put(`${API_URL}/network/sessions/${sessionId}/approve`);
      fetchAllSessions();
      if (selectedTeacher) fetchNetworkData(); // Refresh modal if open
    } catch (err) { alert(err.response?.data?.detail || err.message); }
    finally { setActionLoading(null); }
  };

  const rejectSession = async (sessionId) => {
    if (!confirm("Are you sure you want to reject this session?")) return;
    setActionLoading(sessionId + '-reject');
    try {
      await axios.put(`${API_URL}/network/sessions/${sessionId}/reject`);
      fetchAllSessions();
      if (selectedTeacher) fetchNetworkData(); // Refresh modal if open
    } catch (err) { alert(err.response?.data?.detail || err.message); }
    finally { setActionLoading(null); }
  };

  const sendMaterial = async (sessionId) => {
    setActionLoading(sessionId + '-material');
    try {
      await axios.put(`${API_URL}/network/sessions/${sessionId}/material-sent`);
      fetchAllSessions();
      if (selectedTeacher) fetchNetworkData(); // Refresh modal if open
    } catch (err) { alert(err.response?.data?.detail || err.message); }
    finally { setActionLoading(null); }
  };

  const copyToClipboard = () => {
    const link = `${window.location.origin}/teacher-apply?code=${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusStyles = {
    pending: 'bg-surface border-secondary text-secondary',
    approved: 'bg-primary-90 border-primary text-on-surface',
    done: 'bg-green-500/20 border-green-500/30 text-green-400',
    rejected: 'bg-error/10 border-error/30 text-error',
  };

  return (
    <div className="p-md md:p-lg lg:p-xl w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-lg">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-2">My Network</h1>
          <p className="text-body-lg text-secondary">Manage your recruited Teachers, Instructors, and their industry sessions.</p>
        </div>

        <div className="mt-4 md:mt-0 bg-tertiary border border-primary-90 p-4 rounded-lg flex items-center space-x-4">
          <div>
            <p className="text-label-sm text-secondary uppercase tracking-wider mb-1">Your Invite Code</p>
            <p className="text-headline-sm text-primary-60 tracking-widest font-outfit">{inviteCode || '------'}</p>
          </div>
          <button
            onClick={copyToClipboard}
            className="p-2 bg-surface hover:bg-primary-90 rounded-md transition-colors text-on-surface"
            title="Copy invite link"
          >
            {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-4 mb-lg border-b border-primary-90">
        <button 
          onClick={() => setActiveTab('recruits')}
          className={`pb-3 px-2 font-bold transition-colors relative ${activeTab === 'recruits' ? 'text-primary-60' : 'text-secondary hover:text-on-surface'}`}
        >
          My Recruits
          {activeTab === 'recruits' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-60 rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 px-2 font-bold transition-colors relative ${activeTab === 'sessions' ? 'text-primary-60' : 'text-secondary hover:text-on-surface'}`}
        >
          All Sessions
          {activeTab === 'sessions' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-60 rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'recruits' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
          {/* Teachers Section */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <GraduationCap className="text-primary-60" />
              <h2 className="text-headline-sm text-on-surface">Industry Teachers</h2>
              <span className="bg-primary-90 text-label-sm px-2 py-0.5 rounded-full text-on-surface ml-auto">
                {teachers.filter(t => t.status === 'active').length} active
              </span>
            </div>
            <div className="bg-tertiary rounded-lg border border-primary-90 overflow-hidden">
              {loading ? <p className="p-8 text-center text-secondary">Loading...</p> : teachers.length === 0 ? (
                <p className="p-8 text-center text-secondary">No teachers recruited yet.</p>
              ) : (
                <ul className="divide-y divide-primary-90/50">
                  {teachers.map(teacher => (
                    <li key={teacher.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-on-surface">{teacher.name}</p>
                        <p className="text-label-sm text-secondary">{teacher.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {teacher.status === 'pending' ? (
                          <div className="flex space-x-2">
                            <button onClick={() => updateTeacherStatus(teacher.id, 'active')} className="bg-green-900/50 text-green-300 px-3 py-1 rounded-full border border-green-700 text-xs font-bold">Approve</button>
                            <button onClick={() => updateTeacherStatus(teacher.id, 'rejected')} className="bg-error/20 text-error px-3 py-1 rounded-full border border-error text-xs font-bold">Reject</button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${teacher.status === 'active' ? 'bg-primary-90 border-primary' : 'text-secondary border-primary-90'}`}>
                              {teacher.status.toUpperCase()}
                            </span>
                            {teacher.status === 'active' && (
                              <button onClick={() => setSelectedTeacher(teacher)} className="p-1.5 hover:bg-primary-90 rounded-full text-secondary hover:text-on-surface transition-colors">
                                <BookOpen size={18} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Instructors Section */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Users className="text-primary-60" />
              <h2 className="text-headline-sm text-on-surface">Kit Instructors</h2>
              <span className="bg-primary-90 text-label-sm px-2 py-0.5 rounded-full text-on-surface ml-auto">
                {instructors.filter(i => i.status === 'active').length} active
              </span>
            </div>
            <div className="bg-tertiary rounded-lg border border-primary-90 overflow-hidden">
              {loading ? <p className="p-8 text-center text-secondary">Loading...</p> : instructors.length === 0 ? (
                <p className="p-8 text-center text-secondary">No instructors recruited yet.</p>
              ) : (
                <ul className="divide-y divide-primary-90/50">
                  {instructors.map(inst => (
                    <li key={inst.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-on-surface">{inst.name}</p>
                        <p className="text-label-sm text-secondary">{inst.email}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${inst.status === 'active' ? 'bg-green-900/50 border-green-700 text-green-300' : 'text-secondary border-primary-90'}`}>
                        {inst.status.toUpperCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* All Sessions Table */
        <div className="bg-tertiary rounded-lg border border-primary-90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-90 text-secondary text-left bg-surface/50">
                  <th className="py-4 px-md font-semibold">Teacher</th>
                  <th className="py-4 pr-md font-semibold">Session Title</th>
                  <th className="py-4 pr-md font-semibold">Date & Time</th>
                  <th className="py-4 pr-md font-semibold text-center">Planned</th>
                  <th className="py-4 pr-md font-semibold text-center">Attended</th>
                  <th className="py-4 pr-md font-semibold">Status</th>
                  <th className="py-4 pr-md font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-90/50">
                {allSessions.length === 0 ? (
                  <tr><td colSpan="7" className="py-8 text-center text-secondary">No sessions found in your network.</td></tr>
                ) : (
                  allSessions.map(s => (
                    <tr key={s.id} className="hover:bg-surface/30 transition-colors">
                      <td className="py-4 px-md">
                        <p className="font-bold text-on-surface">{s.teacher_name}</p>
                        <p className="text-xs text-secondary">{s.teacher_email}</p>
                      </td>
                      <td className="py-4 pr-md font-semibold text-on-surface">{s.title}</td>
                      <td className="py-4 pr-md text-secondary">
                        <div className="flex items-center">
                          <Calendar size={13} className="mr-1.5" />
                          {new Date(s.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </td>
                      <td className="py-4 pr-md text-center font-bold text-on-surface">{s.planned_students || 0}</td>
                      <td className="py-4 pr-md text-center">
                        {s.status === 'done' ? <span className="text-green-400 font-bold">{s.attended_students || 0}</span> : <span className="text-secondary">—</span>}
                      </td>
                      <td className="py-4 pr-md">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${statusStyles[s.status] || ''}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-4 pr-md text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {s.status === 'pending' && (
                            <>
                              <button onClick={() => approveSession(s.id)} disabled={actionLoading === s.id + '-approve'} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold transition-colors disabled:opacity-50">
                                Approve
                              </button>
                              <button onClick={() => rejectSession(s.id)} disabled={actionLoading === s.id + '-reject'} className="bg-error/20 text-error hover:bg-error/30 px-3 py-1 rounded-full text-xs font-bold border border-error transition-colors disabled:opacity-50">
                                Reject
                              </button>
                            </>
                          )}
                          {s.status === 'approved' && !s.material_sent && (
                            <button onClick={() => sendMaterial(s.id)} disabled={actionLoading === s.id + '-material'} className="flex items-center space-x-1 bg-primary hover:bg-primary-60 text-on-surface px-3 py-1 rounded-full text-xs font-bold transition-colors disabled:opacity-50">
                              <Send size={12} />
                              <span>Send Material</span>
                            </button>
                          )}
                          {s.material_sent && s.status !== 'done' && (
                             <span className="text-[10px] text-blue-400 font-bold uppercase">Material Sent</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Teacher Sessions Modal */}
      {selectedTeacher && (
        <TeacherSessionsModal
          teacher={selectedTeacher}
          onClose={() => { setSelectedTeacher(null); fetchAllSessions(); }}
          approveSession={approveSession}
          rejectSession={rejectSession}
          sendMaterial={sendMaterial}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}

/* ── Teacher Sessions Modal (Refactored) ─────────────────────────────── */

function TeacherSessionsModal({ teacher, onClose, approveSession, rejectSession, sendMaterial, actionLoading }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/network/teachers/${teacher.id}/sessions`);
      setSessions(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const statusStyles = {
    pending: 'bg-surface border-secondary text-secondary',
    approved: 'bg-primary-90 border-primary text-on-surface',
    done: 'bg-green-500/20 border-green-500/30 text-green-400',
    rejected: 'bg-error/10 border-error/30 text-error',
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-tertiary border border-primary-90 rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-lg pb-4 border-b border-primary-90">
          <div>
            <h2 className="text-headline-sm text-on-surface">{teacher.name}'s Sessions</h2>
            <p className="text-body-sm text-secondary">{teacher.email}</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-on-surface"><X size={24} /></button>
        </div>

        <div className="p-lg">
          {loading ? (
            <p className="text-secondary text-center py-md">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-secondary text-center py-md">No sessions submitted yet.</p>
          ) : (
            <div className="space-y-3 mb-md">
              {sessions.map((s) => (
                <div key={s.id} className="bg-surface border border-primary-90 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-label-lg font-semibold text-on-surface">{s.title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${statusStyles[s.status] || ''}`}>
                          {s.status}
                        </span>
                        {s.material_sent && (
                          <span className="text-[10px] bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase">
                            MATERIAL SENT
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-body-sm text-secondary">
                        <p className="flex items-center">
                          <Calendar size={13} className="mr-1" />
                          {new Date(s.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </p>
                        <p>Planned: <span className="text-on-surface font-bold">{s.planned_students || 0}</span></p>
                        {s.status === 'done' && <p>Attended: <span className="text-green-400 font-bold">{s.attended_students || 0}</span></p>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {s.status === 'pending' && (
                        <>
                          <button
                            onClick={async () => { await approveSession(s.id); fetchSessions(); }}
                            disabled={actionLoading === s.id + '-approve'}
                            className="bg-green-600 hover:bg-green-500 text-white text-xs px-4 py-2 rounded-full font-bold transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => { await rejectSession(s.id); fetchSessions(); }}
                            disabled={actionLoading === s.id + '-reject'}
                            className="bg-error/20 text-error hover:bg-error/30 text-xs px-4 py-2 rounded-full font-bold border border-error transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {s.status === 'approved' && !s.material_sent && (
                        <button
                          onClick={async () => { await sendMaterial(s.id); fetchSessions(); }}
                          disabled={actionLoading === s.id + '-material'}
                          className="flex items-center space-x-1 bg-primary hover:bg-primary-60 text-on-surface text-xs px-4 py-2 rounded-full font-bold transition-colors disabled:opacity-50"
                        >
                          <Send size={13} />
                          <span>Send Material</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}