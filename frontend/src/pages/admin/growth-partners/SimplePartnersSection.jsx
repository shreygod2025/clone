/**
 * SimplePartnersSection — reusable panel for Referral & Influencer partners.
 * Both partner types share the same shape and endpoints (differ only by
 * a `type` discriminator), so one component powers both sections.
 *
 * Features
 * ────────
 * - Add / Edit / Delete partner (name, phone, email, city, social handle, notes)
 * - Multi-select schools to attach to a partner
 * - Per-partner rollup: schools count · total revenue · total students
 * - Expand a partner row to see each assigned school with quick contact info
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus, RefreshCw, Search, ChevronDown, ChevronRight, Building2, Trash2,
  Edit2, Phone, Mail, MapPin, IndianRupee, GraduationCap, Users, Link2, X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Button } from '../../../components/ui/button';
import CitySearch from '../../../components/CitySearch';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const initials = (n) => (n || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

// ────────────────────────────────────────────────────────────────────
// Edit / Add modal
// ────────────────────────────────────────────────────────────────────
const PartnerModal = ({ open, partner, type, onClose, onSaved }) => {
  const { getAuthHeaders } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', social_handle: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: partner?.name || '',
        phone: partner?.phone || '',
        email: partner?.email || '',
        city: partner?.city || '',
        social_handle: partner?.social_handle || '',
        notes: partner?.notes || '',
      });
    }
  }, [open, partner]);

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      if (partner?.id) {
        await axios.patch(`${API}/simple-partners/${partner.id}`, form, { headers: getAuthHeaders() });
        toast.success('Partner updated');
      } else {
        await axios.post(`${API}/simple-partners`, { ...form, type }, { headers: getAuthHeaders() });
        toast.success('Partner added');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{partner?.id ? 'Edit' : 'Add'} {type === 'referral' ? 'Referral' : 'Influencer'} Partner</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" data-testid="simple-partner-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">City</label>
              <div className="mt-1">
                <CitySearch
                  value={form.city}
                  onChange={(cityName) => setForm({ ...form, city: cityName })}
                  placeholder="Search city…"
                  data-testid="simple-partner-city-input"
                />
              </div>
            </div>
            {type === 'influencer' && (
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Social Handle</label>
                <Input value={form.social_handle} onChange={(e) => setForm({ ...form, social_handle: e.target.value })} className="mt-1" placeholder="@handle" />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Notes</label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#0A1F44] text-white" data-testid="simple-partner-save">
              {saving ? 'Saving…' : partner?.id ? 'Update' : 'Add Partner'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ────────────────────────────────────────────────────────────────────
// School assignment modal — multi-select from school_inquiries
// ────────────────────────────────────────────────────────────────────
const AssignSchoolsModal = ({ open, partner, allSchools, onClose, onSaved }) => {
  const { getAuthHeaders } = useAuth();
  const [selected, setSelected] = useState(new Set());
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set(partner?.school_ids || []));
      setQ('');
    }
  }, [open, partner]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return allSchools;
    return allSchools.filter((s) =>
      (s.school_name || '').toLowerCase().includes(query) ||
      (s.contact_name || '').toLowerCase().includes(query) ||
      (s.location || '').toLowerCase().includes(query));
  }, [allSchools, q]);

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const submit = async () => {
    setSaving(true);
    try {
      await axios.post(
        `${API}/simple-partners/${partner.id}/schools`,
        { school_ids: Array.from(selected) },
        { headers: getAuthHeaders() },
      );
      toast.success(`${selected.size} school${selected.size === 1 ? '' : 's'} linked`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to link schools');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign schools to {partner?.name}</DialogTitle>
        </DialogHeader>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search schools..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200"
          />
        </div>
        <div className="text-xs text-slate-500 mb-2">{selected.size} selected · {filtered.length} shown</div>
        <div className="flex-1 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100">
          {filtered.slice(0, 300).map((s) => {
            const on = selected.has(s.id);
            return (
              <label key={s.id} className={`flex items-start gap-2 p-2.5 cursor-pointer ${on ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(s.id)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{s.school_name || '—'}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {s.contact_name || ''} {s.phone ? `· ${s.phone}` : ''} {s.location ? `· ${s.location}` : ''}
                  </div>
                </div>
                {s.status && <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{s.status}</span>}
              </label>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#0A1F44] text-white" data-testid="simple-partner-assign-save">
            {saving ? 'Saving…' : `Save (${selected.size})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ────────────────────────────────────────────────────────────────────
// Partner row (expandable)
// ────────────────────────────────────────────────────────────────────
const PartnerRow = ({ partner, onEdit, onDelete, onAssignSchools, onKpisChanged }) => {
  const { getAuthHeaders } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadKpis = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/simple-partners/${partner.id}/kpis`, { headers: getAuthHeaders() });
      setKpis(res.data);
      onKpisChanged?.(partner.id, res.data);
    } catch (e) {
      // Silent — the summary strip will just show 0s
    } finally {
      setLoading(false);
    }
  }, [partner.id, getAuthHeaders, onKpisChanged]);

  useEffect(() => { loadKpis(); }, [loadKpis]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-shadow" data-testid={`simple-partner-row-${partner.id}`}>
      <div className="p-4 flex flex-wrap items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">
          {initials(partner.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[#1E3A5F]">{partner.name}</h3>
            {partner.city && <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><MapPin className="w-3 h-3" /> {partner.city}</span>}
            {partner.social_handle && <span className="text-[11px] text-purple-700 font-semibold">{partner.social_handle}</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-slate-600">
            {partner.phone && <a href={`tel:${partner.phone}`} className="inline-flex items-center gap-1 hover:text-slate-900"><Phone className="w-3 h-3" /> {partner.phone}</a>}
            {partner.email && <a href={`mailto:${partner.email}`} className="inline-flex items-center gap-1 hover:text-slate-900"><Mail className="w-3 h-3" /> {partner.email}</a>}
          </div>
        </div>
        {/* KPI pills */}
        <div className="flex gap-2 flex-wrap">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Schools</div>
            <div className="text-sm font-black text-slate-900">{kpis?.schools_count ?? '—'}</div>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Revenue</div>
            <div className="text-sm font-black text-emerald-900">{fmtINR(kpis?.revenue || 0)}</div>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Students</div>
            <div className="text-sm font-black text-amber-900">{kpis?.total_students ?? '—'}</div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => onAssignSchools(partner)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold" data-testid={`simple-partner-assign-${partner.id}`}>
            <Link2 className="w-3.5 h-3.5" /> Assign Schools
          </button>
          <button onClick={() => setExpanded((v) => !v)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 text-xs font-bold" data-testid={`simple-partner-view-${partner.id}`}>
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />} {expanded ? 'Hide' : 'View'}
          </button>
          <button onClick={() => onEdit(partner)} className="p-1.5 rounded-lg hover:bg-slate-100" title="Edit" data-testid={`simple-partner-edit-${partner.id}`}>
            <Edit2 className="w-4 h-4 text-slate-500" />
          </button>
          <button onClick={() => onDelete(partner)} className="p-1.5 rounded-lg hover:bg-rose-50" title="Delete" data-testid={`simple-partner-delete-${partner.id}`}>
            <Trash2 className="w-4 h-4 text-rose-500" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4">
          {loading ? (
            <LoadingSpinner size="sm" text="Loading partner schools…" />
          ) : !kpis || kpis.schools.length === 0 ? (
            <div className="text-sm text-slate-500 py-4 text-center">
              No schools linked yet. Click <b>Assign Schools</b> to attribute revenue to this partner.
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 text-left">School</th>
                    <th className="px-3 py-2 text-left">Contact</th>
                    <th className="px-3 py-2 text-left">Location</th>
                    <th className="px-3 py-2 text-right">Students</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.schools.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold text-[#0F1E33]">{s.school_name || '—'}</td>
                      <td className="px-3 py-2 text-xs">
                        <div className="text-slate-700">{s.contact_name || '—'}</div>
                        <div className="text-slate-500">{s.phone || ''}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">{s.location || '—'}</td>
                      <td className="px-3 py-2 text-right">{s.total_students || 0}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700">{fmtINR(s.conversion_amount || 0)}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold uppercase tracking-wide text-[10px]">
                          {(s.status || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────
// Main section
// ────────────────────────────────────────────────────────────────────
export default function SimplePartnersSection({ type }) {
  const { getAuthHeaders } = useAuth();
  const [partners, setPartners] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [search, setSearch] = useState('');
  const [kpisById, setKpisById] = useState({});

  const label = type === 'referral' ? 'Referral' : 'Influencer';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        axios.get(`${API}/simple-partners?type=${type}`, { headers: getAuthHeaders() }),
        axios.get(`${API}/schools/inquiries?limit=1000`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
      ]);
      setPartners(pRes.data || []);
      const sData = Array.isArray(sRes.data) ? sRes.data : (sRes.data?.inquiries || sRes.data?.schools || sRes.data?.items || []);
      setSchools(sData);
    } catch (e) {
      toast.error(`Failed to load ${label} partners`);
    } finally {
      setLoading(false);
    }
  }, [type, getAuthHeaders, label]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete ${p.name}? This does not delete their assigned schools.`)) return;
    try {
      await axios.delete(`${API}/simple-partners/${p.id}`, { headers: getAuthHeaders() });
      toast.success('Partner deleted');
      fetchAll();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q));
  }, [partners, search]);

  const totalRevenue = Object.values(kpisById).reduce((s, k) => s + (k?.revenue || 0), 0);
  const totalSchools = Object.values(kpisById).reduce((s, k) => s + (k?.schools_count || 0), 0);

  return (
    <div className="space-y-4" data-testid={`simple-partners-${type}`}>
      {/* Summary + toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-slate-100 bg-purple-50 px-4 py-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-purple-700">{label} Partners</div>
          <div className="text-2xl font-black text-purple-900">{partners.length}</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-emerald-50 px-4 py-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Attributed Revenue</div>
          <div className="text-2xl font-black text-emerald-900">{fmtINR(totalRevenue)}</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Schools</div>
          <div className="text-2xl font-black text-slate-900">{totalSchools}</div>
        </div>
        <div className="relative flex-1 min-w-[220px] max-w-md ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search partners..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200"
            data-testid={`simple-partner-search-${type}`}
          />
        </div>
        <Button variant="outline" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
        <Button onClick={() => { setEditing(null); setAddOpen(true); }} className="bg-[#1E3A5F] hover:bg-[#0A1F44] text-white" data-testid={`add-${type}-partner-btn`}>
          <Plus className="w-4 h-4 mr-1.5" /> Add {label} Partner
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <LoadingSpinner text={`Loading ${label.toLowerCase()} partners…`} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            No {label.toLowerCase()} partners yet. Click <b>Add {label} Partner</b> to create one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <PartnerRow
              key={p.id}
              partner={p}
              onEdit={(pp) => { setEditing(pp); setAddOpen(true); }}
              onDelete={handleDelete}
              onAssignSchools={setAssigning}
              onKpisChanged={(id, k) => setKpisById((prev) => ({ ...prev, [id]: k }))}
            />
          ))}
        </div>
      )}

      <PartnerModal
        open={addOpen}
        partner={editing}
        type={type}
        onClose={() => { setAddOpen(false); setEditing(null); }}
        onSaved={fetchAll}
      />
      <AssignSchoolsModal
        open={!!assigning}
        partner={assigning}
        allSchools={schools}
        onClose={() => setAssigning(null)}
        onSaved={fetchAll}
      />
    </div>
  );
}
