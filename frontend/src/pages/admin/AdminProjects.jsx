import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import {
  Plus, Users as UsersIcon, X, Trash2, CheckCircle2, Clock, Archive, PauseCircle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_META = {
  active:    { label: 'Active',    icon: Clock,        color: 'text-blue-600',  bg: 'bg-blue-50' },
  on_hold:   { label: 'On Hold',   icon: PauseCircle,  color: 'text-amber-600', bg: 'bg-amber-50' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  archived:  { label: 'Archived',  icon: Archive,      color: 'text-slate-500', bg: 'bg-slate-50' },
};

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#0EA5E9', '#6366F1'];

const AdminProjects = () => {
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', color: COLORS[0], status: 'active',
    lead_id: '', member_ids: [], start_date: '', end_date: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/projects`, { headers: getAuthHeaders() });
      setProjects(res.data || []);
    } catch {
      toast.error('Failed to load projects');
    } finally { setLoading(false); }
  }, [getAuthHeaders]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    axios.get(`${API}/team-users`, { headers: getAuthHeaders() })
      .then(r => setUsers(r.data || []))
      .catch(() => {});
  }, [getAuthHeaders]);

  const resetForm = () => setForm({ name: '', description: '', color: COLORS[0], status: 'active', lead_id: '', member_ids: [], start_date: '', end_date: '' });

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      await axios.post(`${API}/projects`, {
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      }, { headers: getAuthHeaders() });
      toast.success('Project created');
      setShowCreate(false);
      resetForm();
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create project');
    }
  };

  const deleteProject = async (p) => {
    if (!window.confirm(`Delete project "${p.name}"? Tasks will be unlinked.`)) return;
    try {
      await axios.delete(`${API}/projects/${p.id}`, { headers: getAuthHeaders() });
      toast.success('Project deleted');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to delete');
    }
  };

  const toggleMember = (uid) => {
    setForm(f => ({
      ...f,
      member_ids: f.member_ids.includes(uid) ? f.member_ids.filter(x => x !== uid) : [...f.member_ids, uid],
    }));
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="admin-projects-page">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
            <p className="text-sm text-slate-500">Group work into projects. Assign a lead and members.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800"
            data-testid="new-project-btn"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading…</div>
        ) : projects.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">No projects yet. Create your first one.</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="projects-grid">
            {projects.map(p => {
              const S = STATUS_META[p.status] || STATUS_META.active;
              const pct = p.task_count ? Math.round((p.task_done / p.task_count) * 100) : 0;
              return (
                <Card
                  key={p.id}
                  className="p-5 bg-white hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/admin/projects/${p.id}`)}
                  data-testid={`project-card-${p.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <h3 className="font-semibold text-slate-900 truncate">{p.name}</h3>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteProject(p); }}
                      className="p-1 text-slate-400 hover:text-red-600" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {p.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center gap-2 text-xs mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${S.bg} ${S.color} font-medium`}>
                      <S.icon className="w-3 h-3" /> {S.label}
                    </span>
                    <span className="text-slate-500">
                      Lead: <span className="font-medium text-slate-700">{p.lead_name || '—'}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="w-3 h-3" /> {(p.members || []).length} members
                    </span>
                    <span>{p.task_done}/{p.task_count} tasks</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="new-project-modal">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Create Project</h2>
                <button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Project name *" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" data-testid="project-name-input" />
                <textarea placeholder="Description" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm min-h-[70px]" />
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setForm({ ...form, color: c })}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-900 border-white' : 'border-white'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.lead_id} onChange={e => setForm({ ...form, lead_id: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm" data-testid="project-lead-select">
                    <option value="">Select Lead</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm" placeholder="Start date" />
                  <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm" placeholder="End date" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Members ({form.member_ids.length} selected)</label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {users.map(u => (
                      <label key={u.id} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-sm ${form.member_ids.includes(u.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={form.member_ids.includes(u.id)}
                          onChange={() => toggleMember(u.id)} className="w-4 h-4" />
                        {u.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => { setShowCreate(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreate} data-testid="project-submit-btn"
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800">
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProjects;
