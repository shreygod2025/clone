import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import TaskCreateModal from '../../components/tasks/TaskCreateModal';
import { TaskCard } from './AdminTasks';
import UserPicker from '../../components/UserPicker';
import ProjectEarnings from '../../components/projects/ProjectEarnings';
import {
  ArrowLeft, Plus, Trash2, Users as UsersIcon, Calendar, CheckCircle2,
  Circle, Clock, Pin, ExternalLink, Edit2, StickyNote, Link2, X, ListChecks,
  Wallet, Paperclip, FileText, IndianRupee,
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
  const [expenses, setExpenses] = useState({ count: 0, total: 0, expenses: [] });
  const [showEditProject, setShowEditProject] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t, ms, k, ex] = await Promise.all([
        axios.get(`${API}/projects/${id}`, { headers: getAuthHeaders() }),
        axios.get(`${API}/tasks?filter=all&project_id=${id}`, { headers: getAuthHeaders() }),
        axios.get(`${API}/projects/${id}/milestones`, { headers: getAuthHeaders() }),
        axios.get(`${API}/projects/${id}/kb`, { headers: getAuthHeaders() }),
        // Best-effort — projects without any expenses just return count/total=0.
        axios.get(`${API}/school-expenses/project/${id}`, { headers: getAuthHeaders() })
          .catch(() => ({ data: { count: 0, total: 0, expenses: [] } })),
      ]);
      setProject(p.data);
      setTasks(t.data || []);
      setMilestones(ms.data || []);
      setKb(k.data || []);
      setExpenses(ex.data || { count: 0, total: 0, expenses: [] });
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
  const canEdit = isAdmin || currentUserId === project.lead_id || currentUserId === project.created_by;

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
            {canEdit && (
              <button
                onClick={() => setShowEditProject(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium shrink-0"
                data-testid="edit-project-btn"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
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

        <section data-testid="project-section-earnings">
          <SectionHeader title="Earnings" />
          <ProjectEarnings projectId={id} getAuthHeaders={getAuthHeaders} />
        </section>

        <section data-testid="project-section-expenses">
          <SectionHeader title="Expenses" count={expenses.count} />
          <ProjectExpensesTab expenses={expenses} projectId={id} />
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

        {/* Edit Project modal */}
        {showEditProject && (
          <EditProjectModal
            project={project}
            onClose={() => setShowEditProject(false)}
            onSaved={() => { setShowEditProject(false); load(); }}
            getAuthHeaders={getAuthHeaders}
            currentUser={user}
          />
        )}

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

// ── Project expenses ─────────────────────────────────────────────────────────
const _formatINR = (n) => {
  const v = Number(n) || 0;
  try {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(v);
  } catch {
    return v.toFixed(2);
  }
};

const _formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

const _statusPill = (status) => {
  const map = {
    paid:    'bg-green-50 text-green-700 border-green-100',
    pending: 'bg-amber-50 text-amber-700 border-amber-100',
    partial: 'bg-blue-50 text-blue-700 border-blue-100',
    overdue: 'bg-red-50 text-red-700 border-red-100',
    rejected: 'bg-slate-50 text-slate-500 border-slate-100',
  };
  const cls = map[(status || '').toLowerCase()] || 'bg-slate-50 text-slate-600 border-slate-100';
  return <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls}`}>{status || '—'}</span>;
};

const ProjectExpensesTab = ({ expenses, projectId }) => {
  const items = expenses?.expenses || [];
  const total = expenses?.total || 0;
  const count = expenses?.count || 0;

  return (
    <Card className="p-4" data-testid="project-expenses-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Total Project Expenses</div>
          <div className="text-2xl font-bold text-slate-900 flex items-center gap-1" data-testid="project-expenses-total">
            <IndianRupee className="w-5 h-5 text-slate-400" />{_formatINR(total)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{count} entr{count === 1 ? 'y' : 'ies'} linked</div>
        </div>
        <a
          href={`/admin/expenses?project_id=${projectId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
          data-testid="project-expenses-open-full"
        >
          <Wallet className="w-3.5 h-3.5" /> Open in Expenses
        </a>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
          No expenses linked to this project yet. Add one from
          <a href="/admin/expenses" className="text-indigo-600 hover:underline mx-1">Admin → Expenses</a>
          and pick this project in the form.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs font-semibold text-slate-600">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Vendor</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Attachments</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => {
                const attachments = [
                  ...(Array.isArray(e.attachments) ? e.attachments : []),
                  ...(e.invoice_file_url ? [e.invoice_file_url] : []),
                ].filter(Boolean);
                return (
                  <tr
                    key={e.id}
                    className="border-b border-slate-100 hover:bg-slate-50/60"
                    data-testid={`project-expense-row-${e.id}`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700">{_formatDate(e.expense_date)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-xs text-slate-700">{e.category_name || e.category || '—'}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 max-w-xs">
                      <div className="line-clamp-2">{e.description || '—'}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700">{e.vendor_name || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-medium text-slate-900">
                      ₹{_formatINR(e.amount)}
                    </td>
                    <td className="px-3 py-2 text-center">{_statusPill(e.payment_status)}</td>
                    <td className="px-3 py-2 text-center">
                      {attachments.length === 0 ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : (
                        <div className="inline-flex items-center gap-1 justify-center flex-wrap">
                          {attachments.slice(0, 3).map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
                              title="Open attachment"
                              data-testid={`project-expense-attach-${e.id}-${i}`}
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </a>
                          ))}
                          {attachments.length > 3 && (
                            <span className="text-[10px] text-slate-500">+{attachments.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Total</td>
                <td className="px-3 py-2 text-right font-bold text-slate-900">₹{_formatINR(total)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
};

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


// ─── Edit Project modal ─────────────────────────────────────────────────────
const PROJECT_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#0EA5E9', '#6366F1'];
const PROJECT_STATUSES = [
  { v: 'active', l: 'Active' },
  { v: 'on_hold', l: 'On Hold' },
  { v: 'completed', l: 'Completed' },
  { v: 'archived', l: 'Archived' },
];

const EditProjectModal = ({ project, onClose, onSaved, getAuthHeaders, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: project.name || '',
    description: project.description || '',
    color: project.color || PROJECT_COLORS[0],
    status: project.status || 'active',
    lead_id: project.lead_id || '',
    member_ids: project.member_ids || [],
    start_date: project.start_date || '',
    end_date: project.end_date || '',
  });
  const [saving, setSaving] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    axios.get(`${API}/team-users`, { headers: getAuthHeaders() })
      .then(r => setUsers(r.data || []))
      .catch(() => setUsers([]));
  }, [getAuthHeaders]);

  const toggleMember = (id) => {
    setForm(f => ({
      ...f,
      member_ids: f.member_ids.includes(id)
        ? f.member_ids.filter(x => x !== id)
        : [...f.member_ids, id],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    setSaving(true);
    try {
      await axios.patch(`${API}/projects/${project.id}`, {
        name: form.name.trim(),
        description: form.description,
        color: form.color,
        status: form.status,
        lead_id: form.lead_id,
        member_ids: form.member_ids,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      }, { headers: getAuthHeaders() });
      toast.success('Project updated');
      onSaved?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update project');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${project.name}"? All tasks under this project keep their data but lose the project link.`)) return;
    setSaving(true);
    try {
      await axios.delete(`${API}/projects/${project.id}`, { headers: getAuthHeaders() });
      toast.success('Project deleted');
      window.location.href = '/admin/projects';
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to delete');
      setSaving(false);
    }
  };

  const filteredUsers = memberSearch
    ? users.filter(u =>
        (u.name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(memberSearch.toLowerCase())
      )
    : users;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start md:items-center justify-center p-0 md:p-6 overflow-y-auto"
      onClick={onClose}
      data-testid="edit-project-modal"
    >
      <div
        className="bg-white w-full md:max-w-lg md:rounded-2xl shadow-2xl overflow-hidden my-0 md:my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Edit Project</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded" data-testid="edit-project-close">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Project name"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            data-testid="edit-project-name"
          />
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Description"
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            data-testid="edit-project-description"
          />

          <div>
            <p className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase mb-1.5">Color</p>
            <div className="flex gap-2">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-900 border-white' : 'border-white'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase mb-1.5">Lead</p>
              <UserPicker
                users={users}
                value={form.lead_id}
                onChange={id => setForm({ ...form, lead_id: id })}
                currentUser={currentUser}
                placeholder="Select project lead"
                testid="edit-project-lead-picker"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase mb-1.5">Status</p>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                data-testid="edit-project-status"
              >
                {PROJECT_STATUSES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase mb-1.5">Start date</p>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                data-testid="edit-project-start-date"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase mb-1.5">End date</p>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                data-testid="edit-project-end-date"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                Members <span className="text-slate-400">({form.member_ids.length})</span>
              </p>
              <input
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Search…"
                className="text-xs px-2 py-1 border border-slate-200 rounded"
                data-testid="edit-project-member-search"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">No users found</div>
              ) : filteredUsers.map(u => (
                <label
                  key={u.id}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${form.member_ids.includes(u.id) ? 'bg-blue-50/60' : ''}`}
                  data-testid={`edit-project-member-${u.id}`}
                >
                  <input
                    type="checkbox"
                    checked={form.member_ids.includes(u.id)}
                    onChange={() => toggleMember(u.id)}
                    className="accent-blue-600"
                  />
                  <span className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{u.name}</div>
                    {u.email && <div className="text-[10px] text-slate-400 truncate">{u.email}</div>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={handleDelete}
            disabled={saving}
            className="text-xs px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"
            data-testid="edit-project-delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              data-testid="edit-project-cancel"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              data-testid="edit-project-save"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
