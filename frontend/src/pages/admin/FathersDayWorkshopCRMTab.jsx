import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Search, Download, RefreshCw, Phone, Mail, MapPin, Users, IndianRupee,
  CheckCircle2, Clock, Filter, Eye, Trash2, X, Save, Loader2, CreditCard,
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WORKSHOP_KEY = 'fathers-day-robotics';

const STATUS_TABS = [
  { v: 'all',  l: 'All',             c: 'bg-slate-500' },
  { v: 'lead', l: 'Leads',           c: 'bg-amber-500' },
  { v: 'paid', l: 'Paid Enrollments', c: 'bg-emerald-500' },
];

const AGE_GROUP_FILTERS = [
  { v: '',     l: 'All ages' },
  { v: '4-8',  l: 'Ages 4 – 8' },
  { v: '9-12', l: 'Ages 9 – 12' },
];

const CENTER_FILTERS = [
  { v: '',           l: 'All centers' },
  { v: 'kandivali',  l: 'Kandivali' },
  { v: 'mira_road',  l: 'Mira Road' },
];

const FathersDayWorkshopCRMTab = ({ getAuthHeaders }) => {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ total: 0, leads: 0, paid: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [ageGroup, setAgeGroup] = useState('');
  const [center, setCenter] = useState('');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ workshop_key: WORKSHOP_KEY });
      if (tab !== 'all') params.set('status', tab);
      if (ageGroup)      params.set('age_group', ageGroup);
      if (center)        params.set('center', center);
      if (search.trim()) params.set('search', search.trim());
      const res = await axios.get(`${API}/workshops/admin/bookings?${params}`, { headers: getAuthHeaders() });
      setBookings(res.data.bookings || []);
      setStats(res.data.stats || { total: 0, leads: 0, paid: 0, revenue: 0 });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load workshop bookings');
    } finally {
      setLoading(false);
    }
  }, [tab, ageGroup, center, search, getAuthHeaders]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ workshop_key: WORKSHOP_KEY });
      if (tab !== 'all') params.set('status', tab);
      const res = await axios.get(`${API}/workshops/admin/bookings.csv?${params}`, {
        headers: getAuthHeaders(), responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fathers-day-workshop-${tab}-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (e) {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const saveEdit = async () => {
    try {
      await axios.patch(`${API}/workshops/admin/bookings/${editForm.id}`,
        {
          parent_name:    editForm.parent_name || '',
          child_name:     editForm.child_name  || '',
          parent_email:   editForm.parent_email || '',
          crm_status:     editForm.crm_status,
          payment_status: editForm.payment_status,
          notes:          editForm.notes || '',
        },
        { headers: getAuthHeaders() });
      toast.success('Booking updated');
      setEditForm(null);
      fetchBookings();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update');
    }
  };

  const deleteBooking = async (id) => {
    if (!window.confirm('Delete this booking permanently?')) return;
    try {
      await axios.delete(`${API}/workshops/admin/bookings/${id}`, { headers: getAuthHeaders() });
      toast.success('Booking deleted');
      fetchBookings();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div data-testid="fd-workshop-crm-tab">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard icon={Users}        label="Total"           value={stats.total}           color="bg-slate-500" />
        <StatCard icon={Clock}        label="Leads"           value={stats.leads}           color="bg-amber-500" />
        <StatCard icon={CheckCircle2} label="Paid Enrollments" value={stats.paid}           color="bg-emerald-500" />
        <StatCard icon={IndianRupee}  label="Revenue (₹)"     value={stats.revenue.toLocaleString('en-IN')} color="bg-blue-600" />
      </div>

      {/* Top control bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1" data-testid="fd-status-tabs">
          {STATUS_TABS.map(t => (
            <button key={t.v} onClick={() => setTab(t.v)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === t.v ? `${t.c} text-white` : 'text-slate-600 hover:bg-white'}`}
              data-testid={`fd-status-tab-${t.v}`}>
              {t.l}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search phone, name, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
            data-testid="fd-crm-search"
          />
        </div>

        <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)}
          className="h-9 text-sm border border-slate-200 rounded-lg px-2 bg-white"
          data-testid="fd-age-filter">
          {AGE_GROUP_FILTERS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>

        <select value={center} onChange={e => setCenter(e.target.value)}
          className="h-9 text-sm border border-slate-200 rounded-lg px-2 bg-white"
          data-testid="fd-center-filter">
          {CENTER_FILTERS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>

        <Button variant="outline" size="sm" onClick={fetchBookings} data-testid="fd-refresh-btn">
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={exportCSV} disabled={exporting} className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="fd-export-csv">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
          Export CSV
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
          <Filter className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No bookings match these filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg" data-testid="fd-crm-table">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th>Status</Th>
                <Th>Phone</Th>
                <Th>Parent / Child</Th>
                <Th>Age group</Th>
                <Th>Center</Th>
                <Th>Extras</Th>
                <Th className="text-right">Amount</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map(b => {
                const isPaid = b.payment_status === 'paid';
                return (
                  <tr key={b.id} className="hover:bg-slate-50" data-testid={`fd-row-${b.id}`}>
                    <Td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                        data-testid={`fd-status-${b.id}`}>
                        {isPaid ? <><CheckCircle2 className="w-3 h-3" /> Paid</> : <><Clock className="w-3 h-3" /> Lead</>}
                      </span>
                    </Td>
                    <Td>
                      <a href={`tel:${b.parent_phone}`} className="text-blue-700 hover:underline font-semibold inline-flex items-center gap-1.5">
                        <Phone className="w-3 h-3" /> {b.parent_phone}
                      </a>
                    </Td>
                    <Td>
                      <div className="font-medium text-slate-800">{b.parent_name || <span className="text-slate-400 italic">— No name</span>}</div>
                      {b.child_name && <div className="text-[11px] text-slate-500">Child: {b.child_name}</div>}
                      {b.parent_email && <div className="text-[11px] text-slate-500 inline-flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> {b.parent_email}</div>}
                    </Td>
                    <Td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {b.age_group_label || b.age_group}
                      </span>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-slate-700">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {b.center_label || b.center}
                      </span>
                    </Td>
                    <Td>{b.additional_children || 0}</Td>
                    <Td className="text-right font-bold text-slate-900">₹{Number(b.amount || 0).toLocaleString('en-IN')}</Td>
                    <Td className="text-xs text-slate-500">{(b.created_at || '').slice(0,10)}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewing(b)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          data-testid={`fd-view-${b.id}`} aria-label="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditForm({ ...b, notes: b.notes || '' })} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                          data-testid={`fd-edit-${b.id}`} aria-label="Edit">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteBooking(b.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          data-testid={`fd-delete-${b.id}`} aria-label="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View Modal */}
      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) setViewing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Booking details</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              <KV k="Status"    v={viewing.payment_status === 'paid' ? 'Paid Enrollment' : 'Lead'} />
              <KV k="Phone"     v={viewing.parent_phone} />
              <KV k="Parent"    v={viewing.parent_name || '—'} />
              <KV k="Child"     v={viewing.child_name  || '—'} />
              <KV k="Email"     v={viewing.parent_email || '—'} />
              <KV k="Age group" v={viewing.age_group_label || viewing.age_group} />
              <KV k="Center"    v={viewing.center_label    || viewing.center} />
              <KV k="Extra kids" v={viewing.additional_children || 0} />
              <KV k="Amount"    v={`₹${Number(viewing.amount || 0).toLocaleString('en-IN')}`} />
              <KV k="CRM status" v={viewing.crm_status || '—'} />
              <KV k="Order ID"   v={viewing.order_id || '—'} />
              <KV k="Paid at"    v={(viewing.paid_at || '').slice(0,19).replace('T',' ') || '—'} />
              <KV k="Created"    v={(viewing.created_at || '').slice(0,19).replace('T',' ')} />
              <KV k="Source"     v={viewing.source_ref || '—'} />
              {viewing.notes && (<div className="border-t pt-2 mt-2"><div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Notes</div><div className="whitespace-pre-wrap text-slate-700">{viewing.notes}</div></div>)}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editForm} onOpenChange={(o) => { if (!o) setEditForm(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit booking</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Parent name</label>
                <Input value={editForm.parent_name || ''} onChange={e => setEditForm({ ...editForm, parent_name: e.target.value })} className="h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Child name</label>
                <Input value={editForm.child_name || ''} onChange={e => setEditForm({ ...editForm, child_name: e.target.value })} className="h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Email</label>
                <Input value={editForm.parent_email || ''} onChange={e => setEditForm({ ...editForm, parent_email: e.target.value })} className="h-9" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Payment</label>
                  <select value={editForm.payment_status} onChange={e => setEditForm({ ...editForm, payment_status: e.target.value })}
                    className="h-9 text-sm border border-slate-200 rounded-lg px-2 w-full bg-white">
                    <option value="pending">pending</option>
                    <option value="paid">paid</option>
                    <option value="failed">failed</option>
                    <option value="refunded">refunded</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">CRM status</label>
                  <select value={editForm.crm_status} onChange={e => setEditForm({ ...editForm, crm_status: e.target.value })}
                    className="h-9 text-sm border border-slate-200 rounded-lg px-2 w-full bg-white">
                    <option value="lead">lead</option>
                    <option value="contacted">contacted</option>
                    <option value="converted">converted</option>
                    <option value="dropped">dropped</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Notes</label>
                <Textarea value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="min-h-[80px]" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setEditForm(null)}><X className="w-4 h-4 mr-1" />Cancel</Button>
                <Button size="sm" onClick={saveEdit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Save className="w-4 h-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-lg ${color} text-white flex items-center justify-center`}><Icon className="w-4 h-4" /></div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
        <div className="text-lg font-bold text-slate-800 leading-none mt-0.5">{value}</div>
      </div>
    </div>
  </div>
);

const Th = ({ children, className = '' }) => (
  <th className={`px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider ${className}`}>{children}</th>
);
const Td = ({ children, className = '' }) => <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
const KV = ({ k, v }) => (
  <div className="flex items-start gap-3">
    <div className="text-slate-400 text-xs uppercase tracking-widest w-24 flex-shrink-0">{k}</div>
    <div className="text-slate-800 font-medium break-all">{v}</div>
  </div>
);

export default FathersDayWorkshopCRMTab;
