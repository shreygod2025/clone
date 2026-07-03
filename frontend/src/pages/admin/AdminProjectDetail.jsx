import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import TaskCreateModal from '../../components/tasks/TaskCreateModal';
import { TaskCard } from './AdminTasks';
import {
  ArrowLeft, Plus, Trash2, Users as UsersIcon, Calendar, CheckCircle2,
  Circle, Clock, Pin, ExternalLink, Edit2, StickyNote, Link2, X, ListChecks
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_META = {
  active:    { label: 'Active',    color: 'bg-blue-100 text-blue-700' },
  on_hold:   { label: 'On Hold',   color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  archived:  { label: 'Archived',  color: 'bg-slate-100 text-slate-700' },
};

const MS_STATUS = {
  pending:      { label: 'Pending',     icon: Circle,       color: 'text-slate-500' },
  in_progress:  { label: 'In Progress', icon: Clock,        color: 'text-blue-600' },
  completed:    { label: 'Completed',   icon: CheckCircle2, color: 'text-green-600' },
};

const AdminProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeaders } = useAuth();
  const isAdmin = user?.role === 'admin';
  const currentUserId = user?.id;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [subTaskParent, setSubTaskParent] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const [tasks, setTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [kb, setKb] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t, ms, k] = await Promise.all([
        axios.get(`${API}/projects/${id}`, { headers: getAuthHeaders() }),
        axios.get(`${API}/tasks?filter=all&project_id=${id}`, { headers: getAuthHeaders() }),
        axios.get(`${API}/projects/${id}/milestones`, { headers: getAuthHeaders() }),
        axios.get(`${API}/projects/${id}/kb`, { headers: getAuthHeaders() }),
      ]);
      setProject(p.data);
      setTasks(t.data || []);
      setMilestones(ms.data || []);
      setKb(k.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load project');
    } finally { setLoading(false); }
  }, [id, getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

  const deleteTaskFn = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await axios.delete(`${API}/tasks/${task.id}`, { headers: getAuthHeaders() });
      toast.success('Deleted');
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const openAddSubtask = (parent) => { setSubTaskParent(parent); setShowTaskModal(true); };
  const toggleExpand = (tid) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(tid)) next.delete(tid); else next.add(tid);
      return next;
    });
  };

  if (loading || !project) {
    return <AdminLayout><div className="p-6 text-slate-500 text-sm">Loading…</div></AdminLayout>;
  }

  const S = STATUS_META[project.status] || STATUS_META.active;
  const pct = project.task_count ? Math.round((project.task_done / project.task_count) * 100) : 0;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5" data-testid="admin-project-detail-page">
        <button onClick={() => navigate('/admin/projects')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          data-testid="back-to-projects-btn">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>

        <div className="bg-white rounded-2xl p-4 sm:p-6 border shadow-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-4 h-4 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: project.color }} />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900" data-testid="project-name">{project.name}</h1>
              {project.description && <p className="text-sm text-slate-600 mt-1">{project.description}</p>}
              <div className="flex items-center gap-3 mt-3 flex-wrap text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${S.color}`}>{S.label}</span>
                <span className="text-slate-500">Lead: <strong className="text-slate-800">{project.lead_name || '—'}</strong></span>
                <span className="text-slate-500 inline-flex items-center gap-1"><UsersIcon className="w-3 h-3" /> {(project.members || []).length} members</span>
                <span className="text-slate-500">Tasks: <strong>{project.task_done}/{project.task_count}</strong></span>
                {project.start_date && <span className="text-slate-500 hidden sm:inline">Start: {project.start_date}</span>}
                {project.end_date && <span className="text-slate-500 hidden sm:inline">End: {project.end_date}</span>}
              </div>
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: project.color }} />
          </div>
        </div>

        {/* All sections stacked (no tabs) */}
        <section data-testid="project-section-overview">
          <SectionHeader title="Overview" />
          <OverviewTab project={project} milestones={milestones} tasks={tasks} kb={kb} />
        </section>

        <section data-testid="project-section-tasks">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-bold text-slate-900">Tasks</h2>
              <span className="text-xs text-slate-400 font-medium">{tasks.length}</span>
            </div>
            <button
              onClick={() => { setSubTaskParent(null); setShowTaskModal(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium shadow-sm shadow-blue-500/20"
              data-testid="project-add-task-btn"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
          <ProjectTasksList
            tasks={tasks}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            onDelete={deleteTaskFn}
            onReload={load}
            onAddSubtask={openAddSubtask}
            onEdit={setEditingTask}
            getAuthHeaders={getAuthHeaders}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        </section>

        <section data-testid="project-section-milestones">
          <SectionHeader title="Milestones" count={milestones.length} />
          <MilestonesTab milestones={milestones} projectId={id} onRefresh={load} getAuthHeaders={getAuthHeaders} />
        </section>

        <section data-testid="project-section-kb">
          <SectionHeader title="Knowledge Base" count={kb.length} />
          <KbTab entries={kb} projectId={id} onRefresh={load} getAuthHeaders={getAuthHeaders} />
        </section>

        {/* Inline task-create modal (no redirect) */}
        <TaskCreateModal
          open={showTaskModal}
          onClose={() => { setShowTaskModal(false); setSubTaskParent(null); }}
          onCreated={() => load()}
          currentUser={user}
          defaultProjectId={id}
          parentTask={subTaskParent}
        />

        {/* Edit modal */}
        <TaskCreateModal
          open={!!editingTask}
          onClose={() => setEditingTask(null)}
          onCreated={() => load()}
          currentUser={user}
          existingTask={editingTask}
        />
      </div>
    </AdminLayout>
  );
};

// ── Project tasks list (uses shared TaskCard) ────────────────────────────────
const ProjectTasksList = ({ tasks, expandedIds, toggleExpand, onDelete, onReload, onAddSubtask, onEdit, getAuthHeaders, currentUserId, isAdmin }) => {
  if (tasks.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-2">
          <ListChecks className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-500">No tasks yet.</p>
      </div>
    );
  }
  return (
    <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
      {tasks.map(t => (
        <TaskCard
          key={t.id}
          task={t}
          expanded={expandedIds.has(t.id)}
          onToggle={() => toggleExpand(t.id)}
          onOpen={() => onEdit(t)}
          onDelete={() => onDelete(t)}
          onStatus={(s) => { if (s === '__reload__') onReload(); }}
          onAddSubtask={() => onAddSubtask(t)}
          onEdit={() => onEdit(t)}
          getAuthHeaders={getAuthHeaders}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
};

// ── Section header (used between stacked sections) ───────────────────────────
const SectionHeader = ({ title, count }) => (
  <div className="flex items-baseline gap-2 mb-2 px-1">
    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
    {count !== undefined && <span className="text-xs text-slate-400 font-medium">{count}</span>}
  </div>
);

// ── Overview ─────────────────────────────────────────────────────────────────
const OverviewTab = ({ project, milestones, tasks, kb }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
        <UsersIcon className="w-4 h-4" /> Team
      </h3>
      <div className="space-y-1.5">
        {(project.members || []).length === 0 && <p className="text-xs text-slate-400 italic">No members yet.</p>}
        {(project.members || []).map(m => (
          <div key={m.id} className="text-sm text-slate-700">
            {m.name} <span className="text-xs text-slate-400">· {m.email}</span>
          </div>
        ))}
      </div>
    </Card>
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Latest Activity</h3>
      <div className="text-xs text-slate-500 space-y-1">
        <p><strong className="text-slate-800">{tasks.length}</strong> tasks · <strong className="text-slate-800">{milestones.length}</strong> milestones · <strong className="text-slate-800">{kb.length}</strong> KB entries</p>
        <p>Created: {new Date(project.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
      </div>
    </Card>
  </div>
);

// ── Milestones tab ───────────────────────────────────────────────────────────
const MilestonesTab = ({ milestones, projectId, onRefresh, getAuthHeaders }) => {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', status: 'pending' });

  const create = async () => {
    if (!form.title.trim()) return toast.error('Title required');
    try {
      await axios.post(`${API}/projects/${projectId}/milestones`, form, { headers: getAuthHeaders() });
      toast.success('Milestone added');
      setCreating(false);
      setForm({ title: '', description: '', due_date: '', status: 'pending' });
      onRefresh();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const updateStatus = async (ms, status) => {
    try {
      await axios.patch(`${API}/projects/milestones/${ms.id}`, { status }, { headers: getAuthHeaders() });
      onRefresh();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const remove = async (ms) => {
    if (!window.confirm('Delete milestone?')) return;
    try {
      await axios.delete(`${API}/projects/milestones/${ms.id}`, { headers: getAuthHeaders() });
      toast.success('Deleted');
      onRefresh();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Milestones ({milestones.length})</h3>
        <button onClick={() => setCreating(v => !v)}
          className="text-xs text-blue-600 hover:underline"
          data-testid="milestone-add-btn">
          + Add milestone
        </button>
      </div>
      {creating && (
        <div className="border rounded-lg p-3 mb-3 bg-slate-50" data-testid="milestone-form">
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Milestone title" className="w-full px-3 py-1.5 border rounded text-sm mb-2"
            data-testid="milestone-title-input" />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Description (optional)" className="w-full px-3 py-1.5 border rounded text-sm mb-2 min-h-[50px]" />
          <div className="flex gap-2 items-center">
            <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
              className="px-3 py-1.5 border rounded text-sm" />
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              className="px-3 py-1.5 border rounded text-sm">
              {Object.entries(MS_STATUS).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
            </select>
            <div className="flex-1" />
            <button onClick={() => setCreating(false)} className="px-3 py-1.5 border rounded text-sm">Cancel</button>
            <button onClick={create} className="px-3 py-1.5 bg-slate-900 text-white rounded text-sm"
              data-testid="milestone-save-btn">Save</button>
          </div>
        </div>
      )}
      {milestones.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-6">No milestones yet.</p>
      ) : (
        <div className="space-y-2">
          {milestones.map(ms => {
            const S = MS_STATUS[ms.status] || MS_STATUS.pending;
            const next = ms.status === 'pending' ? 'in_progress' : ms.status === 'in_progress' ? 'completed' : 'pending';
            const nextLabel = ms.status === 'pending' ? 'Start' : ms.status === 'in_progress' ? 'Complete' : 'Reopen';
            return (
              <div key={ms.id} className="flex items-center gap-3 border rounded-lg p-3" data-testid={`milestone-${ms.id}`}>
                <S.icon className={`w-5 h-5 ${S.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900">{ms.title}</p>
                  {ms.description && <p className="text-xs text-slate-500 mt-0.5">{ms.description}</p>}
                  {ms.due_date && <p className="text-[10px] text-slate-400 mt-1">Due {new Date(ms.due_date).toLocaleDateString('en-IN')}</p>}
                </div>
                <button onClick={() => updateStatus(ms, next)} className="text-xs text-blue-600 hover:underline"
                  data-testid={`milestone-advance-${ms.id}`}>{nextLabel}</button>
                <button onClick={() => remove(ms)} className="p-1 text-slate-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

// ── KB tab ───────────────────────────────────────────────────────────────────
const KbTab = ({ entries, projectId, onRefresh, getAuthHeaders }) => {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ type: 'note', title: '', content: '', url: '', is_pinned: false });

  const create = async () => {
    if (!form.title.trim()) return toast.error('Title required');
    try {
      await axios.post(`${API}/projects/${projectId}/kb`, form, { headers: getAuthHeaders() });
      toast.success('Added');
      setCreating(false);
      setForm({ type: 'note', title: '', content: '', url: '', is_pinned: false });
      onRefresh();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const togglePin = async (entry) => {
    try {
      await axios.patch(`${API}/projects/kb/${entry.id}`, { is_pinned: !entry.is_pinned }, { headers: getAuthHeaders() });
      onRefresh();
    } catch { /* noop */ }
  };

  const remove = async (entry) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await axios.delete(`${API}/projects/kb/${entry.id}`, { headers: getAuthHeaders() });
      toast.success('Deleted');
      onRefresh();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Knowledge Base ({entries.length})</h3>
        <button onClick={() => setCreating(v => !v)}
          className="text-xs text-blue-600 hover:underline"
          data-testid="kb-add-btn">
          + Add entry
        </button>
      </div>
      {creating && (
        <div className="border rounded-lg p-3 mb-3 bg-slate-50" data-testid="kb-form">
          <div className="flex gap-2 mb-2">
            <button onClick={() => setForm({ ...form, type: 'note' })}
              className={`flex-1 py-2 rounded text-sm font-medium ${form.type === 'note' ? 'bg-slate-900 text-white' : 'bg-white border'}`}>
              <StickyNote className="w-4 h-4 inline mr-1" /> Note
            </button>
            <button onClick={() => setForm({ ...form, type: 'link' })}
              className={`flex-1 py-2 rounded text-sm font-medium ${form.type === 'link' ? 'bg-slate-900 text-white' : 'bg-white border'}`}>
              <Link2 className="w-4 h-4 inline mr-1" /> Link
            </button>
          </div>
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Title" className="w-full px-3 py-1.5 border rounded text-sm mb-2"
            data-testid="kb-title-input" />
          {form.type === 'note' ? (
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
              placeholder="Write a note…" className="w-full px-3 py-1.5 border rounded text-sm mb-2 min-h-[100px]" />
          ) : (
            <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
              placeholder="https://…" className="w-full px-3 py-1.5 border rounded text-sm mb-2" />
          )}
          <label className="flex items-center gap-2 text-xs text-slate-600 mb-2">
            <input type="checkbox" checked={form.is_pinned} onChange={e => setForm({ ...form, is_pinned: e.target.checked })} />
            Pin to top
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setCreating(false)} className="px-3 py-1.5 border rounded text-sm">Cancel</button>
            <button onClick={create} className="px-3 py-1.5 bg-slate-900 text-white rounded text-sm"
              data-testid="kb-save-btn">Save</button>
          </div>
        </div>
      )}
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-6">No entries yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className={`border rounded-lg p-3 ${e.is_pinned ? 'bg-amber-50/40 border-amber-200' : 'bg-white'}`}
              data-testid={`kb-entry-${e.id}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {e.type === 'note' ? <StickyNote className="w-4 h-4 text-slate-500" /> : <Link2 className="w-4 h-4 text-blue-500" />}
                  <h4 className="font-medium text-slate-900 text-sm truncate">{e.title}</h4>
                  {e.is_pinned && <Pin className="w-3 h-3 text-amber-500" />}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePin(e)} className="p-1 text-slate-400 hover:text-amber-600"
                    title={e.is_pinned ? 'Unpin' : 'Pin'}>
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(e)} className="p-1 text-slate-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {e.type === 'note' && e.content && (
                <p className="text-xs text-slate-600 whitespace-pre-wrap">{e.content}</p>
              )}
              {e.type === 'link' && e.url && (
                <a href={e.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                  {e.url} <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <p className="text-[10px] text-slate-400 mt-1">By {e.created_by_name} · {new Date(e.created_at).toLocaleDateString('en-IN')}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AdminProjectDetail;
