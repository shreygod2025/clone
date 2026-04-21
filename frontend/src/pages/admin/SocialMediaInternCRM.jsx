import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Users, Phone, Search, Download, MessageSquare, Instagram, Youtube,
  CheckCircle, XCircle, Clock, TrendingUp, RefreshCw, Trash2, Pencil,
  Filter, IndianRupee, AlertCircle,
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CRM_STATUSES = [
  { value: 'all',              label: 'All',              dot: '#64748B' },
  { value: 'phone_captured',   label: 'Phone Captured',   dot: '#F59E0B' },
  { value: 'lead',             label: 'Lead',             dot: '#3B82F6' },
  { value: 'seat_reserved',    label: 'Seat Reserved',    dot: '#8B5CF6' },
  { value: 'converted',        label: 'Converted',        dot: '#16A34A' },
  { value: 'lost',             label: 'Lost',             dot: '#EF4444' },
];

const statusDot = (v) => (CRM_STATUSES.find(s => s.value === v) || CRM_STATUSES[0]).dot;
const statusLabel = (v) => (CRM_STATUSES.find(s => s.value === v) || CRM_STATUSES[0]).label;

export default function SocialMediaInternCRM({ getAuthHeaders }) {
  const [leads, setLeads] = useState([]);
  const [kpis, setKpis] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [commentModal, setCommentModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [lostReason, setLostReason] = useState('');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (filter !== 'all') params.crm_status = filter;
      const res = await axios.get(`${API}/social-media-intern/crm`, {
        headers: getAuthHeaders(), params,
      });
      setLeads(res.data.leads || []);
      setKpis(res.data.kpis || {});
    } catch (e) {
      toast.error('Failed to fetch Social Media Intern leads');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, search, filter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStatus = async (leadId, crm_status, reason) => {
    try {
      await axios.patch(`${API}/social-media-intern/${leadId}/crm-status`,
        { crm_status, lost_reason: reason },
        { headers: getAuthHeaders() });
      toast.success('Status updated');
      setStatusModal(null);
      setLostReason('');
      fetchLeads();
    } catch { toast.error('Failed to update status'); }
  };

  const addComment = async (leadId) => {
    if (!newComment.trim()) return;
    try {
      await axios.post(`${API}/social-media-intern/${leadId}/comment`,
        { text: newComment.trim(), author: 'Admin', comment_type: 'comment' },
        { headers: getAuthHeaders() });
      toast.success('Comment added');
      setNewComment('');
      setCommentModal(null);
      fetchLeads();
    } catch { toast.error('Failed to add comment'); }
  };

  const deleteLead = async (leadId) => {
    try {
      await axios.delete(`${API}/social-media-intern/${leadId}`,
        { headers: getAuthHeaders() });
      toast.success('Lead deleted');
      setDeleteModal(null);
      fetchLeads();
    } catch { toast.error('Failed to delete lead'); }
  };

  const exportCSV = () => {
    const headers = ['Ref', 'Student', 'Phone', 'School', 'Age', 'Mode', 'Status', 'Amount Paid', 'Instagram', 'YouTube', 'Created'];
    const rows = leads.map(l => [
      l.booking_ref || '',
      l.student_name || '',
      l.phone || '',
      l.school_name || '',
      l.age || '',
      l.mode || '',
      l.crm_status || '',
      l.amount_paid || 0,
      l.instagram_link || '',
      l.youtube_link || '',
      l.created_at ? new Date(l.created_at).toLocaleString() : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `social-media-intern-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const KPI_CARDS = [
    { label: 'Total', value: kpis.total || 0, color: 'bg-slate-50 border-slate-200 text-slate-700', filterVal: 'all' },
    { label: 'Phone Captured', value: kpis.phone_captured || 0, color: 'bg-amber-50 border-amber-200 text-amber-700', filterVal: 'phone_captured' },
    { label: 'Lead', value: kpis.lead || 0, color: 'bg-blue-50 border-blue-200 text-blue-700', filterVal: 'lead' },
    { label: 'Seat Reserved', value: kpis.seat_reserved || 0, color: 'bg-violet-50 border-violet-200 text-violet-700', filterVal: 'seat_reserved' },
    { label: 'Converted', value: kpis.converted || 0, color: 'bg-green-50 border-green-200 text-green-700', filterVal: 'converted' },
    { label: 'Lost', value: kpis.lost || 0, color: 'bg-red-50 border-red-200 text-red-700', filterVal: 'lost' },
    { label: 'Revenue', value: `₹${Number(kpis.revenue || 0).toLocaleString('en-IN')}`, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', filterVal: null },
  ];

  return (
    <div className="p-4 md:p-6" data-testid="smi-crm-container">
      {/* KPI Cards */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {KPI_CARDS.map(k => (
          <button
            key={k.label}
            onClick={() => k.filterVal && setFilter(k.filterVal)}
            data-testid={`smi-kpi-${k.label.toLowerCase().replace(/\s/g, '-')}`}
            className={`${k.color} border rounded-lg px-4 py-3 min-w-[130px] text-left transition-all ${filter === k.filterVal ? 'ring-2 ring-offset-1 ring-current' : ''}`}
          >
            <div className="text-2xl font-bold">{k.value}</div>
            <div className="text-xs font-medium uppercase tracking-wide">{k.label}</div>
          </button>
        ))}
      </div>

      {/* Search + filters + actions */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, school, ref..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="smi-search-input"
            className="pl-9 pr-3 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} data-testid="smi-filter-select"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          {CRM_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={fetchLeads} data-testid="smi-refresh-btn"
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
        <button onClick={exportCSV} data-testid="smi-export-csv"
          className="flex items-center gap-2 px-3 py-2 bg-lime-500 text-black rounded-lg text-sm font-semibold hover:bg-lime-400">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No leads found</p>
          <p className="text-sm mt-1">Try a different filter or check back once applications come in.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-600 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Age / Mode</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Socials</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map(l => (
                  <tr key={l.id} data-testid={`smi-row-${l.id}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{l.booking_ref || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{l.student_name || <span className="italic text-slate-400">—</span>}</div>
                      {l.parent_name && <div className="text-xs text-slate-500">{l.parent_name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`tel:+91${l.phone}`} className="text-blue-600 hover:underline text-xs font-mono">+91 {l.phone}</a>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{l.school_name || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      <div>{l.age ? `${l.age}y` : '—'}</div>
                      <div className="text-slate-500 capitalize">{l.mode || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setStatusModal(l)} data-testid={`smi-status-btn-${l.id}`}
                        className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded-full border border-slate-200 hover:border-slate-400">
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot(l.crm_status), display: 'inline-block' }} />
                        {statusLabel(l.crm_status)}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {l.amount_paid ? (
                        <div>
                          <div className="font-semibold text-green-700">₹{Number(l.amount_paid).toLocaleString('en-IN')}</div>
                          {l.amount_due > 0 && <div className="text-amber-600">Due: ₹{Number(l.amount_due).toLocaleString('en-IN')}</div>}
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {l.instagram_link && <a href={l.instagram_link.startsWith('http') ? l.instagram_link : `https://instagram.com/${l.instagram_link.replace('@', '')}`} target="_blank" rel="noreferrer" title={l.instagram_link}><Instagram className="w-4 h-4 text-pink-600" /></a>}
                        {l.youtube_link && <a href={l.youtube_link.startsWith('http') ? l.youtube_link : `https://youtube.com/${l.youtube_link}`} target="_blank" rel="noreferrer" title={l.youtube_link}><Youtube className="w-4 h-4 text-red-600" /></a>}
                        {!l.instagram_link && !l.youtube_link && <span className="text-slate-400 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setSelected(l)} data-testid={`smi-view-btn-${l.id}`}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="View">
                          <Users className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setCommentModal(l); setNewComment(''); }} data-testid={`smi-comment-btn-${l.id}`}
                          className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Comment">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteModal(l)} data-testid={`smi-delete-btn-${l.id}`}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {leads.map(l => (
              <div key={l.id} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-mono text-xs text-slate-500">{l.booking_ref}</div>
                    <div className="font-semibold text-slate-900">{l.student_name || '—'}</div>
                  </div>
                  <button onClick={() => setStatusModal(l)}
                    className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded-full border border-slate-200">
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot(l.crm_status), display: 'inline-block' }} />
                    {statusLabel(l.crm_status)}
                  </button>
                </div>
                <div className="text-xs text-slate-600 space-y-1 mb-3">
                  <div><a href={`tel:+91${l.phone}`} className="text-blue-600 font-mono">+91 {l.phone}</a></div>
                  {l.school_name && <div>{l.school_name}</div>}
                  <div>{l.age ? `${l.age}y` : '—'} · <span className="capitalize">{l.mode || '—'}</span></div>
                  {l.amount_paid > 0 && <div className="font-semibold text-green-700">₹{Number(l.amount_paid).toLocaleString('en-IN')} paid</div>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(l)} className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-200">View</button>
                  <button onClick={() => { setCommentModal(l); setNewComment(''); }} className="flex-1 text-xs px-2 py-1.5 rounded border border-slate-200">Comment</button>
                  <button onClick={() => setDeleteModal(l)} className="flex-1 text-xs px-2 py-1.5 rounded border border-red-200 text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* View Lead Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between items-start">
              <div>
                <div className="text-xs font-mono text-slate-500 mb-1">{selected.booking_ref}</div>
                <h3 className="text-lg font-bold">{selected.student_name}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {[
                ['Phone', selected.phone ? `+91 ${selected.phone}` : '—'],
                ['Parent', selected.parent_name],
                ['Email', selected.email],
                ['School', selected.school_name],
                ['Age', selected.age],
                ['Grade', selected.grade],
                ['Mode', selected.mode],
                ['On Social Media?', selected.has_social_media],
                ['Instagram', selected.instagram_link],
                ['YouTube', selected.youtube_link],
                ['Payment Mode', selected.payment_mode],
                ['Amount Paid', selected.amount_paid ? `₹${Number(selected.amount_paid).toLocaleString('en-IN')}` : '—'],
                ['Amount Due', selected.amount_due ? `₹${Number(selected.amount_due).toLocaleString('en-IN')}` : '—'],
                ['Status', statusLabel(selected.crm_status)],
                ['Lost Reason', selected.lost_reason],
                ['Created', selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'],
              ].filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-1 border-b border-slate-100">
                  <span className="text-slate-500 text-xs uppercase tracking-wide">{k}</span>
                  <span className="text-slate-900 font-medium text-right">{String(v)}</span>
                </div>
              ))}
              {selected.comments && selected.comments.length > 0 && (
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-2">Comments</div>
                  <div className="space-y-2">
                    {selected.comments.map(c => (
                      <div key={c.id} className="bg-slate-50 border border-slate-100 rounded p-2">
                        <div className="text-xs text-slate-500">{c.author} · {new Date(c.created_at).toLocaleString()}</div>
                        <div className="text-slate-800">{c.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setStatusModal(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-xl max-w-md w-full">
            <div className="p-5 border-b">
              <h3 className="text-lg font-bold">Update Status</h3>
              <p className="text-sm text-slate-500 mt-1">{statusModal.student_name} · {statusModal.booking_ref}</p>
            </div>
            <div className="p-5 space-y-2">
              {CRM_STATUSES.filter(s => s.value !== 'all').map(s => (
                <button
                  key={s.value}
                  onClick={() => {
                    if (s.value === 'lost') {
                      // wait for reason
                    } else {
                      updateStatus(statusModal.id, s.value);
                    }
                  }}
                  data-testid={`smi-status-option-${s.value}`}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${statusModal.crm_status === s.value ? 'border-lime-500 bg-lime-50' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
                  <span className="font-medium text-slate-800">{s.label}</span>
                </button>
              ))}
              {/* Lost reason */}
              <div className="pt-3 border-t mt-3">
                <label className="text-xs text-slate-500 uppercase tracking-wide">Lost Reason (if marking Lost)</label>
                <select value={lostReason} onChange={e => setLostReason(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select reason</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="price_too_high">Price Too High</option>
                  <option value="location_too_far">Location Too Far</option>
                  <option value="not_picking">Phone Not Picking</option>
                  <option value="other">Other</option>
                </select>
                <button disabled={!lostReason} onClick={() => updateStatus(statusModal.id, 'lost', lostReason)}
                  className="w-full mt-2 bg-red-500 text-white text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
                  Mark as Lost
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {commentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCommentModal(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-xl max-w-md w-full">
            <div className="p-5 border-b">
              <h3 className="text-lg font-bold">Add Comment</h3>
              <p className="text-sm text-slate-500 mt-1">{commentModal.student_name} · {commentModal.booking_ref}</p>
            </div>
            <div className="p-5">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                data-testid="smi-comment-input"
                rows={4}
                placeholder="Add a follow-up note..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => setCommentModal(null)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
                <button onClick={() => addComment(commentModal.id)} disabled={!newComment.trim()}
                  data-testid="smi-comment-save"
                  className="flex-1 px-3 py-2 rounded-lg bg-lime-500 text-black font-semibold text-sm disabled:opacity-50">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteModal(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-xl max-w-md w-full">
            <div className="p-5 border-b flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-bold">Delete Lead?</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600 mb-4">
                This will permanently delete <strong>{deleteModal.student_name || deleteModal.phone}</strong>'s registration ({deleteModal.booking_ref}). This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteModal(null)} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
                <button onClick={() => deleteLead(deleteModal.id)} data-testid="smi-delete-confirm"
                  className="flex-1 px-3 py-2 rounded-lg bg-red-500 text-white font-semibold text-sm">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
