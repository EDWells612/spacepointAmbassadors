import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Clock, Plus, X, Send, UserPlus } from 'lucide-react';

import { API_URL } from '../config';

export default function Tasks() {
  const { user, role } = useAuth();
  const [myTasks, setMyTasks] = useState([]);
  const [createdTasks, setCreatedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assigned');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    points_reward: 100,
    assigned_to: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showEditRequest, setShowEditRequest] = useState(null); // taskId
  const [editNotes, setEditNotes] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  const canCreateTasks = role === 'admin' || role === 'ambassador';

  useEffect(() => {
    if (user) {
      fetchTasks();
      if (canCreateTasks) fetchAssignableUsers();
    }
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const [assignedRes, createdRes] = await Promise.all([
        axios.get(`${API_URL}/tasks`, { params: { view: 'assigned' } }),
        canCreateTasks
          ? axios.get(`${API_URL}/tasks`, { params: { view: 'created' } })
          : Promise.resolve({ data: [] }),
      ]);
      setMyTasks(assignedRes.data);
      setCreatedTasks(createdRes.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignableUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/tasks/assignable-users`);
      setAssignableUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch assignable users:', err);
    }
  };

  const updateStatus = async (taskId, newStatus, notes = '') => {
    try {
      await axios.put(`${API_URL}/tasks/${taskId}/status`, { status: newStatus, edit_notes: notes });
      setShowEditRequest(null);
      setEditNotes('');
      fetchTasks();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.assigned_to) {
      alert('Please select a user to assign the task to.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/tasks`, {
        ...formData,
        points_reward: parseInt(formData.points_reward) || 0,
        deadline: formData.deadline || null,
      });
      setShowCreateForm(false);
      setFormData({ title: '', description: '', deadline: '', points_reward: 100, assigned_to: '' });
      fetchTasks();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const activeTasks = activeTab === 'assigned' ? myTasks : createdTasks;

  return (
    <div className="p-md md:p-lg lg:p-xl w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-lg">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-2">Tasks</h1>
          <p className="text-body-lg text-secondary">
            {role === 'admin'
              ? 'Manage and assign tasks to ambassadors.'
              : role === 'ambassador'
              ? 'Complete your tasks and assign tasks to your teachers.'
              : 'Complete tasks to earn points.'}
          </p>
        </div>
        {canCreateTasks && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 md:mt-0 flex items-center bg-primary hover:bg-primary-60 text-on-surface px-6 py-3 rounded-full font-bold transition-colors shadow-lg shadow-primary/20"
          >
            <Plus size={18} className="mr-2" />
            Assign Task
          </button>
        )}
      </div>

      {/* Tabs */}
      {canCreateTasks && (
        <div className="flex space-x-2 mb-md border-b border-primary-90 pb-2">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-5 py-2 rounded-full text-label-md font-bold transition-colors ${
              activeTab === 'assigned'
                ? 'bg-primary-90 text-on-surface'
                : 'text-secondary hover:bg-surface'
            }`}
          >
            Assigned to Me ({myTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('created')}
            className={`px-5 py-2 rounded-full text-label-md font-bold transition-colors ${
              activeTab === 'created'
                ? 'bg-primary-90 text-on-surface'
                : 'text-secondary hover:bg-surface'
            }`}
          >
            Tasks I Assigned ({createdTasks.length})
          </button>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-tertiary border border-primary-90 rounded-lg p-lg w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-md">
              <h2 className="text-headline-sm text-on-surface">Assign New Task</h2>
              <button onClick={() => setShowCreateForm(false)} className="text-secondary hover:text-on-surface">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-sm">
              <div>
                <label className="block text-label-md text-secondary mb-1">Assign To</label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  required
                  className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">Select a user...</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) — {u.role}
                    </option>
                  ))}
                </select>
                {assignableUsers.length === 0 && (
                  <p className="text-label-sm text-secondary mt-1">
                    {role === 'ambassador'
                      ? 'No teachers found. Invite teachers first.'
                      : 'No active ambassadors found.'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-label-md text-secondary mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                  placeholder="e.g. Host a workshop at your university"
                />
              </div>
              <div>
                <label className="block text-label-md text-secondary mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors resize-none"
                  placeholder="Describe what needs to be done..."
                />
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <label className="block text-label-md text-secondary mb-1">Deadline</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-label-md text-secondary mb-1">Points Reward</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.points_reward}
                    onChange={(e) => setFormData({ ...formData, points_reward: e.target.value })}
                    className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-primary-60 text-on-surface font-bold py-4 rounded-full transition-colors mt-md disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                {submitting ? 'Assigning...' : 'Assign Task'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Request Edit Modal */}
      {showEditRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-tertiary border border-primary-90 rounded-lg p-lg w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-headline-sm text-on-surface mb-md">Request Task Revision</h2>
            <p className="text-body-md text-secondary mb-4">Please provide feedback on what needs to be edited.</p>
            <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={4}
                className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors resize-none mb-md"
                placeholder="e.g. Please upload a higher quality photo of the attendance sheet."
            />
            <div className="flex space-x-3">
                <button 
                    onClick={() => { setShowEditRequest(null); setEditNotes(''); }}
                    className="flex-1 bg-surface border border-primary-90 text-secondary py-3 rounded-full font-bold hover:text-on-surface transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => updateStatus(showEditRequest, 'edit_requested', editNotes)}
                    disabled={!editNotes.trim()}
                    className="flex-1 bg-primary text-on-surface py-3 rounded-full font-bold hover:bg-primary-60 transition-colors disabled:opacity-50"
                >
                    Send Request
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Cards */}
      {loading ? (
        <div className="text-secondary p-lg text-center">Loading tasks...</div>
      ) : activeTasks.length === 0 ? (
        <div className="bg-tertiary p-lg rounded-lg border border-primary-90 text-center shadow-sm">
          <p className="text-body-lg text-secondary">
            {activeTab === 'assigned'
              ? 'You have no tasks assigned at the moment.'
              : "You haven't assigned any tasks yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isCreator={activeTab === 'created'}
                userRole={role}
                onUpdateStatus={updateStatus}
                onRequestEdit={() => setShowEditRequest(task.id)}
                onClick={() => setSelectedTask(task)}
              />
            ))}
          </div>
          {/* Task Details Modal */}
          {selectedTask && (
            <TaskDetailsModal 
              task={selectedTask} 
              onClose={() => setSelectedTask(null)} 
              isCreator={createdTasks.some(t => t.id === selectedTask.id)}
              onUpdateStatus={updateStatus}
              onRequestEdit={() => { setShowEditRequest(selectedTask.id); setSelectedTask(null); }}
            />
          )}
        </>
      )}
    </div>
  );
}

function TaskDetailsModal({ task, onClose, isCreator, onUpdateStatus, onRequestEdit }) {
  const statusStyles = {
    pending: 'bg-surface border-secondary text-secondary',
    accepted: 'bg-primary-90 border-primary text-on-surface',
    submitted: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    approved: 'bg-green-900 border-green-700 text-green-200',
    rejected: 'bg-red-500/20 border-red-500/30 text-red-400',
    edit_requested: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
      <div className="bg-tertiary border border-primary-90 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-lg border-b border-primary-90 flex justify-between items-center bg-surface">
          <div>
            <div className="flex items-center space-x-3 mb-2">
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase ${statusStyles[task.status] || statusStyles.pending}`}>
                    {task.status.replace('_', ' ')}
                </span>
                <span className="font-bold text-primary-60 text-label-md">+{task.points_reward} pts</span>
            </div>
            <h2 className="text-headline-md text-on-surface">{task.title}</h2>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-on-surface p-2 bg-tertiary rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-lg space-y-lg">
          <div>
            <h4 className="text-label-sm text-secondary uppercase font-bold mb-2">Description</h4>
            <p className="text-body-lg text-on-surface whitespace-pre-wrap leading-relaxed">
                {task.description || 'No description provided for this task.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-lg pt-4 border-t border-primary-90/30">
            <div>
                <h4 className="text-label-sm text-secondary uppercase font-bold mb-1">Deadline</h4>
                <div className="flex items-center text-on-surface font-semibold">
                    <Clock size={16} className="mr-2 text-primary-60" />
                    {task.deadline ? new Date(task.deadline).toLocaleDateString(undefined, { dateStyle: 'full' }) : 'No deadline set'}
                </div>
            </div>
            <div>
                <h4 className="text-label-sm text-secondary uppercase font-bold mb-1">Status</h4>
                <div className="flex items-center text-on-surface font-semibold capitalize">
                    {task.status.replace('_', ' ')}
                </div>
            </div>
          </div>

          {task.edit_notes && (
            <div className="bg-primary-90/30 border-l-4 border-primary p-4 rounded-r-md">
                <h4 className="text-label-sm text-primary uppercase font-bold mb-2">Feedback / Revision Notes</h4>
                <p className="text-body-md text-on-surface italic leading-relaxed">"{task.edit_notes}"</p>
            </div>
          )}

          <div className="flex justify-end pt-lg border-t border-primary-90/30 space-x-3">
             {!isCreator ? (
                <>
                    {(task.status === 'pending' || task.status === 'edit_requested') && (
                        <button onClick={() => { onUpdateStatus(task.id, 'accepted'); onClose(); }} className="bg-primary hover:bg-primary-60 text-on-surface px-8 py-3 rounded-full font-bold transition-all shadow-lg shadow-primary/20">
                            {task.status === 'edit_requested' ? 'Update & Accept' : 'Accept Task'}
                        </button>
                    )}
                    {task.status === 'accepted' && (
                        <button onClick={() => { onUpdateStatus(task.id, 'submitted'); onClose(); }} className="bg-surface border border-primary text-on-surface hover:bg-primary-90 px-8 py-3 rounded-full font-bold transition-all shadow-lg">
                            Submit for Review
                        </button>
                    )}
                </>
             ) : (
                task.status === 'submitted' && (
                    <>
                        <button onClick={() => { onUpdateStatus(task.id, 'approved'); onClose(); }} className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-full font-bold transition-all">Approve</button>
                        <button onClick={() => onRequestEdit()} className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 px-8 py-3 rounded-full font-bold transition-all">Request Revision</button>
                        <button onClick={() => { onUpdateStatus(task.id, 'rejected'); onClose(); }} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 px-8 py-3 rounded-full font-bold transition-all">Reject</button>
                    </>
                )
             )}
             <button onClick={onClose} className="px-6 py-3 text-secondary font-bold hover:text-on-surface transition-colors">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, isCreator, userRole, onUpdateStatus, onRequestEdit, onClick }) {
  const statusStyles = {
    pending: 'bg-surface border-secondary text-secondary',
    accepted: 'bg-primary-90 border-primary text-on-surface',
    submitted: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    approved: 'bg-green-900 border-green-700 text-green-200',
    rejected: 'bg-red-500/20 border-red-500/30 text-red-400',
    edit_requested: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  };

  return (
    <div 
        onClick={onClick}
        className="bg-tertiary p-md rounded-lg border border-primary-90 flex flex-col relative overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 active:scale-95 group"
    >
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase ${statusStyles[task.status] || statusStyles.pending}`}>
          {task.status.replace('_', ' ')}
        </span>
        <span className="font-bold text-primary-60 text-label-md">+{task.points_reward} pts</span>
      </div>

      <h3 className="text-headline-sm text-on-surface mb-2">{task.title}</h3>
      <p className="text-body-sm text-secondary mb-4 flex-grow line-clamp-3">{task.description || 'No description'}</p>

      {task.edit_notes && (task.status === 'edit_requested' || !isCreator) && (
        <div className="bg-primary-90/30 border-l-4 border-primary p-3 rounded-r-md mb-4 animate-in fade-in duration-300">
            <p className="text-[10px] font-bold uppercase text-primary mb-1">Revision Requested</p>
            <p className="text-body-sm text-on-surface italic">"{task.edit_notes}"</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-primary-90/30">
        {task.deadline ? (
            <div className="flex items-center text-[10px] font-bold text-secondary uppercase">
                <Clock size={12} className="mr-1" />
                {new Date(task.deadline).toLocaleDateString()}
            </div>
        ) : <div />}
        
        <div className="flex items-center space-x-2">
            {/* Assignee actions */}
            {!isCreator && (
            <>
                {(task.status === 'pending' || task.status === 'edit_requested') && (
                <button
                    onClick={(e) => { e.stopPropagation(); onUpdateStatus(task.id, 'accepted'); }}
                    className="bg-primary hover:bg-primary-60 text-on-surface px-4 py-2 rounded-full text-xs font-bold transition-colors shadow-sm"
                >
                    {task.status === 'edit_requested' ? 'Update & Accept' : 'Accept Task'}
                </button>
                )}
                {task.status === 'accepted' && (
                <button
                    onClick={(e) => { e.stopPropagation(); onUpdateStatus(task.id, 'submitted'); }}
                    className="flex items-center bg-surface border border-primary text-on-surface hover:bg-primary-90 px-4 py-2 rounded-full text-xs font-bold transition-colors shadow-sm"
                >
                    <Send size={12} className="mr-1.5" /> Mark Submitted
                </button>
                )}
                {task.status === 'submitted' && (
                <span className="text-yellow-400 text-[10px] font-bold uppercase">In Review</span>
                )}
                {task.status === 'approved' && (
                <span className="text-green-400 text-[10px] font-bold uppercase flex items-center">
                    <CheckCircle size={12} className="mr-1" /> Points Awarded
                </span>
                )}
                {task.status === 'rejected' && (
                <span className="text-red-400 text-[10px] font-bold uppercase">Rejected</span>
                )}
            </>
            )}

            {/* Creator actions on submitted tasks */}
            {isCreator && task.status === 'submitted' && (
            <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                <button
                onClick={() => onUpdateStatus(task.id, 'approved')}
                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                >
                Approve
                </button>
                <button
                onClick={() => onRequestEdit()}
                className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                >
                Edit
                </button>
                <button
                onClick={() => onUpdateStatus(task.id, 'rejected')}
                className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
                >
                Reject
                </button>
            </div>
            )}

            {/* Creator view for non-submitted tasks */}
            {isCreator && task.status !== 'submitted' && (
            <div className="text-[10px] font-bold uppercase text-secondary">
                {task.status === 'pending' && 'Waiting for acceptance'}
                {task.status === 'accepted' && 'In progress'}
                {task.status === 'approved' && 'Completed'}
                {task.status === 'rejected' && 'Rejected'}
                {task.status === 'edit_requested' && 'Revision Pending'}
            </div>
            )}
        </div>
      </div>
    </div>
  );
}
