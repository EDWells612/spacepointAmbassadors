import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Settings, Users, Gift, Target, CheckSquare,
  UserCheck, UserX, Clock, Shield, Plus, Package, GraduationCap,
  BarChart2, DollarSign, ArrowUpRight, ArrowDownRight, Trophy
} from 'lucide-react';

import { API_URL } from '../config';

export default function AdminPortal() {
  const { role } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'ambassadors');

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  if (role !== 'admin') {
    return (
      <div className="p-md text-center max-w-2xl mx-auto mt-xl">
        <h1 className="text-headline-lg text-error mb-4">Access Denied</h1>
        <p className="text-body-lg text-secondary">You do not have permission to view the admin portal.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)]">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-64 bg-tertiary border-r border-primary-90 p-md flex-col space-y-2 flex-shrink-0">
        <h2 className="text-label-lg uppercase tracking-wider text-secondary mb-4 ml-2">Admin Modules</h2>
        <SidebarBtn icon={<Users />} label="Ambassadors" active={activeTab === 'ambassadors'} onClick={() => setActiveTab('ambassadors')} />
        <SidebarBtn icon={<Settings />} label="System Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        <SidebarBtn icon={<Target />} label="Leads Pipeline" active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} />
        <SidebarBtn icon={<CheckSquare />} label="Task Management" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
        <SidebarBtn icon={<Package />} label="Redemption Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
        <SidebarBtn icon={<Gift />} label="Swag Catalog" active={activeTab === 'swag'} onClick={() => setActiveTab('swag')} />
        <SidebarBtn icon={<Trophy />} label="Leaderboard" active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} />
        <SidebarBtn icon={<DollarSign />} label="Commission Log" active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} />
        <SidebarBtn icon={<Trophy />} label="Points Log" active={activeTab === 'points'} onClick={() => setActiveTab('points')} />
      </div>

      {/* Mobile Module Selector - Horizontal Scroll */}
      <div className="md:hidden flex overflow-x-auto bg-tertiary border-b border-primary-90 p-sm space-x-2 scrollbar-hide sticky top-[64px] z-30">
        <MobileTabBtn icon={<Users size={16} />} label="Ambassadors" active={activeTab === 'ambassadors'} onClick={() => setActiveTab('ambassadors')} />
        <MobileTabBtn icon={<Settings size={16} />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        <MobileTabBtn icon={<Target size={16} />} label="Leads" active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} />
        <MobileTabBtn icon={<CheckSquare size={16} />} label="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
        <MobileTabBtn icon={<Package size={16} />} label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
        <MobileTabBtn icon={<Gift size={16} />} label="Swag" active={activeTab === 'swag'} onClick={() => setActiveTab('swag')} />
        <MobileTabBtn icon={<Trophy size={16} />} label="Leaderboard" active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} />
        <MobileTabBtn icon={<DollarSign size={16} />} label="Commission" active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} />
        <MobileTabBtn icon={<Trophy size={16} />} label="Points" active={activeTab === 'points'} onClick={() => setActiveTab('points')} />
      </div>

      <div className="flex-grow p-sm md:p-lg overflow-y-auto">
        {activeTab === 'ambassadors' && <AdminAmbassadors />}
        {activeTab === 'settings' && <AdminSettings />}
        {activeTab === 'leads' && <AdminLeads />}
        {activeTab === 'tasks' && <AdminTasks />}
        {activeTab === 'orders' && <AdminOrders />}
        {activeTab === 'swag' && <AdminSwag />}
        {activeTab === 'leaderboard' && <AdminLeaderboard />}
        {activeTab === 'commission' && <AdminCommissionLog />}
        {activeTab === 'points' && <AdminPointsLog />}
      </div>
    </div>
  );
}

function MobileTabBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 whitespace-nowrap px-4 py-2 rounded-full text-label-sm transition-colors ${active ? 'bg-primary text-on-surface' : 'bg-surface border border-primary-90 text-secondary'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SidebarBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center space-x-3 w-full text-left px-4 py-3 rounded-lg transition-colors ${active ? 'bg-primary-90 text-on-surface font-semibold' : 'text-secondary hover:bg-surface hover:text-on-surface'}`}>
      {React.cloneElement(icon, { size: 18 })}
      <span>{label}</span>
    </button>
  );
}

/* ─── Ambassadors ─────────────────────────────────────────── */

function AdminAmbassadors() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedAmbassadorId, setSelectedAmbassadorId] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);

  useEffect(() => { fetchUsers(); }, [filter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { role: 'ambassador' };
      if (filter !== 'all') params.status = filter;
      const res = await axios.get(`${API_URL}/admin/users`, { params });
      setUsers(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const updateStatus = async (userId, newStatus) => {
    setActionLoading(userId);
    try { await axios.put(`${API_URL}/admin/users/${userId}/status`, { status: newStatus }); await fetchUsers(); }
    catch (err) { alert(err.response?.data?.detail || err.message); }
    setActionLoading(null);
  };

  const statusBadge = (status) => {
    const s = { pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', active: 'bg-green-500/20 text-green-400 border-green-500/30', rejected: 'bg-red-500/20 text-red-400 border-red-500/30' };
    return <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${s[status] || 'bg-gray-500/20 text-gray-400'}`}>{status.toUpperCase()}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-headline-lg">Ambassadors</h2>
        <div className="flex items-center space-x-2">
          {['active', 'pending', 'rejected', 'all'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-label-sm font-semibold transition-colors ${filter === f ? 'bg-primary-90 text-on-surface' : 'text-secondary hover:bg-surface'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {loading ? <p className="text-secondary">Loading...</p> : users.length === 0 ? (
        <div className="text-center py-xl"><Users size={48} className="mx-auto text-secondary mb-4 opacity-40" /><p className="text-secondary text-body-lg">No {filter === 'all' ? '' : filter} ambassadors.</p></div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="bg-surface border border-primary-90 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-tertiary flex items-center justify-center text-primary-60 font-bold text-lg">{u.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-label-lg text-on-surface font-semibold">{u.name}</p>
                    {u.role === 'admin' && <Shield size={14} className="text-primary-60" />}
                  </div>
                  <p className="text-body-sm text-secondary">{u.email}</p>
                  <div className="flex items-center space-x-3 mt-1 text-label-sm text-secondary">
                    <span>{u.country || 'N/A'}</span>
                    {u.invite_code && <span>Code: <span className="font-mono text-primary-60">{u.invite_code}</span></span>}
                    <span><Clock size={12} className="inline mr-1" />{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {statusBadge(u.status)}
                {u.status === 'pending' && (
                  <>
                    <button onClick={() => updateStatus(u.id, 'active')} disabled={actionLoading === u.id} className="flex items-center space-x-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-full text-label-sm font-semibold transition-colors disabled:opacity-50"><UserCheck size={16} /><span>Approve</span></button>
                    <button onClick={() => updateStatus(u.id, 'rejected')} disabled={actionLoading === u.id} className="flex items-center space-x-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 px-4 py-2 rounded-full text-label-sm font-semibold transition-colors disabled:opacity-50"><UserX size={16} /><span>Reject</span></button>
                  </>
                )}
                {u.status === 'rejected' && <button onClick={() => updateStatus(u.id, 'active')} disabled={actionLoading === u.id} className="flex items-center space-x-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-full text-label-sm font-semibold transition-colors disabled:opacity-50"><UserCheck size={16} /><span>Approve</span></button>}
                {u.status === 'active' && u.role !== 'admin' && <button onClick={() => updateStatus(u.id, 'rejected')} disabled={actionLoading === u.id} className="flex items-center space-x-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 px-4 py-2 rounded-full text-label-sm font-semibold transition-colors disabled:opacity-50"><UserX size={16} /><span>Revoke</span></button>}
                <button onClick={() => setSelectedAmbassadorId(u.id)} className="bg-primary hover:bg-primary-60 text-on-surface px-4 py-2 rounded-full text-label-sm font-semibold transition-colors">Details</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAmbassadorId && <AmbassadorDetails ambassadorId={selectedAmbassadorId} onClose={() => setSelectedAmbassadorId(null)} onTeacherClick={(id) => setSelectedTeacherId(id)} />}
      {selectedTeacherId && <TeacherDetails teacherId={selectedTeacherId} onClose={() => setSelectedTeacherId(null)} />}
    </div>
  );
}

/* ─── Settings ────────────────────────────────────────────── */

function AdminSettings() {
  const [commissionEnabled, setCommissionEnabled] = useState(false);
  const [sessionPoints, setSessionPoints] = useState(200);
  const [teacherPoints, setTeacherPoints] = useState(500);
  const [instructorPoints, setInstructorPoints] = useState(500);
  const [leadPoints, setLeadPoints] = useState(1000);

  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(null);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try { 
      const res = await axios.get(`${API_URL}/settings`); 
      setCommissionEnabled(res.data.commission_enabled); 
      setSessionPoints(res.data.session_points_reward);
      setTeacherPoints(res.data.teacher_points_reward);
      setInstructorPoints(res.data.instructor_points_reward);
      setLeadPoints(res.data.lead_points_reward);
    }
    catch (err) { console.error(err); }
    setLoading(false);
  };

  const toggleCommission = async () => {
    setToggling(true);
    try {
      const newVal = commissionEnabled ? 'false' : 'true';
      await axios.put(`${API_URL}/admin/settings/commission_enabled`, { value: newVal });
      setCommissionEnabled(!commissionEnabled);
    } catch (err) { alert(err.response?.data?.detail || err.message); }
    setToggling(false);
  };

  const saveSetting = async (key, value) => {
    setSaving(key);
    try {
      await axios.put(`${API_URL}/admin/settings/${key}`, { value: value.toString() });
    } catch (err) { alert(err.response?.data?.detail || err.message); }
    setSaving(null);
  };

  if (loading) return <p className="text-secondary">Loading system settings...</p>;

  return (
    <div className="max-w-3xl">
      <h2 className="text-headline-lg mb-6">System Settings</h2>
      
      <div className="space-y-md">
        {/* Commission Engine */}
        <div className="bg-surface border border-primary-90 p-md rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-headline-sm">Commission Engine</h3>
              <p className="text-body-sm text-secondary mt-1">
                When enabled, ambassadors can earn cash commission from converted leads.
              </p>
            </div>
            <button onClick={toggleCommission} disabled={toggling}
              className={`px-6 py-2 rounded-full font-bold transition-colors min-w-[120px] ${commissionEnabled ? 'bg-green-600 text-white' : 'bg-tertiary border border-primary-90 text-secondary'} disabled:opacity-50`}>
              {toggling ? '...' : commissionEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        </div>

        {/* Points Rewards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <RewardConfig 
            title="Teacher Reward" 
            desc="Points for recruiting a new teacher (on approval)." 
            value={teacherPoints} 
            onChange={setTeacherPoints} 
            onSave={() => saveSetting('teacher_points_reward', teacherPoints)}
            isSaving={saving === 'teacher_points_reward'}
          />
          <RewardConfig 
            title="Instructor Reward" 
            desc="Points for recruiting a new instructor (on approval)." 
            value={instructorPoints} 
            onChange={setInstructorPoints} 
            onSave={() => saveSetting('instructor_points_reward', instructorPoints)}
            isSaving={saving === 'instructor_points_reward'}
          />
          <RewardConfig 
            title="Lead Reward" 
            desc="Points awarded when a lead is converted." 
            value={leadPoints} 
            onChange={setLeadPoints} 
            onSave={() => saveSetting('lead_points_reward', leadPoints)}
            isSaving={saving === 'lead_points_reward'}
          />
          <RewardConfig 
            title="Session Reward" 
            desc="Points awarded when a teacher marks a session done." 
            value={sessionPoints} 
            onChange={setSessionPoints} 
            onSave={() => saveSetting('session_points_reward', sessionPoints)}
            isSaving={saving === 'session_points_reward'}
          />
        </div>
      </div>
    </div>
  );
}

function RewardConfig({ title, desc, value, onChange, onSave, isSaving }) {
  return (
    <div className="bg-surface border border-primary-90 p-md rounded-lg flex flex-col justify-between">
      <div className="mb-4">
        <h4 className="text-label-lg text-on-surface font-bold">{title}</h4>
        <p className="text-xs text-secondary mt-1">{desc}</p>
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex-grow flex items-center bg-tertiary border border-primary-90 rounded-md px-3 py-2">
          <input 
            type="number" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="bg-transparent w-full text-on-surface focus:outline-none text-right font-bold"
          />
          <span className="text-secondary ml-2 text-xs font-bold uppercase">pts</span>
        </div>
        <button 
          onClick={onSave} 
          disabled={isSaving}
          className="bg-primary hover:bg-primary-60 text-on-surface px-4 py-2 rounded-md font-semibold transition-colors disabled:opacity-50 text-sm"
        >
          {isSaving ? '...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

/* ─── Leads ───────────────────────────────────────────────── */

function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [convertLead, setConvertLead] = useState(null);
  const [dealAmount, setDealAmount] = useState('');
  const [commissionRate, setCommissionRate] = useState('10');

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try { const res = await axios.get(`${API_URL}/leads`); setLeads(res.data); }
    catch (err) { console.error(err); }
    setLoading(false);
  };

  const updateStatus = async (leadId, status, extra = {}) => {
    setUpdatingId(leadId);
    try {
      await axios.put(`${API_URL}/leads/${leadId}/status`, { status, ...extra });
      fetchLeads(); setConvertLead(null); setDealAmount(''); setCommissionRate('10');
    } catch (err) { alert(err.response?.data?.detail || err.message); }
    setUpdatingId(null);
  };

  const handleConvert = () => {
    const amt = parseFloat(dealAmount);
    const rate = parseFloat(commissionRate);
    if (!amt || amt <= 0) { alert('Enter a valid deal amount'); return; }
    if (isNaN(rate) || rate < 0) { alert('Enter a valid commission rate'); return; }
    updateStatus(convertLead.id, 'converted', { deal_amount: amt, commission_rate: rate });
  };

  const statusStyles = {
    submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'in review': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    converted: 'bg-green-500/20 text-green-400 border-green-500/30',
    closed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const previewCommission = dealAmount && commissionRate
    ? (parseFloat(dealAmount || 0) * (parseFloat(commissionRate || 0) / 100)).toFixed(2) : null;

  return (
    <div>
      <h2 className="text-headline-lg mb-6">Leads Pipeline</h2>
      {loading ? <p className="text-secondary">Loading...</p> : leads.length === 0 ? (
        <p className="text-secondary text-center py-lg">No leads submitted yet.</p>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <div key={l.id} className="bg-surface border border-primary-90 rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-1">
                  <p className="text-label-lg text-on-surface font-semibold">{l.contact_name}</p>
                  <span className="text-body-sm text-secondary">@ {l.company}</span>
                  <span className="bg-primary-90 text-label-sm px-2 py-0.5 rounded-full text-on-surface">{l.type}</span>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusStyles[l.status] || ''}`}>{l.status.toUpperCase()}</span>
                </div>
                <p className="text-body-sm text-secondary">
                  By: {l.ambassador_name || l.ambassador_email || 'N/A'} &middot; {new Date(l.created_at).toLocaleDateString()}
                  {l.notes && <span className="ml-2">&middot; {l.notes}</span>}
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {l.status !== 'converted' && l.status !== 'closed' && (
                  <>
                    {l.status === 'submitted' && (
                      <button onClick={() => updateStatus(l.id, 'in review')} disabled={updatingId === l.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 border border-yellow-600/30 transition-colors disabled:opacity-50">Review</button>
                    )}
                    <button onClick={() => { setConvertLead(l); setDealAmount(''); setCommissionRate('10'); }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-600 hover:bg-green-500 text-white border border-green-600 transition-colors">Convert</button>
                    <button onClick={() => updateStatus(l.id, 'closed')} disabled={updatingId === l.id}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 transition-colors disabled:opacity-50">Close</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {convertLead && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-tertiary border border-primary-90 rounded-lg w-full max-w-md shadow-2xl p-lg">
            <h3 className="text-headline-sm text-on-surface mb-1">Convert Lead</h3>
            <p className="text-body-sm text-secondary mb-md">
              {convertLead.contact_name} @ {convertLead.company}<br />
              Ambassador: {convertLead.ambassador_name || 'N/A'}
            </p>
            <div className="space-y-sm">
              <div>
                <label className="block text-label-md text-secondary mb-1">Deal Amount ($)</label>
                <input type="number" step="0.01" min="0.01" value={dealAmount} onChange={(e) => setDealAmount(e.target.value)}
                  className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary" placeholder="e.g. 5000" autoFocus />
              </div>
              <div>
                <label className="block text-label-md text-secondary mb-1">Commission Rate (%)</label>
                <input type="number" step="0.5" min="0" max="100" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary" placeholder="e.g. 10" />
              </div>
              {previewCommission && (
                <div className="bg-surface border border-primary-90 rounded-md p-3 text-center">
                  <p className="text-label-sm text-secondary">Commission to ambassador</p>
                  <p className="text-headline-sm text-green-400 font-bold">${previewCommission}</p>
                </div>
              )}
              <div className="flex space-x-2 pt-sm">
                <button onClick={() => setConvertLead(null)} className="flex-1 border border-primary-90 text-secondary hover:bg-surface py-2 rounded-full font-semibold transition-colors">Cancel</button>
                <button onClick={handleConvert} disabled={updatingId === convertLead.id} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-full font-semibold transition-colors disabled:opacity-50">
                  {updatingId === convertLead.id ? 'Converting...' : 'Confirm Conversion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tasks ───────────────────────────────────────────────── */

function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', deadline: '', points_reward: 100, assigned_to: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchTasks(); fetchAssignableUsers(); }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try { const res = await axios.get(`${API_URL}/tasks`); setTasks(res.data); } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchAssignableUsers = async () => {
    try { const res = await axios.get(`${API_URL}/tasks/assignable-users`); setAssignableUsers(res.data); } catch (err) { console.error(err); }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await axios.post(`${API_URL}/tasks`, { ...formData, points_reward: parseInt(formData.points_reward) || 0, deadline: formData.deadline || null });
      setShowForm(false); setFormData({ title: '', description: '', deadline: '', points_reward: 100, assigned_to: '' }); fetchTasks();
    } catch (err) { alert(err.response?.data?.detail || err.message); }
    setSubmitting(false);
  };

  const updateStatus = async (taskId, status) => {
    try { await axios.put(`${API_URL}/tasks/${taskId}/status`, { status }); fetchTasks(); }
    catch (err) { alert(err.response?.data?.detail || err.message); }
  };

  const statusBadge = (status) => {
    const styles = { pending: 'bg-surface border-secondary text-secondary', accepted: 'bg-primary-90 border-primary text-on-surface', submitted: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400', approved: 'bg-green-500/20 border-green-500/30 text-green-400', rejected: 'bg-red-500/20 border-red-500/30 text-red-400' };
    return <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${styles[status] || ''}`}>{status.toUpperCase()}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-headline-lg">Task Management</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center bg-primary hover:bg-primary-60 text-on-surface px-5 py-2 rounded-full font-semibold transition-colors text-label-sm">
          <Plus size={16} className="mr-1" /> Assign Task
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface border border-primary-90 rounded-lg p-md mb-md space-y-sm max-w-2xl">
          <div>
            <label className="block text-label-md text-secondary mb-1">Assign To</label>
            <select value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })} required className="w-full bg-tertiary border border-primary-90 rounded-md p-3 text-on-surface">
              <option value="">Select ambassador...</option>
              {assignableUsers.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-label-md text-secondary mb-1">Title</label>
            <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-tertiary border border-primary-90 rounded-md p-3 text-on-surface" placeholder="Task title" />
          </div>
          <div>
            <label className="block text-label-md text-secondary mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full bg-tertiary border border-primary-90 rounded-md p-3 text-on-surface resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div>
              <label className="block text-label-md text-secondary mb-1">Deadline</label>
              <input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="w-full bg-tertiary border border-primary-90 rounded-md p-3 text-on-surface" />
            </div>
            <div>
              <label className="block text-label-md text-secondary mb-1">Points</label>
              <input type="number" min={0} required value={formData.points_reward} onChange={(e) => setFormData({ ...formData, points_reward: e.target.value })} className="w-full bg-tertiary border border-primary-90 rounded-md p-3 text-on-surface" />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="bg-primary hover:bg-primary-60 text-on-surface font-semibold py-2 px-6 rounded-full transition-colors disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      )}

      {loading ? <p className="text-secondary">Loading...</p> : tasks.length === 0 ? (
        <p className="text-secondary text-center py-lg">No tasks yet.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <div key={t.id} className="bg-surface border border-primary-90 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <p className="text-label-lg text-on-surface font-semibold">{t.title}</p>
                  {statusBadge(t.status)}
                  <span className="text-primary-60 text-label-sm font-bold">+{t.points_reward} pts</span>
                </div>
                <p className="text-body-sm text-secondary">{t.description || 'No description'}</p>
                {t.deadline && <p className="text-label-sm text-secondary mt-1"><Clock size={12} className="inline mr-1" />{new Date(t.deadline).toLocaleDateString()}</p>}
              </div>
              <div className="flex items-center space-x-2">
                {t.status === 'submitted' && (
                  <>
                    <button onClick={() => updateStatus(t.id, 'approved')} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-full text-label-sm font-semibold transition-colors">Approve</button>
                    <button onClick={() => updateStatus(t.id, 'rejected')} className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 px-4 py-2 rounded-full text-label-sm font-semibold transition-colors">Reject</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Orders ──────────────────────────────────────────────── */

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try { const res = await axios.get(`${API_URL}/redeem`); setOrders(res.data); }
    catch (err) { console.error(err); }
    setLoading(false);
  };

  const fulfillOrder = async (orderId) => {
    setProcessingId(orderId + '-fulfill');
    try { await axios.put(`${API_URL}/admin/redeem/${orderId}/fulfill`); fetchOrders(); }
    catch (err) { alert(err.response?.data?.detail || err.message); }
    setProcessingId(null);
  };

  const rejectOrder = async (orderId) => {
    setProcessingId(orderId + '-reject');
    try { await axios.put(`${API_URL}/admin/redeem/${orderId}/reject`); fetchOrders(); }
    catch (err) { alert(err.response?.data?.detail || err.message); }
    setProcessingId(null);
  };

  const statusStyles = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    fulfilled: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div>
      <h2 className="text-headline-lg mb-6">Redemption Orders</h2>
      {loading ? <p className="text-secondary">Loading...</p> : orders.length === 0 ? (
        <p className="text-secondary text-center py-md mb-lg">No redemption orders yet.</p>
      ) : (
        <div className="space-y-3 mb-xl">
          {orders.map((o) => (
            <div key={o.id} className="bg-surface border border-primary-90 rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-1">
                  <p className="text-label-lg text-on-surface font-semibold">
                    {o.wallet === 'points' ? `Swag: ${o.item_name || 'Unknown'}` : 'Commission Withdrawal'}
                  </p>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusStyles[o.status] || ''}`}>{o.status.toUpperCase()}</span>
                  <span className="bg-primary-90 text-label-sm px-2 py-0.5 rounded-full text-on-surface">{o.wallet}</span>
                  {o.amount && <span className="text-label-sm text-secondary">${parseFloat(o.amount).toFixed(2)}</span>}
                </div>
                <p className="text-body-sm text-secondary">
                  {o.user_name || 'Unknown'} ({o.user_email || ''}) &middot; {new Date(o.created_at).toLocaleString()}
                </p>
                <p className="text-body-sm text-secondary mt-0.5">
                  {o.wallet === 'commission' ? 'Payment details: ' : 'Ship to: '}{o.address}
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {o.status === 'pending' && (
                  <>
                    <button onClick={() => fulfillOrder(o.id)} disabled={processingId === o.id + '-fulfill'}
                      className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-full text-label-sm font-semibold transition-colors disabled:opacity-50">
                      {processingId === o.id + '-fulfill' ? '...' : 'Fulfill'}
                    </button>
                    <button onClick={() => rejectOrder(o.id)} disabled={processingId === o.id + '-reject'}
                      className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 px-4 py-2 rounded-full text-label-sm font-semibold transition-colors disabled:opacity-50">
                      {processingId === o.id + '-reject' ? '...' : 'Reject'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Swag ────────────────────────────────────────────────── */

function AdminSwag() {
  const [swagItems, setSwagItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', points_cost: 500, image_url: '' });
  const [addingItem, setAddingItem] = useState(false);

  useEffect(() => { fetchSwagItems(); }, []);

  const fetchSwagItems = async () => {
    setLoading(true);
    try { const res = await axios.get(`${API_URL}/swag`); setSwagItems(res.data); }
    catch (err) { console.error(err); }
    setLoading(false);
  };

  const addSwagItem = async (e) => {
    e.preventDefault();
    setAddingItem(true);
    try {
      await axios.post(`${API_URL}/admin/swag`, { ...newItem, points_cost: parseInt(newItem.points_cost) || 0 });
      setShowAddItem(false); setNewItem({ name: '', description: '', points_cost: 500, image_url: '' }); fetchSwagItems();
    } catch (err) { alert(err.response?.data?.detail || err.message); }
    setAddingItem(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-headline-lg">Swag Catalog</h2>
        <button onClick={() => setShowAddItem(!showAddItem)}
          className="flex items-center bg-primary hover:bg-primary-60 text-on-surface px-5 py-2 rounded-full font-semibold transition-colors text-label-sm">
          <Plus size={16} className="mr-1" /> Add Item
        </button>
      </div>

      {showAddItem && (
        <form onSubmit={addSwagItem} className="bg-surface border border-primary-90 rounded-lg p-md mb-md space-y-sm max-w-lg">
          <div>
            <label className="block text-label-md text-secondary mb-1">Item Name</label>
            <input type="text" required value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full bg-tertiary border border-primary-90 rounded-md p-3 text-on-surface" placeholder="e.g. SpacePoint Cap" />
          </div>
          <div>
            <label className="block text-label-md text-secondary mb-1">Description</label>
            <input type="text" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="w-full bg-tertiary border border-primary-90 rounded-md p-3 text-on-surface" placeholder="Brief description" />
          </div>
          <div>
            <label className="block text-label-md text-secondary mb-1">Points Cost</label>
            <input type="number" min={1} required value={newItem.points_cost} onChange={(e) => setNewItem({ ...newItem, points_cost: e.target.value })}
              className="w-full bg-tertiary border border-primary-90 rounded-md p-3 text-on-surface" />
          </div>
          <div>
            <label className="block text-label-md text-secondary mb-1">Image URL</label>
            <input type="url" value={newItem.image_url} onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
              className="w-full bg-tertiary border border-primary-90 rounded-md p-3 text-on-surface" placeholder="https://example.com/image.png" />
          </div>
          <button type="submit" disabled={addingItem}
            className="bg-primary hover:bg-primary-60 text-on-surface font-semibold py-2 px-6 rounded-full transition-colors disabled:opacity-50">
            {addingItem ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-secondary text-center py-md">Loading...</p>
      ) : swagItems.length === 0 ? (
        <p className="text-secondary text-center py-md">No swag items yet. Add some above!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sm">
          {swagItems.map((item) => (
            <div key={item.id} className="bg-surface border border-primary-90 rounded-lg overflow-hidden flex flex-col">
              {item.image_url && (
                <div className="h-40 w-full overflow-hidden border-b border-primary-90 bg-tertiary">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-label-lg text-on-surface font-semibold">{item.name}</h4>
                  <span className="text-primary-60 text-label-sm font-bold bg-primary-90 px-2 py-0.5 rounded-full">{item.points_cost} pts</span>
                </div>
                <p className="text-body-sm text-secondary">{item.description || 'No description'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Modals ──────────────────────────────────────────────── */

function AmbassadorDetails({ ambassadorId, onClose, onTeacherClick }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/admin/users/${ambassadorId}/ambassador-stats`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchStats();
  }, [ambassadorId]);

  if (loading) return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-tertiary border border-primary-90 rounded-lg p-lg text-center text-secondary">Loading details...</div>
    </div>
  );

  if (!data) return null;
  const { ambassador, points, commission, leads, tasks_completed, teachers, instructors_recruited } = data;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-tertiary border border-primary-90 rounded-lg w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-md border-b border-primary-90 flex justify-between items-center bg-surface">
          <div>
            <h2 className="text-headline-sm text-on-surface">{ambassador.name}</h2>
            <p className="text-body-sm text-secondary">{ambassador.email} &middot; {ambassador.country || 'No Country'}</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-on-surface font-bold text-xl px-2">&times;</button>
        </div>
        
        <div className="p-md overflow-y-auto space-y-md">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
            <div className="bg-surface p-4 rounded-md border border-primary-90">
              <p className="text-label-sm text-secondary mb-1">Points Balance</p>
              <p className="text-headline-md text-primary-60 font-bold">{points.balance}</p>
              <p className="text-xs text-secondary mt-1">Total Earned: {points.total_earned}</p>
            </div>
            <div className="bg-surface p-4 rounded-md border border-primary-90">
              <p className="text-label-sm text-secondary mb-1">Commission ($)</p>
              <p className="text-headline-md text-green-400 font-bold">${commission.balance.toFixed(2)}</p>
              <p className="text-xs text-secondary mt-1">Total Earned: ${commission.total_earned.toFixed(2)}</p>
            </div>
            <div className="bg-surface p-4 rounded-md border border-primary-90 col-span-2">
              <p className="text-label-sm text-secondary mb-1">Tasks Completed</p>
              <p className="text-headline-md text-on-surface font-bold">{tasks_completed}</p>
            </div>
          </div>

          <div className="bg-surface p-4 rounded-md border border-primary-90">
            <p className="text-label-sm text-secondary mb-2">Leads Pipeline</p>
            <div className="flex space-x-4">
              {Object.entries(leads).map(([status, count]) => (
                <div key={status} className="text-center px-4 py-2 bg-tertiary rounded-md min-w-[80px]">
                  <p className="text-headline-sm text-on-surface">{count}</p>
                  <p className="text-xs text-secondary uppercase">{status}</p>
                </div>
              ))}
              {Object.keys(leads).length === 0 && <p className="text-sm text-secondary">No leads submitted.</p>}
            </div>
          </div>

          <div>
            <h3 className="text-label-lg text-on-surface mb-3 border-b border-primary-90 pb-2">Recruited Teachers ({teachers.length})</h3>
            {teachers.length === 0 ? (
              <p className="text-secondary text-sm">No teachers recruited yet.</p>
            ) : (
              <div className="space-y-2">
                {teachers.map(t => (
                  <div key={t.id} className="bg-surface border border-primary-90 rounded-md p-3 flex items-center justify-between hover:bg-tertiary transition-colors cursor-pointer" onClick={() => onTeacherClick(t.id)}>
                    <div>
                      <p className="text-label-md text-on-surface font-semibold">{t.name}</p>
                      <p className="text-xs text-secondary">{t.email} &middot; {new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{t.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherDetails({ teacherId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/admin/users/${teacherId}/teacher-stats`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchStats();
  }, [teacherId]);

  if (loading) return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-tertiary border border-primary-90 rounded-lg p-lg text-center text-secondary">Loading teacher details...</div>
    </div>
  );

  if (!data) return null;
  const { teacher, ambassador, sessions_stats, sessions } = data;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-tertiary border border-primary-90 rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-md border-b border-primary-90 flex justify-between items-center bg-surface">
          <div>
            <h2 className="text-headline-sm text-on-surface">{teacher.name} <span className="text-label-sm font-normal text-secondary bg-tertiary px-2 py-1 rounded-full ml-2">Teacher</span></h2>
            <p className="text-body-sm text-secondary">{teacher.email}</p>
            {ambassador && <p className="text-xs text-primary-60 mt-1">Invited by: {ambassador.name}</p>}
          </div>
          <button onClick={onClose} className="text-secondary hover:text-on-surface font-bold text-xl px-2">&times;</button>
        </div>
        
        <div className="p-md overflow-y-auto space-y-md">
          <div className="grid grid-cols-4 gap-sm">
            <div className="bg-surface p-3 rounded-md border border-primary-90 text-center">
              <p className="text-headline-sm text-on-surface font-bold">{sessions_stats.total}</p>
              <p className="text-xs text-secondary">Total Sessions</p>
            </div>
            <div className="bg-surface p-3 rounded-md border border-yellow-500/30 text-center">
              <p className="text-headline-sm text-yellow-400 font-bold">{sessions_stats.pending}</p>
              <p className="text-xs text-secondary">Pending</p>
            </div>
            <div className="bg-surface p-3 rounded-md border border-blue-500/30 text-center">
              <p className="text-headline-sm text-blue-400 font-bold">{sessions_stats.approved}</p>
              <p className="text-xs text-secondary">Approved</p>
            </div>
            <div className="bg-surface p-3 rounded-md border border-green-500/30 text-center">
              <p className="text-headline-sm text-green-400 font-bold">{sessions_stats.done}</p>
              <p className="text-xs text-secondary">Done</p>
            </div>
          </div>

          <div>
            <h3 className="text-label-lg text-on-surface mb-3 border-b border-primary-90 pb-2">Session History</h3>
            {sessions.length === 0 ? (
              <p className="text-secondary text-sm">No sessions submitted yet.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map(s => (
                  <div key={s.id} className="bg-surface border border-primary-90 rounded-md p-3 flex items-center justify-between">
                    <div>
                      <p className="text-label-md text-on-surface font-semibold">{s.title}</p>
                      <p className="text-xs text-secondary">{new Date(s.date).toLocaleString()} &middot; {s.material_sent ? 'Material Sent' : 'No Material'}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'done' ? 'bg-green-500/20 text-green-400' : s.status === 'approved' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{s.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Admin Leaderboard ────────────────────────────────────── */

function AdminLeaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/admin/leaderboard`)
      .then(r => setRows(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const medals = ['(Rank 1)', '(Rank 2)', '(Rank 3)'];

  return (
    <div>
      <h2 className="text-headline-lg mb-6">Global Leaderboard</h2>
      {loading ? <p className="text-secondary">Loading...</p> : rows.length === 0 ? (
        <p className="text-secondary text-center py-xl">No active ambassadors yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary-90 text-secondary text-left">
                <th className="pb-3 pr-4 font-semibold">Rank</th>
                <th className="pb-3 pr-4 font-semibold">Ambassador</th>
                <th className="pb-3 pr-4 font-semibold">Country</th>
                <th className="pb-3 pr-4 font-semibold text-center">Teachers</th>
                <th className="pb-3 pr-4 font-semibold text-center">Sessions Done</th>
                <th className="pb-3 pr-4 font-semibold text-center">Students</th>
                <th className="pb-3 pr-4 font-semibold text-center">Leads Converted</th>
                <th className="pb-3 font-semibold text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={`border-b border-primary-90/30 last:border-0 ${i < 3 ? 'bg-primary-90/30' : ''}`}>
                  <td className="py-3 pr-4 font-bold text-primary-60">{i < 3 ? medals[i] : `#${i + 1}`}</td>
                  <td className="py-3 pr-4 font-semibold text-on-surface">{r.name}</td>
                  <td className="py-3 pr-4 text-secondary">{r.country}</td>
                  <td className="py-3 pr-4 text-center text-on-surface">{r.teachers}</td>
                  <td className="py-3 pr-4 text-center text-green-400 font-semibold">{r.sessions_done}</td>
                  <td className="py-3 pr-4 text-center text-on-surface font-semibold">{r.students_reached}</td>
                  <td className="py-3 pr-4 text-center text-blue-400 font-semibold">{r.converted_leads}</td>
                  <td className="py-3 text-right font-bold text-primary-60">{r.points.toLocaleString()} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Admin Commission Log ─────────────────────────────────── */

function AdminCommissionLog() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/admin/commission-log`)
      .then(r => setTxns(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-headline-lg mb-6">Commission Log</h2>
      {loading ? <p className="text-secondary">Loading...</p> : txns.length === 0 ? (
        <p className="text-secondary text-center py-xl">No commission transactions yet.</p>
      ) : (
        <div className="space-y-2">
          {txns.map((tx) => (
            <div key={tx.id} className="bg-surface border border-primary-90 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.type === 'earn' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {tx.type === 'earn' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </div>
                <div>
                  <p className="text-label-md text-on-surface font-semibold">{tx.ambassador_name}</p>
                  <p className="text-xs text-secondary">
                    {tx.type === 'earn'
                      ? tx.lead_name ? `Commission: ${tx.lead_name} @ ${tx.lead_company}` : 'Commission Earned'
                      : 'Commission Withdrawal'}
                    &nbsp;&middot;&nbsp;{new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className={`font-bold text-label-lg ${tx.type === 'earn' ? 'text-green-400' : 'text-red-400'}`}>
                {tx.type === 'earn' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Admin Points Log ────────────────────────────────────── */

function AdminPointsLog() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/admin/points-log`)
      .then(r => setTxns(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-headline-lg mb-6">Points Transaction Log</h2>
      {loading ? <p className="text-secondary">Loading...</p> : txns.length === 0 ? (
        <p className="text-secondary text-center py-xl">No point transactions yet.</p>
      ) : (
        <div className="space-y-2">
          {txns.map((tx) => (
            <div key={tx.id} className="bg-surface border border-primary-90 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.type === 'earn' ? 'bg-primary-90 text-primary-60' : 'bg-red-500/20 text-red-400'}`}>
                  {tx.type === 'earn' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </div>
                <div>
                  <p className="text-label-md text-on-surface font-semibold">{tx.ambassador_name}</p>
                  <p className="text-xs text-secondary">
                    {tx.reason} &nbsp;&middot;&nbsp;{new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className={`font-bold text-label-lg ${tx.type === 'earn' ? 'text-primary-60' : 'text-red-400'}`}>
                {tx.type === 'earn' ? '+' : '-'}{tx.amount} pts
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}