/**
 * CenterPartnersSection — mirrors the Business-Partner "Active / Inactive"
 * flow but scoped to team_users whose `role_id` maps to the "Center Partner"
 * system role. Center partners hold login credentials, so this section
 * doubles as the account manager for them.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus, RefreshCw, Search, Users, MapPin, Phone, Mail, Building2, UserPlus,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Button } from '../../../components/ui/button';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const initials = (n) => (n || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

const SUB_TABS = [
  { value: 'active',   label: 'Active Partners' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'leads',    label: 'Leads' },
];

// ────────────────────────────────────────────────────────────────────
// Add Center Partner Lead modal
// ────────────────────────────────────────────────────────────────────
const AddLeadModal = ({ open, onClose, onSaved }) => {
  const { getAuthHeaders } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', interest_type: 'center', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ name: '', phone: '', email: '', city: '', interest_type: 'center', notes: '' });
  }, [open]);

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      // Reuse the growth_partners collection so leads sit in one funnel; the
      // interest_type "center" distinguishes centre applicants from franchise
      // / distributor applicants.
      await axios.post(`${API}/growth-partners`, { ...form, source: 'admin_direct' }, { headers: getAuthHeaders() });
      toast.success('Center partner lead added');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to add lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Center Partner Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" data-testid="center-lead-name" />
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
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">City</label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Notes</label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#0A1F44] text-white" data-testid="center-lead-save">
              {saving ? 'Saving…' : 'Add Lead'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ────────────────────────────────────────────────────────────────────
// Section
// ────────────────────────────────────────────────────────────────────
export default function CenterPartnersSection() {
  const { getAuthHeaders } = useAuth();
  const [tab, setTab] = useState('active');
  const [teamUsers, setTeamUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [gpLeads, setGpLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, rRes, gRes] = await Promise.all([
        axios.get(`${API}/team-users`, { headers: getAuthHeaders() }),
        axios.get(`${API}/roles`,      { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API}/growth-partners`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
      ]);
      setTeamUsers(uRes.data || []);
      setRoles(rRes.data || []);
      const leads = Array.isArray(gRes.data) ? gRes.data : (gRes.data?.partners || []);
      setGpLeads(leads);
    } catch (e) {
      toast.error('Failed to load center partners');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const centerRoleIds = useMemo(
    () => new Set(roles.filter((r) => (r.name || '').toLowerCase() === 'center partner').map((r) => r.id)),
    [roles],
  );
  const centerUsers = useMemo(
    () => teamUsers.filter((u) => centerRoleIds.has(u.role_id)),
    [teamUsers, centerRoleIds],
  );
  const activeCenters = useMemo(() => centerUsers.filter((u) => u.is_active !== false), [centerUsers]);
  const inactiveCenters = useMemo(() => centerUsers.filter((u) => u.is_active === false), [centerUsers]);
  const centerLeads = useMemo(
    () => gpLeads.filter((g) => (g.interest_type || '').toLowerCase() === 'center'),
    [gpLeads],
  );

  const toggleActive = async (u, active) => {
    if (!window.confirm(`${active ? 'Re-enable' : 'Disable login for'} ${u.name}?`)) return;
    try {
      await axios.patch(`${API}/team-users/${u.id}`, { is_active: active }, { headers: getAuthHeaders() });
      toast.success(active ? `${u.name} reactivated` : `${u.name} marked inactive — login blocked`);
      fetchAll();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed');
    }
  };

  const q = search.trim().toLowerCase();
  const applySearch = (list, keys) => q
    ? list.filter((r) => keys.some((k) => (r[k] || '').toLowerCase().includes(q)))
    : list;

  const rowsActive   = applySearch(activeCenters,   ['name', 'email', 'phone', 'city', 'username']);
  const rowsInactive = applySearch(inactiveCenters, ['name', 'email', 'phone', 'city', 'username']);
  const rowsLeads    = applySearch(centerLeads,     ['name', 'email', 'phone', 'city']);

  const totals = {
    active: activeCenters.length,
    inactive: inactiveCenters.length,
    leads: centerLeads.length,
  };

  return (
    <div className="space-y-4" data-testid="center-partners-section">
      {/* Sub tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tab === t.value ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            data-testid={`center-subtab-${t.value}`}
          >
            {t.label} ({totals[t.value]})
          </button>
        ))}
        <div className="relative flex-1 min-w-[220px] max-w-md ml-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200"
          />
        </div>
        <Button variant="outline" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
        <Button onClick={() => setAddOpen(true)} className="bg-[#1E3A5F] hover:bg-[#0A1F44] text-white" data-testid="add-center-lead-btn">
          <UserPlus className="w-4 h-4 mr-1.5" /> Add Lead
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading center partners…" />
      ) : tab === 'leads' ? (
        rowsLeads.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No center partner leads yet. Click <b>Add Lead</b>.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Contact</th>
                    <th className="px-4 py-2 text-left">City</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsLeads.map((l) => (
                    <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`center-lead-row-${l.id}`}>
                      <td className="px-4 py-2.5 font-bold text-[#0F1E33]">{l.name}</td>
                      <td className="px-4 py-2.5 text-xs">
                        <div>{l.email || ''}</div>
                        <div className="text-slate-500">{l.phone || ''}</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs">{l.city || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[11px] font-bold uppercase tracking-wide">{l.status || 'new'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{l.source || 'admin_direct'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        (() => {
          const rows = tab === 'active' ? rowsActive : rowsInactive;
          if (rows.length === 0) {
            return (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">
                  {tab === 'active'
                    ? 'No active center partner accounts yet. Activate a lead to create one.'
                    : 'No inactive center partners. Mark an active partner as inactive to block their login.'}
                </p>
              </div>
            );
          }
          return (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" data-testid={`center-users-${tab}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2 text-left">Partner</th>
                      <th className="px-4 py-2 text-left">Contact</th>
                      <th className="px-4 py-2 text-left">City</th>
                      <th className="px-4 py-2 text-left">Login</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => (
                      <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`center-user-row-${u.id}`}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full ${tab === 'active' ? 'bg-emerald-500' : 'bg-slate-400'} text-white flex items-center justify-center font-bold text-[11px]`}>
                              {initials(u.name)}
                            </div>
                            <div>
                              <div className="font-bold text-[#0F1E33]">{u.name || '—'}</div>
                              <div className="text-[11px] text-slate-500">{u.username ? `@${u.username}` : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="text-xs text-slate-700">{u.email || '—'}</div>
                          <div className="text-xs text-slate-500">{u.phone || ''}</div>
                        </td>
                        <td className="px-4 py-2.5 text-xs">{u.city || '—'}</td>
                        <td className="px-4 py-2.5">
                          {tab === 'active' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Can log in
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Login blocked
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {tab === 'active' ? (
                            <button
                              onClick={() => toggleActive(u, false)}
                              className="text-xs font-bold px-3 py-1.5 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                              data-testid={`center-mark-inactive-${u.id}`}
                            >
                              Mark Inactive
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleActive(u, true)}
                              className="text-xs font-bold px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                              data-testid={`center-reactivate-${u.id}`}
                            >
                              Reactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()
      )}

      <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={fetchAll} />
    </div>
  );
}
