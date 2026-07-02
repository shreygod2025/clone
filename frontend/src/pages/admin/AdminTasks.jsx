import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus, Calendar, User as UserIcon, Flag, Trash2, X, Filter, Search,
  CheckCircle2, Circle, Clock, MessageSquare, ChevronDown, ChevronRight,
  Check, XCircle, Send, ListChecks
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_META = {
  pending:            { label: 'Pending',     icon: Circle,        color: 'text-slate-500', bg: 'bg-slate-100', pill: 'bg-slate-100 text-slate-700' },
  in_progress:        { label: 'In Progress', icon: Clock,         color: 'text-blue-600',  bg: 'bg-blue-100',  pill: 'bg-blue-100 text-blue-700' },
  pending_approval:   { label: 'Pending Approval', icon: Send,     color: 'text-amber-600', bg: 'bg-amber-100', pill: 'bg-amber-100 text-amber-700' },
  completed:          { label: 'Completed',   icon: CheckCircle2,  color: 'text-green-600', bg: 'bg-green-100', pill: 'bg-green-100 text-green-700' },
  rejected:           { label: 'Rejected',    icon: XCircle,       color: 'text-red-600',   bg: 'bg-red-100',   pill: 'bg-red-100 text-red-700' },
};

const PRIORITY_META = {
  low:    { label: 'Low',    dot: 'bg-slate-300' },
  medium: { label: 'Medium', dot: 'bg-blue-500' },
  high:   { label: 'High',   dot: 'bg-amber-500' },
  urgent: { label: 'Urgent', dot: 'bg-red-500' },
};

const fmtDate = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }
  catch { return ''; }
};

const isOverdue = (t) => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date();

// ── Searchable assignee combo ────────────────────────────────────────────────
const AssigneeCombo = ({ value, onChange, users, currentUserId, testId = 'task-assignee-combo' }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selected = users.find(u => u.id === value);
  const filtered = useMemo(() => {
    if (!q.trim()) return users;
    const s = q.toLowerCase();
    return users.filter(u => u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s));
  }, [q, users]);

  return (
    <div className="relative" ref={boxRef} data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 border rounded-lg text-sm text-left flex items-center justify-between bg-white hover:border-slate-400"
      >
        <span className="truncate">
          {selected ? selected.name : <span className="text-slate-400">Search & assign…</span>}
          {selected?.id === currentUserId && <span className="text-xs text-blue-600 ml-1">(you)</span>}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-64 overflow-hidden flex flex-col">
          <div className="p-2 border-b sticky top-0 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search name or email…"
                className="w-full pl-8 pr-3 py-1.5 border rounded-md text-sm outline-none focus:ring-1 focus:ring-slate-400"
                data-testid={`${testId}-search`}
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 && <p className="p-3 text-xs text-slate-400 text-center">No matches</p>}
            {filtered.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => { onChange(u.id); setOpen(false); setQ(''); }}
                className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-sm ${u.id === value ? 'bg-blue-50' : ''}`}
                data-testid={`${testId}-option-${u.id}`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{u.name}{u.id === currentUserId && <span className="ml-1 text-xs text-blue-600">(you)</span>}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                {u.id === value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
const AdminTasks = () => {
  const { user, getAuthHeaders } = useAuth();
  const isAdmin = user?.role === 'admin';
  const currentUserId = user?.id;

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(isAdmin ? 'team' : 'my');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [searchParams, setSearchParams] = useSearchParams();

  const emptyForm = () => ({
    title: '', description: '',
    assigned_to: currentUserId || '',   // Default to SELF
    priority: 'medium',
    due_date: '', project_id: '', tags: '',
    parent_task_id: null,
  });
  const [form, setForm] = useState(emptyForm());

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/tasks?filter=${filter}`, { headers: getAuthHeaders() });
      setTasks(res.data || []);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  }, [filter, getAuthHeaders]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Auto-open create modal when navigated with ?new=1 (e.g. from Dashboard)
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setForm(emptyForm());
      setShowCreate(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    axios.get(`${API}/team-users`, { headers: getAuthHeaders() })
      .then(r => {
        const list = r.data || [];
        // Include current admin (from admins collection) if not already in team_users
        if (currentUserId && !list.find(u => u.id === currentUserId)) {
          list.unshift({ id: currentUserId, name: user?.name || 'Me (Admin)', email: user?.email || '' });
        }
        // Put self first for quicker access
        list.sort((a, b) => (a.id === currentUserId ? -1 : b.id === currentUserId ? 1 : 0));
        setUsers(list);
      })
      .catch(() => {});
    axios.get(`${API}/projects`, { headers: getAuthHeaders() })
      .then(r => setProjects(r.data || []))
      .catch(() => {});
  }, [getAuthHeaders, currentUserId, user]);

  const openCreate = (parent = null) => {
    setForm({ ...emptyForm(), parent_task_id: parent?.id || null, project_id: parent?.project_id || '' });
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.assigned_to) {
      toast.error('Title and assignee are required'); return;
    }
    try {
      const body = {
        title: form.title.trim(),
        description: form.description,
        assigned_to: form.assigned_to,
        priority: form.priority,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        project_id: form.project_id || null,
        parent_task_id: form.parent_task_id || null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      await axios.post(`${API}/tasks`, body, { headers: getAuthHeaders() });
      toast.success(form.parent_task_id ? 'Sub-task created' : 'Task created');
      setShowCreate(false);
      setForm(emptyForm());
      loadTasks();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const updateStatus = async (task, status) => {
    try {
      await axios.patch(`${API}/tasks/${task.id}`, { status }, { headers: getAuthHeaders() });
      loadTasks();
      if (detailTask?.id === task.id) setDetailTask({ ...detailTask, status });
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await axios.delete(`${API}/tasks/${task.id}`, { headers: getAuthHeaders() });
      toast.success('Deleted');
      loadTasks();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
    if (query.trim()) {
      const s = query.toLowerCase();
      list = list.filter(t =>
        t.title?.toLowerCase().includes(s) ||
        t.code?.toLowerCase().includes(s) ||
        t.assigned_to_name?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [tasks, statusFilter, query]);

  const filterOptions = isAdmin
    ? [{ v: 'team', l: 'All Team' }, { v: 'my', l: 'Assigned to me' }, { v: 'by_me', l: 'Assigned by me' }]
    : [{ v: 'my', l: 'Assigned to me' }, { v: 'by_me', l: 'Assigned by me' }, { v: 'team', l: 'My direct reports' }];

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-4" data-testid="admin-tasks-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tasks</h1>
            <p className="text-sm text-slate-500">Assign, track & complete work across your team.</p>
          </div>
          <button
            onClick={() => openCreate(null)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800"
            data-testid="new-task-btn"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 bg-white border rounded-lg p-2">
          <div className="flex items-center gap-1.5 text-sm px-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="bg-transparent outline-none text-sm" data-testid="tasks-filter-select">
              {filterOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-1 text-sm px-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              data-testid="status-tab-all"
            >All</button>
            {Object.entries(STATUS_META).map(([k, m]) => (
              <button
                key={k}
                onClick={() => setStatusFilter(k)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusFilter === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                data-testid={`status-tab-${k}`}
              >{m.label}</button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search tasks…"
              className="pl-8 pr-3 py-1.5 border rounded-lg text-sm w-56 outline-none focus:ring-1 focus:ring-slate-400"
              data-testid="tasks-search-input"
            />
          </div>
        </div>

        {/* List view */}
        <div className="bg-white border rounded-xl overflow-hidden" data-testid="tasks-list">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading…</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              No tasks match your filters. <button onClick={() => openCreate(null)} className="text-blue-600 hover:underline">Create one</button>.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50 border-b">
                  <th className="w-8 py-2.5 px-3"></th>
                  <th className="py-2.5 px-3">Task</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Assignee</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Priority</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Due</th>
                  <th className="py-2.5 px-3 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(t => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    expanded={expandedIds.has(t.id)}
                    onToggle={() => toggleExpand(t.id)}
                    onOpen={() => setDetailTask(t)}
                    onDelete={() => deleteTask(t)}
                    onStatus={(s) => updateStatus(t, s)}
                    onAddSubtask={() => openCreate(t)}
                    getAuthHeaders={getAuthHeaders}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create modal */}
        {showCreate && (
          <TaskCreateModal
            form={form}
            setForm={setForm}
            users={users}
            projects={projects}
            currentUserId={currentUserId}
            onClose={() => { setShowCreate(false); setForm(emptyForm()); }}
            onSubmit={handleCreate}
          />
        )}

        {/* Detail modal */}
        {detailTask && (
          <TaskDetailModal
            task={detailTask}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onClose={() => { setDetailTask(null); loadTasks(); }}
            onStatus={(s) => updateStatus(detailTask, s)}
            getAuthHeaders={getAuthHeaders}
          />
        )}
      </div>
    </AdminLayout>
  );
};

// ── Row ──────────────────────────────────────────────────────────────────────
const TaskRow = ({ task, expanded, onToggle, onOpen, onDelete, onStatus, onAddSubtask, getAuthHeaders }) => {
  const S = STATUS_META[task.status] || STATUS_META.pending;
  const overdue = isOverdue(task);
  const hasSubtasks = (task.subtask_total || 0) > 0;
  const [subtasks, setSubtasks] = useState([]);

  useEffect(() => {
    if (expanded && hasSubtasks) {
      axios.get(`${API}/tasks/${task.id}/subtasks`, { headers: getAuthHeaders() })
        .then(r => setSubtasks(r.data || []))
        .catch(() => {});
    }
  }, [expanded, hasSubtasks, task.id, getAuthHeaders]);

  const nextStatus = task.status === 'pending' ? 'in_progress'
    : task.status === 'in_progress' ? 'completed'
    : task.status === 'rejected' ? 'in_progress'
    : null;
  const nextLabel = task.status === 'pending' ? 'Start'
    : task.status === 'in_progress' ? 'Complete'
    : task.status === 'rejected' ? 'Retry'
    : null;

  return (
    <>
      <tr className="border-b hover:bg-slate-50" data-testid={`task-row-${task.id}`}>
        <td className="py-2 px-3">
          {hasSubtasks ? (
            <button onClick={onToggle} className="p-1 hover:bg-slate-100 rounded"
              data-testid={`task-expand-${task.id}`}>
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : <span className="inline-block w-6" />}
        </td>
        <td className="py-2 px-3">
          <button onClick={onOpen} className="text-left">
            <p className="font-medium text-slate-900 leading-tight">{task.title}</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              {task.code}
              {hasSubtasks && (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <ListChecks className="w-3 h-3" /> {task.subtask_done}/{task.subtask_total}
                </span>
              )}
              {task.comment_count > 0 && (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <MessageSquare className="w-3 h-3" /> {task.comment_count}
                </span>
              )}
            </p>
          </button>
        </td>
        <td className="py-2 px-3 hidden md:table-cell">
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
            {task.assigned_to_name || '—'}
          </span>
        </td>
        <td className="py-2 px-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${S.pill}`}>
            <S.icon className="w-3 h-3" /> {S.label}
          </span>
        </td>
        <td className="py-2 px-3 hidden md:table-cell">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className={`w-2 h-2 rounded-full ${PRIORITY_META[task.priority]?.dot}`} />
            {PRIORITY_META[task.priority]?.label}
          </span>
        </td>
        <td className="py-2 px-3 hidden md:table-cell">
          <span className={`inline-flex items-center gap-1 text-xs ${overdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
            <Calendar className="w-3 h-3" /> {fmtDate(task.due_date) || '—'}
            {overdue && ' · overdue'}
          </span>
        </td>
        <td className="py-2 px-3 text-right whitespace-nowrap">
          {nextStatus && (
            <button
              onClick={() => onStatus(nextStatus)}
              className="text-xs font-medium text-blue-600 hover:underline mr-2"
              data-testid={`task-advance-${task.id}`}
            >{nextLabel}</button>
          )}
          <button
            onClick={onAddSubtask}
            title="Add sub-task"
            className="text-xs text-slate-500 hover:text-slate-900 mr-2"
            data-testid={`task-subtask-${task.id}`}
          >+ Sub</button>
          <button
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-red-600"
            data-testid={`task-delete-${task.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
      {expanded && subtasks.map(st => (
        <tr key={st.id} className="bg-slate-50/50 border-b text-xs" data-testid={`task-subtask-row-${st.id}`}>
          <td colSpan={2} className="py-1.5 pl-12 pr-3">
            <span className="text-slate-400 font-mono mr-2">{st.code}</span>
            {st.title}
          </td>
          <td className="py-1.5 px-3 hidden md:table-cell">{st.assigned_to_name || '—'}</td>
          <td className="py-1.5 px-3">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_META[st.status]?.pill}`}>
              {STATUS_META[st.status]?.label}
            </span>
          </td>
          <td colSpan={3} className="py-1.5 px-3 text-slate-500">{fmtDate(st.due_date)}</td>
        </tr>
      ))}
    </>
  );
};

// ── Create modal ─────────────────────────────────────────────────────────────
const TaskCreateModal = ({ form, setForm, users, projects, currentUserId, onClose, onSubmit }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="new-task-modal">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">
          {form.parent_task_id ? 'Create Sub-Task' : 'Create Task'}
        </h2>
        <button onClick={onClose}><X className="w-5 h-5" /></button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Title *</label>
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" data-testid="task-title-input" autoFocus />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm min-h-[80px]" placeholder="Details, links, context…" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">
            Assign to * <span className="text-slate-400 font-normal">(default: yourself)</span>
          </label>
          <AssigneeCombo value={form.assigned_to}
            onChange={(id) => setForm({ ...form, assigned_to: id })}
            users={users} currentUserId={currentUserId} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Priority</label>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" data-testid="task-priority-select">
              {Object.entries(PRIORITY_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Due date</label>
            <input type="datetime-local" value={form.due_date}
              onChange={e => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" data-testid="task-duedate-input" />
          </div>
        </div>
        {!form.parent_task_id && (
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Project</label>
            <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Tags</label>
          <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="comma-separated e.g. urgent, cms" />
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <button onClick={onClose}
          className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">Cancel</button>
        <button onClick={onSubmit}
          className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800"
          data-testid="task-submit-btn">Create</button>
      </div>
    </div>
  </div>
);

// ── Detail modal (comments + approval) ───────────────────────────────────────
const TaskDetailModal = ({ task, currentUserId, isAdmin, onClose, onStatus, getAuthHeaders }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    axios.get(`${API}/tasks/${task.id}/comments`, { headers: getAuthHeaders() })
      .then(r => setComments(r.data || []))
      .catch(() => {});
  }, [task.id, getAuthHeaders]);

  const postComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await axios.post(`${API}/tasks/${task.id}/comments`, { message: newComment.trim() }, { headers: getAuthHeaders() });
      setComments(prev => [...prev, res.data]);
      setNewComment('');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const submit = async () => {
    try {
      await axios.post(`${API}/tasks/${task.id}/submit`, {}, { headers: getAuthHeaders() });
      toast.success('Submitted for approval');
      onClose();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };
  const approve = async () => {
    try {
      await axios.post(`${API}/tasks/${task.id}/approve`, {}, { headers: getAuthHeaders() });
      toast.success('Approved & completed');
      onClose();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };
  const reject = async () => {
    try {
      await axios.post(`${API}/tasks/${task.id}/reject`, { reason }, { headers: getAuthHeaders() });
      toast.success('Rejected');
      onClose();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const canSubmit  = currentUserId === task.assigned_to && ['pending', 'in_progress', 'rejected'].includes(task.status);
  const canApprove = (isAdmin || currentUserId === task.assigned_by) && task.status === 'pending_approval';

  const S = STATUS_META[task.status] || STATUS_META.pending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="task-detail-modal">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-xs font-mono text-slate-400 mb-1">{task.code}</p>
            <h2 className="text-xl font-bold text-slate-900">{task.title}</h2>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${S.pill}`}>
                <S.icon className="w-3 h-3" /> {S.label}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-600">Assignee: <span className="font-medium">{task.assigned_to_name || '—'}</span></span>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {task.description && <p className="text-sm text-slate-600 mb-4 whitespace-pre-wrap">{task.description}</p>}
        {task.rejection_reason && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-4">
            <strong>Rejected:</strong> {task.rejection_reason}
          </div>
        )}

        {/* Approval buttons */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {canSubmit && (
            <button onClick={submit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200"
              data-testid="task-submit-approval-btn">
              <Send className="w-3.5 h-3.5" /> Submit for approval
            </button>
          )}
          {canApprove && (
            <>
              <button onClick={approve}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                data-testid="task-approve-btn">
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
              <button onClick={() => setRejectOpen(o => !o)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                data-testid="task-reject-btn">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </>
          )}
        </div>
        {rejectOpen && canApprove && (
          <div className="p-3 border rounded-lg mb-4 bg-red-50/50">
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Reason for rejection…"
              className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] mb-2" />
            <button onClick={reject}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              data-testid="task-reject-confirm-btn">Confirm rejection</button>
          </div>
        )}

        {/* Comments */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" /> Comments ({comments.length})
          </h3>
          <div className="space-y-2 mb-3 max-h-56 overflow-y-auto">
            {comments.length === 0 && <p className="text-xs text-slate-400 italic">No comments yet.</p>}
            {comments.map(c => (
              <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg" data-testid={`comment-${c.id}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-700">{c.user_name || 'User'}</span>
                  <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && postComment()}
              placeholder="Write a comment…"
              className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-slate-400"
              data-testid="comment-input" />
            <button onClick={postComment}
              className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800"
              data-testid="comment-send-btn">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTasks;
