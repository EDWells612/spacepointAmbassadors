import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, X } from 'lucide-react';

const API_URL = 'http://localhost:8000/api';

const STATUS_STYLES = {
  submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'in review': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  converted: 'bg-green-500/20 text-green-400 border-green-500/30',
  closed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function Leads() {
  const { user, role } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ contact_name: '', company: '', type: 'B2B', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) fetchLeads();
  }, [user]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/leads`);
      setLeads(res.data);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/leads`, formData);
      setShowForm(false);
      setFormData({ contact_name: '', company: '', type: 'B2B', notes: '' });
      fetchLeads();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = role === 'ambassador';
  const [selectedLead, setSelectedLead] = useState(null);

  return (
    <div className="p-md md:p-lg lg:p-xl w-full">
      <div className="flex justify-between items-center mb-lg">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-2">Leads Pipeline</h1>
          <p className="text-body-lg text-secondary">
            {role === 'admin'
              ? 'Review and manage all ambassador leads.'
              : 'Submit and track your B2B and B2C leads.'}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center bg-primary hover:bg-primary-60 text-on-surface px-6 py-3 rounded-full font-semibold transition-colors shadow-lg shadow-primary/20"
          >
            {showForm ? <><X size={18} className="mr-2" /> Cancel</> : <><Plus size={18} className="mr-2" /> New Lead</>}
          </button>
        )}
      </div>

      {/* Create Lead Form */}
      {showForm && (
        <div className="bg-tertiary p-md rounded-lg border border-primary-90 mb-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-headline-sm mb-4">Submit New Lead</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-label-md text-secondary mb-1">Contact Name</label>
              <input
                required type="text"
                className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="e.g. John Smith"
              />
            </div>
            <div>
              <label className="block text-label-md text-secondary mb-1">Company</label>
              <input
                required type="text"
                className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface focus:outline-none focus:border-primary transition-colors"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div>
              <label className="block text-label-md text-secondary mb-1">Type</label>
              <select
                className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="B2B">B2B</option>
                <option value="B2C">B2C</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-label-md text-secondary mb-1">Notes</label>
              <textarea
                className="w-full bg-surface border border-primary-90 rounded-md p-3 text-on-surface resize-none"
                rows="2"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional details..."
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary px-8 py-3 rounded-full text-label-md font-bold hover:bg-primary-60 transition-colors disabled:opacity-50 shadow-md"
              >
                {submitting ? 'Submitting...' : 'Submit Lead'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-tertiary rounded-lg border border-primary-90 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface border-b border-primary-90">
              <tr>
                <th className="p-4 text-label-md text-secondary">Contact</th>
                <th className="p-4 text-label-md text-secondary">Company</th>
                <th className="p-4 text-label-md text-secondary">Type</th>
                <th className="p-4 text-label-md text-secondary">Status</th>
                <th className="p-4 text-label-md text-secondary">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-4 text-center text-secondary">Loading...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-secondary">No leads submitted yet. Click "New Lead" to get started!</td></tr>
              ) : (
                leads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    className="border-b border-primary-90/50 hover:bg-surface transition-colors cursor-pointer"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="p-4 text-body-md font-bold text-on-surface">{lead.contact_name}</td>
                    <td className="p-4 text-body-md text-secondary">{lead.company}</td>
                    <td className="p-4">
                      <span className="bg-primary-90 text-label-sm px-3 py-1 rounded-full text-on-surface font-bold">{lead.type}</span>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase ${STATUS_STYLES[lead.status] || 'bg-surface border-secondary text-secondary'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4 text-body-sm text-secondary">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-tertiary border border-primary-90 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-lg border-b border-primary-90 bg-surface/50">
              <h2 className="text-headline-sm text-on-surface">Lead Details</h2>
              <button onClick={() => setSelectedLead(null)} className="text-secondary hover:text-on-surface p-1">
                <X size={24} />
              </button>
            </div>
            <div className="p-lg space-y-md">
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <p className="text-label-sm text-secondary uppercase tracking-wider mb-1">Contact Name</p>
                  <p className="text-body-lg font-bold text-on-surface">{selectedLead.contact_name}</p>
                </div>
                <div>
                  <p className="text-label-sm text-secondary uppercase tracking-wider mb-1">Company</p>
                  <p className="text-body-lg font-bold text-on-surface">{selectedLead.company}</p>
                </div>
                <div>
                  <p className="text-label-sm text-secondary uppercase tracking-wider mb-1">Type</p>
                  <span className="bg-primary-90 text-label-sm px-3 py-1 rounded-full text-on-surface font-bold inline-block mt-1">{selectedLead.type}</span>
                </div>
                <div>
                  <p className="text-label-sm text-secondary uppercase tracking-wider mb-1">Status</p>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase inline-block mt-1 ${STATUS_STYLES[selectedLead.status] || ''}`}>
                    {selectedLead.status}
                  </span>
                </div>
              </div>
              <div className="pt-md border-t border-primary-90/50">
                <p className="text-label-sm text-secondary uppercase tracking-wider mb-2">Notes</p>
                <div className="bg-surface rounded-md p-4 text-body-md text-on-surface min-h-[100px] border border-primary-90/30">
                  {selectedLead.notes || 'No notes provided.'}
                </div>
              </div>
              <p className="text-label-sm text-secondary text-right">
                Submitted on {new Date(selectedLead.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
