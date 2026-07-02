import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import {
  Plus, Calendar, User as UserIcon, Flag, Trash2, X, ChevronDown, Filter,
  CheckCircle2, Circle, Clock, AlertCircle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_META = {
  pending:      { label: 'Pending',     icon: Circle,        color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
  in_progress:  { label: 'In Progress', icon: Clock,         color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200' },
  completed:    { label: 'Completed',   icon: CheckCircle2,  color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
};

const PRIORITY_META = {
  low:    { label: 'Low',    color: 'text-slate-500', bg: 'bg-slate-100' },
  medium: { label: 'Medium', color: 'text-blue-600',  bg: 'bg-blue-100' },
  high:   { label: 'High',   color: 'text-amber-600', bg: 'bg-amber-100' },
  urgent: { label: 'Urgent', color: 'text-red-600',   bg: 'bg-red-100' },
};

const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch { return ''; }
};

const isOverdue = (task) => {
  if (task.status === 'completed' || !task.due_date) return false;
  return new Date(task.due_date) < new Date();
};

const AdminTasks = () => {
  const { user, getAuthHeaders } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(isAdmin ? 'team' : 'my');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', assigned_to: '', priority: 'medium',
    due_date: '', project_id: '', tags: '',
  });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/tasks?filter=${filter}`, { headers: getAuthHeaders() });
      setTasks(res.data || []);
    } catch {
      toast.error('Failed to load tasks');
    } finally { setLoading(false); }
  }, [filter, getAuthHeaders]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    axios.get(`${API}/team-users`, { headers: getAuthHeaders() })
      .then(r => setUsers(r.data || []))
      .catch(() => {});
    axios.get(`${API}/projects`, { headers: getAuthHeaders() })
      .then(r => setProjects(r.data || []))
      .catch(() => {});
  }, [getAuthHeaders]);

  const resetForm = () => setForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '', project_id: '', tags: '' });

  const handleCreate = async () => {
    if (!form.title.trim() || !form.assigned_to) {
      toast.error('Title and assignee are required');
      return;
    }
    try {
      const body = {
        title: form.title.trim(),
        description: form.description,
        assigned_to: form.assigned_to,
        priority: form.priority,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        project_id: form.project_id || null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      await axios.post(`${API}/tasks`, body, { headers: getAuthHeaders() });
      toast.success('Task created');
      setShowCreate(false);
      resetForm();
      loadTasks();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create task');
    }
  };

  const updateStatus = async (task, status) => {
    try {
      await axios.patch(`${API}/tasks/${task.id}`, { status }, { headers: getAuthHeaders() });
      loadTasks();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update');
    }
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await axios.delete(`${API}/tasks/${task.id}`, { headers: getAuthHeaders() });
      toast.success('Task deleted');
      loadTasks();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to delete');
    }
  };

  const columns = [
    { key: 'pending',      title: 'Pending' },
    { key: 'in_progress',  title: 'In Progress' },
    { key: 'completed',    title: 'Completed' },
  ];

  const filterOptions = isAdmin
    ? [{ v: 'team', l: 'All Team' }, { v: 'my', l: 'Assigned to me' }, { v: 'by_me', l: 'Assigned by me' }]
    : [{ v: 'my', l: 'Assigned to me' }, { v: 'by_me', l: 'Assigned by me' }, { v: 'team', l: 'My direct reports' }];

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" data-testid="admin-tasks-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tasks</h1>
            <p className="text-sm text-slate-500">Assign, track & complete work across your team.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border rounded-lg px-2 py-1.5 text-sm">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-transparent outline-none text-sm"
                data-testid="tasks-filter-select"
              >
                {filterOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800"
              data-testid="new-task-btn"
            >
              <Plus className="w-4 h-4" /> New Task
            </button>
          </div>
        </div>

        {/* Kanban board */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="tasks-board">
            {columns.map(col => {
              const items = tasks.filter(t => t.status === col.key);
              const Meta = STATUS_META[col.key];
              return (
                <div key={col.key} className={`rounded-xl border p-3 ${Meta.bg}`} data-testid={`tasks-column-${col.key}`}>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Meta.icon className={`w-4 h-4 ${Meta.color}`} /> {col.title}
                    </div>
                    <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2 min-h-[100px]">
                    {items.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6 italic">No tasks</p>
                    )}
                    {items.map(t => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onStatusChange={(s) => updateStatus(t, s)}
                        onDelete={() => deleteTask(t)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()} data-testid="new-task-modal">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Create Task</h2>
                <button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <input
                  type="text" placeholder="Title *"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" data-testid="task-title-input"
                />
                <textarea
                  placeholder="Description"
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm min-h-[80px]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm" data-testid="task-assignee-select"
                  >
                    <option value="">Assign to *</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <select
                    value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm" data-testid="task-priority-select"
                  >
                    {Object.entries(PRIORITY_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="datetime-local"
                    value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm" data-testid="task-duedate-input"
                  />
                  <select
                    value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">No project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <input
                  type="text" placeholder="Tags (comma-separated)"
                  value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => { setShowCreate(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreate}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800"
                  data-testid="task-submit-btn">
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

const TaskCard = ({ task, onStatusChange, onDelete }) => {
  const overdue = isOverdue(task);
  const p = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const nextStatus = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : 'pending';
  const nextLabel  = task.status === 'pending' ? 'Start' : task.status === 'in_progress' ? 'Complete' : 'Reopen';

  return (
    <Card className="p-3 bg-white hover:shadow-sm transition-shadow border" data-testid={`task-card-${task.id}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-mono">{task.code}</p>
          <p className="font-medium text-sm text-slate-900 leading-snug">{task.title}</p>
        </div>
        <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-600" title="Delete" data-testid={`task-delete-${task.id}`}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {task.description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{task.description}</p>}
      <div className="flex flex-wrap items-center gap-1.5 mb-2 text-[10px]">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium ${p.bg} ${p.color}`}>
          <Flag className="w-2.5 h-2.5" /> {p.label}
        </span>
        {task.due_date && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium ${overdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
            <Calendar className="w-2.5 h-2.5" /> {fmtDate(task.due_date)}{overdue && ' • overdue'}
          </span>
        )}
        {(task.tags || []).slice(0, 2).map(tag => (
          <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">#{tag}</span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs pt-2 border-t">
        <span className="inline-flex items-center gap-1 text-slate-600">
          <UserIcon className="w-3 h-3" /> {task.assigned_to_name || '—'}
        </span>
        <button
          onClick={() => onStatusChange(nextStatus)}
          className="text-xs font-medium text-blue-600 hover:underline"
          data-testid={`task-advance-${task.id}`}
        >
          {nextLabel}
        </button>
      </div>
    </Card>
  );
};

export default AdminTasks;
