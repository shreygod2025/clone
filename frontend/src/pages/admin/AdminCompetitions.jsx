import { useState, useEffect, useMemo, useRef } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Trophy, Building2, GraduationCap, User, Download, Upload, Search,
  Mail, Phone, MapPin, Loader2, ExternalLink,
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TECHFEST_URL = '/techfest';

const TABS = [
  { key: 'school',   label: 'Schools',           icon: Building2,      color: 'bg-blue-500' },
  { key: 'educator', label: 'Educators/Mentors', icon: GraduationCap,  color: 'bg-red-500' },
  { key: 'student',  label: 'Students',          icon: User,           color: 'bg-amber-500' },
];

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

export default function AdminCompetitions() {
  const { getAuthHeaders } = useAuth();
  const [tab, setTab] = useState('school');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/techfest/registrations`, {
        headers: getAuthHeaders(), params: { type: tab },
      });
      setRows(res.data?.items || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load registrations');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tab]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) => [
      r.name, r.email, r.phone, r.city, r.school_name, r.school_or_institute,
      r.role_designation, r.grade_taught, r.school_email, r.school_phone, r.school_address,
    ].some((v) => (v || '').toString().toLowerCase().includes(needle)));
  }, [rows, q]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API}/admin/techfest/registrations/export`, {
        headers: getAuthHeaders(), params: { type: tab }, responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      a.href = url; a.download = `techfest-${tab}-${stamp}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await axios.post(`${API}/admin/techfest/registrations/import`, fd, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      const { inserted = 0, updated = 0, skipped = 0, errors = [] } = res.data || {};
      toast.success(`Imported: ${inserted} new · ${updated} updated · ${skipped} skipped${errors.length ? ` · ${errors.length} errors` : ''}`);
      if (errors.length) console.warn('Import errors', errors);
      await load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Import failed'); }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto" data-testid="admin-competitions-page">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Admin · Competitions</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-1">Competitions.</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base max-w-2xl">
              All OLL-run competitions in one place. Click a competition to see its registrations, filter by role, and import/export CSVs.
            </p>
          </div>
        </div>

        {/* Competitions grid — Techfest as the first (currently only) card */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8" data-testid="admin-competitions-grid">
          <div className="relative rounded-2xl border-2 border-[#DC2626] bg-gradient-to-br from-[#0A1F44] via-[#1E3A5F] to-[#0A1F44] text-white p-5 shadow-lg overflow-hidden">
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-[#DC2626]/40 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-200"><Trophy className="w-3.5 h-3.5" /> Live</div>
              <div className="text-2xl font-bold mt-2 leading-tight">OLL × Techfest IIT Bombay 2026</div>
              <div className="text-xs text-white/70 mt-1">Grand Finale · 16–18 Dec 2026</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={TECHFEST_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-white text-[#0A1F44] px-3 py-1.5 rounded-full">
                  Open Campaign <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs — School / Educator / Student */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap border-b border-slate-200" role="tablist" data-testid="admin-competitions-tabs">
            {TABS.map((t) => {
              const active = t.key === tab;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  role="tab"
                  aria-selected={active}
                  data-testid={`admin-competitions-tab-${t.key}`}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${active ? 'text-[#0A1F44] border-[#DC2626] bg-red-50/50' : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {tab === t.key && !loading && (
                    <span className="ml-2 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{rows.length}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${tab === 'school' ? 'schools' : tab === 'educator' ? 'educators' : 'students'}…`}
                className="pl-9 bg-white"
                data-testid="admin-competitions-search"
              />
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} data-testid="admin-competitions-import-input" />
              <Button variant="outline" size="sm" onClick={handleImportClick} disabled={importing} data-testid="admin-competitions-import-btn">
                {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />} Import CSV
              </Button>
              <Button size="sm" onClick={handleExport} disabled={exporting} className="bg-[#0A1F44] hover:bg-[#1E3A5F]" data-testid="admin-competitions-export-btn">
                {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />} Export CSV
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center" data-testid={tab === 'student' ? 'admin-competitions-empty-student' : 'admin-competitions-empty'}>
                {tab === 'student' ? (
                  <>
                    <User className="w-10 h-10 mx-auto text-slate-300" />
                    <div className="mt-3 font-bold text-slate-800">No student registrations yet</div>
                    <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Individual students register on techfest.org. Use <strong>Import CSV</strong> above to bulk-load a student roster from the Techfest export (must have a <code>type</code> column set to <code>student</code>).</p>
                    <a href="https://techfest.org/competitions/oll" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#DC2626] hover:underline">
                      Open techfest.org/competitions/oll <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </>
                ) : (
                  <span className="text-slate-500">No {tab} registrations {q ? 'match your search' : 'yet'}.</span>
                )}
              </div>
            ) : (
              <table className="w-full text-sm" data-testid={`admin-competitions-table-${tab}`}>
                <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-3 font-bold">Sr.</th>
                    <th className="text-left px-3 py-3 font-bold">Registered</th>
                    <th className="text-left px-3 py-3 font-bold">Name</th>
                    <th className="text-left px-3 py-3 font-bold">Contact</th>
                    <th className="text-left px-3 py-3 font-bold">City</th>
                    {tab === 'school' ? (
                      <>
                        <th className="text-left px-3 py-3 font-bold">School</th>
                        <th className="text-left px-3 py-3 font-bold">Role</th>
                      </>
                    ) : tab === 'educator' ? (
                      <>
                        <th className="text-left px-3 py-3 font-bold">School / Institute</th>
                        <th className="text-left px-3 py-3 font-bold">Subject</th>
                      </>
                    ) : (
                      <>
                        <th className="text-left px-3 py-3 font-bold">School</th>
                        <th className="text-left px-3 py-3 font-bold">Grade · Team · Track</th>
                      </>
                    )}
                    <th className="text-left px-3 py-3 font-bold">{tab === 'student' ? 'Team size' : 'Students'}</th>
                    <th className="text-left px-3 py-3 font-bold">School Address</th>
                    <th className="text-left px-3 py-3 font-bold">School Contact</th>
                    <th className="text-left px-3 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50/70 align-top" data-testid={`admin-competitions-row-${r._id}`}>
                      <td className="px-3 py-3 text-slate-500 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-700">{fmtDateTime(r.created_at)}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{r.name || '—'}</td>
                      <td className="px-3 py-3 text-slate-700">
                        <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-[13px] hover:text-[#DC2626]"><Mail className="w-3 h-3" />{r.email}</a>
                        <div className="text-[12px] text-slate-500 mt-0.5 inline-flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-700 inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{r.city || '—'}</td>
                      {tab === 'school' ? (
                        <>
                          <td className="px-3 py-3 text-slate-700">{r.school_name || '—'}</td>
                          <td className="px-3 py-3 text-slate-700">{r.role_designation || '—'}</td>
                        </>
                      ) : tab === 'educator' ? (
                        <>
                          <td className="px-3 py-3 text-slate-700">{r.school_or_institute || '—'}</td>
                          <td className="px-3 py-3 text-slate-700">{r.grade_taught || '—'}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3 text-slate-700">{r.school_name || r.school_or_institute || '—'}</td>
                          <td className="px-3 py-3 text-slate-700 text-[12px]">
                            <div>{r.grade || '—'} {r.team_name ? `· ${r.team_name}` : ''}</div>
                            {r.track && <div className="text-slate-500">{r.track}</div>}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-3 text-slate-700">{r.student_count || '—'}</td>
                      <td className="px-3 py-3 text-slate-700 max-w-[240px]">{r.school_address || '—'}</td>
                      <td className="px-3 py-3 text-slate-700 text-[12px]">
                        {r.school_email ? <div className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{r.school_email}</div> : null}
                        {r.school_phone ? <div className="mt-0.5 inline-flex items-center gap-1"><Phone className="w-3 h-3" />{r.school_phone}</div> : null}
                        {!(r.school_email || r.school_phone) && '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-blue-100 text-blue-800">{r.status || 'new'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
