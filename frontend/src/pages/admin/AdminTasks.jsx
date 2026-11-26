import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from './AdminDashboard';
import TaskCreateModal, { AttachmentsPanel } from '../../components/tasks/TaskCreateModal';
import { useAuth } from '../../context/AuthContext';
import { celebrateTaskComplete } from '../../lib/celebrate';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus, Calendar, Trash2, X, Search,
  CheckCircle2, Circle, Clock, MessageSquare, ChevronDown, ChevronRight,
  Check, XCircle, Send, ListChecks, Link2, MoreHorizontal, AlertCircle,
  Sparkles, Paperclip, FileText, Edit2, Play, Mail
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_META = {
  pending:          { label: 'Pending',          icon: Circle,       pill: 'bg-slate-100 text-slate-700', ring: 'ring-slate-300', dot: 'bg-slate-400' },
  in_progress:      { label: 'In Progress',      icon: Clock,        pill: 'bg-blue-100 text-blue-700',   ring: 'ring-blue-300',  dot: 'bg-blue-500' },
  pending_approval: { label: 'Pending Approval', icon: Send,         pill: 'bg-amber-100 text-amber-700', ring: 'ring-amber-300', dot: 'bg-amber-500' },
  completed:        { label: 'Completed',        icon: CheckCircle2, pill: 'bg-green-100 text-green-700', ring: 'ring-green-300', dot: 'bg-green-500' },
  rejected:         { label: 'Rejected',         icon: XCircle,      pill: 'bg-red-100 text-red-700',     ring: 'ring-red-300',   dot: 'bg-red-500' },
};

const PRIORITY_META = {
  low:    { label: 'Low',    dot: 'bg-slate-300',  text: 'text-slate-500' },
  medium: { label: 'Medium', dot: 'bg-blue-500',   text: 'text-blue-600' },
  high:   { label: 'High',   dot: 'bg-amber-500',  text: 'text-amber-600' },
  urgent: { label: 'Urgent', dot: 'bg-red-500',    text: 'text-red-600' },
};

const AVATAR_COLORS = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500',
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500',
];

const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

const avatarColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
};

const fmtDate = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }
  catch { return ''; }
};

const isOverdue = (t) => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date();

// ── Avatar chip ──────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 'sm' }) => {
  const dim = size === 'xs' ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-[11px]';
  return (
    <div className={`${dim} ${avatarColor(name)} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}
      title={name || 'Unassigned'}>
      {initials(name)}
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
const AdminTasks = ({ embedded = false }) => {
  const { user, getAuthHeaders } = useAuth();
  const isAdmin = user?.role === 'admin';
  const currentUserId = user?.id;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(isAdmin ? 'team' : 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default'); // default | latest_completed | oldest_completed
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [searchParams, setSearchParams] = useSearchParams();
  const [subTaskParent, setSubTaskParent] = useState(null);
  const [groupByStatus, setGroupByStatus] = useState(true);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const assigneeFilter = searchParams.get('assignee') || '';
      const url = assigneeFilter
        ? `${API}/tasks?filter=team&assignee=${assigneeFilter}`
        : `${API}/tasks?filter=${filter}`;
      const res = await axios.get(url, { headers: getAuthHeaders() });
      setTasks(res.data || []);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  }, [filter, getAuthHeaders, searchParams]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowCreate(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = (parent = null) => {
    setSubTaskParent(parent);
    setShowCreate(true);
  };

  const updateStatus = async (task, status) => {
    if (status === '__reload__') {
      loadTasks();
      if (detailTask?.id === task?.id) setDetailTask(null);
      return;
    }
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

  const PRIORITY_WEIGHT = { urgent: 4, high: 3, medium: 2, low: 1 };
  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
    if (query.trim()) {
      const s = query.toLowerCase();
      list = list.filter(t =>
        t.title?.toLowerCase().includes(s) ||
        t.description?.toLowerCase().includes(s) ||
        t.assigned_to_name?.toLowerCase().includes(s)
      );
    }
    // Completion-time based sorts — when the user wants to review what got
    // finished recently (or the earliest wins in a range). Tasks without a
    // completed_at fall to the bottom in both directions so incomplete work
    // never crowds out the completed list.
    if (sortBy === 'latest_completed' || sortBy === 'oldest_completed') {
      const dir = sortBy === 'latest_completed' ? -1 : 1;
      return [...list].sort((a, b) => {
        const at = a.completed_at ? new Date(a.completed_at).getTime() : null;
        const bt = b.completed_at ? new Date(b.completed_at).getTime() : null;
        if (at === null && bt === null) return 0;
        if (at === null) return 1;      // a has no completion → push down
        if (bt === null) return -1;     // b has no completion → push down
        return (at - bt) * dir;
      });
    }
    // Default sort: earliest due_date first (nulls last), then priority DESC
    const sorted = [...list].sort((a, b) => {
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      const aP = PRIORITY_WEIGHT[a.priority] || 0;
      const bP = PRIORITY_WEIGHT[b.priority] || 0;
      return bP - aP;
    });
    return sorted;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, statusFilter, query, sortBy]);

  const counts = useMemo(() => {
    const c = { all: tasks.length };
    Object.keys(STATUS_META).forEach(k => { c[k] = tasks.filter(t => t.status === k).length; });
    return c;
  }, [tasks]);

  const grouped = useMemo(() => {
    const order = ['pending_approval', 'in_progress', 'pending', 'rejected', 'completed'];
    const g = {};
    order.forEach(k => { g[k] = []; });
    filteredTasks.forEach(t => { (g[t.status] || (g[t.status] = [])).push(t); });
    return order.map(k => ({ key: k, tasks: g[k] })).filter(g => g.tasks.length > 0);
  }, [filteredTasks]);

  const filterOptions = isAdmin
    ? [{ v: 'team', l: 'All Team' }, { v: 'my', l: 'Assigned to me' }, { v: 'by_me', l: 'Assigned by me' }]
    : [{ v: 'all', l: 'All Tasks' }, { v: 'my', l: 'Assigned to me' }, { v: 'by_me', l: 'Assigned by me' }];

  const body = (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5" data-testid="admin-tasks-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Mission Control</p>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Tasks</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {counts.all} total • <span className="text-blue-600 font-medium">{counts.in_progress}</span> in progress
              {counts.pending_approval > 0 && <> • <span className="text-amber-600 font-medium">{counts.pending_approval}</span> awaiting approval</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={async () => {
                  if (!window.confirm('Email every assignee with overdue tasks right now?')) return;
                  try {
                    const { data } = await axios.post(
                      `${API}/admin/tasks/send-reminders-overdue`,
                      {},
                      { headers: getAuthHeaders() },
                    );
                    if (data.overdue_tasks_total === 0) {
                      toast.success('No overdue tasks — your team is on top of things.');
                    } else {
                      toast.success(
                        `Nudged ${data.assignees_notified} assignee${data.assignees_notified === 1 ? '' : 's'} (${data.overdue_tasks_total} overdue tasks)`,
                      );
                    }
                    loadTasks();
                  } catch (e) {
                    toast.error(e.response?.data?.detail || 'Could not send reminders');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-sm font-medium transition-colors"
                title="Email every assignee with at least one overdue task"
                data-testid="nudge-all-overdue-btn"
              >
                <Mail className="w-4 h-4" /> Nudge Overdue
              </button>
            )}
            <button
              onClick={() => openCreate(null)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium shadow-sm shadow-blue-500/20 transition-colors"
              data-testid="new-task-btn"
            >
              <Plus className="w-4 h-4" /> New Task
            </button>
          </div>
        </div>

        {/* Toolbar: Scope + Status chips + Search */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
          {/* Scope pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {filterOptions.map(o => (
              <button
                key={o.v}
                onClick={() => setFilter(o.v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === o.v
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                data-testid={`scope-${o.v}`}
              >
                {o.l}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => setGroupByStatus(v => !v)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:bg-slate-100"
              data-testid="toggle-group"
            >
              {groupByStatus ? 'Ungroup' : 'Group by status'}
            </button>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Status chips + Search */}
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusChip label="All" count={counts.all} active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')} testid="status-tab-all" />
            {Object.entries(STATUS_META).map(([k, m]) => (
              <StatusChip
                key={k}
                label={m.label}
                count={counts[k]}
                active={statusFilter === k}
                onClick={() => setStatusFilter(k)}
                dot={m.dot}
                testid={`status-tab-${k}`}
              />
            ))}
            <div className="flex-1" />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 appearance-none cursor-pointer transition-all font-medium text-slate-700"
                  data-testid="tasks-sort-select"
                  title="Sort tasks"
                >
                  <option value="default">Sort: Default (Due date)</option>
                  <option value="latest_completed">Sort: Latest Completed</option>
                  <option value="oldest_completed">Sort: Oldest Completed</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search tasks…"
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-full outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                  data-testid="tasks-search-input"
                />
              </div>
            </div>
          </div>

          {/* Hidden select for tests / a11y fallback */}
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="sr-only" data-testid="tasks-filter-select">
            {filterOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>

        {/* List view */}
        <div data-testid="tasks-list">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl py-12">
              <LoadingSpinner text="Loading tasks…" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-3">
                <ListChecks className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 mb-1">No tasks match your filters</p>
              <button onClick={() => openCreate(null)}
                className="text-sm text-blue-600 hover:underline font-medium">
                Create your first task
              </button>
            </div>
          ) : (groupByStatus && sortBy === 'default') ? (
            <div className="space-y-4">
              {grouped.map(({ key, tasks: gTasks }) => (
                <StatusSection key={key} statusKey={key} tasks={gTasks}
                  expandedIds={expandedIds}
                  onToggle={toggleExpand}
                  onOpen={setDetailTask}
                  onDelete={deleteTask}
                  onStatus={updateStatus}
                  onAddSubtask={openCreate}
                  onEdit={setEditingTask}
                  getAuthHeaders={getAuthHeaders}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
              {filteredTasks.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  expanded={expandedIds.has(t.id)}
                  onToggle={() => toggleExpand(t.id)}
                  onOpen={() => setDetailTask(t)}
                  onDelete={() => deleteTask(t)}
                  onStatus={(s) => updateStatus(t, s)}
                  onAddSubtask={() => openCreate(t)}
                  onEdit={() => setEditingTask(t)}
                  getAuthHeaders={getAuthHeaders}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </div>

        {/* Create modal (shared component) */}
        <TaskCreateModal
          open={showCreate}
          onClose={() => { setShowCreate(false); setSubTaskParent(null); }}
          onCreated={() => loadTasks()}
          currentUser={user}
          parentTask={subTaskParent}
        />

        {/* Edit modal (same shared component in edit mode) */}
        <TaskCreateModal
          open={!!editingTask}
          onClose={() => setEditingTask(null)}
          onCreated={() => loadTasks()}
          currentUser={user}
          existingTask={editingTask}
        />

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
  );
  return embedded ? body : <AdminLayout>{body}</AdminLayout>;
};

// ── Status filter chip ───────────────────────────────────────────────────────
const StatusChip = ({ label, count, active, onClick, dot, testid }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
      active
        ? 'bg-slate-900 text-white border-slate-900'
        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
    }`}
    data-testid={testid}
  >
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
    {label}
    {count !== undefined && (
      <span className={`px-1.5 rounded-full text-[10px] font-semibold ${
        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
      }`}>{count}</span>
    )}
  </button>
);

// ── Status section (grouped card container) ──────────────────────────────────
const StatusSection = ({ statusKey, tasks, expandedIds, onToggle, onOpen, onDelete, onStatus, onAddSubtask, onEdit, getAuthHeaders, currentUserId, isAdmin }) => {
  const [collapsed, setCollapsed] = useState(false);
  const S = STATUS_META[statusKey];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl" data-testid={`section-${statusKey}`}>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50 rounded-t-2xl"
      >
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        <span className={`w-2 h-2 rounded-full ${S.dot}`} />
        <span className="text-sm font-semibold text-slate-800">{S.label}</span>
        <span className="text-xs text-slate-400 font-medium">{tasks.length}</span>
      </button>
      {!collapsed && (
        <div className="divide-y divide-slate-100">
          {tasks.map(t => (
            <TaskCard
              key={t.id}
              task={t}
              expanded={expandedIds.has(t.id)}
              onToggle={() => onToggle(t.id)}
              onOpen={() => onOpen(t)}
              onDelete={() => onDelete(t)}
              onStatus={(s) => onStatus(t, s)}
              onAddSubtask={() => onAddSubtask(t)}
              onEdit={() => onEdit(t)}
              getAuthHeaders={getAuthHeaders}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Task card row (the star of the redesign) ─────────────────────────────────
// ── Fixed-position dropdown menu (avoids overflow-hidden clipping) ───────────
export const FloatingMenu = ({ anchorRef, onClose, children, testid }) => {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200 });
  const popupRef = useRef(null);
  useEffect(() => {
    const anchor = anchorRef?.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    // Fall back to visible viewport center if the anchor is off-screen (hidden)
    if (r.width === 0 && r.height === 0) return;
    const width = 200;
    const left = Math.min(r.right - width, window.innerWidth - width - 8);
    setPos({ top: r.bottom + 4, left: Math.max(8, left), width });
  }, [anchorRef]);
  useEffect(() => {
    const onDown = (e) => {
      if (anchorRef?.current?.contains(e.target)) return;
      if (popupRef.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [anchorRef, onClose]);
  return (
    <div
      ref={popupRef}
      className="fixed z-[200] bg-white border border-slate-200 rounded-lg shadow-xl py-1"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
      data-testid={testid}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
};

export const TaskCard = ({ task, expanded, onToggle, onOpen, onDelete, onStatus, onAddSubtask, onEdit, getAuthHeaders, currentUserId, isAdmin }) => {
  const S = STATUS_META[task.status] || STATUS_META.pending;
  const P = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const overdue = isOverdue(task);
  const hasSubtasks = (task.subtask_total || 0) > 0;
  const [subtasks, setSubtasks] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const menuBtnRefMobile = useRef(null);

  useEffect(() => {
    if (expanded && hasSubtasks) {
      axios.get(`${API}/tasks/${task.id}/subtasks`, { headers: getAuthHeaders() })
        .then(r => setSubtasks(r.data || []))
        .catch(() => {});
    }
  }, [expanded, hasSubtasks, task.id, getAuthHeaders]);

  // Ownership: assignee is the OWNER of the task; only they can mark it complete.
  const isSelfAssigned = task.assigned_to === task.assigned_by;
  const isAssignee = currentUserId === task.assigned_to;
  const isApprover = currentUserId === task.assigned_by;
  // Deletion is restricted to the task creator (or admin). Assignees cannot
  // delete tasks assigned to them — mirrors the backend guard in tasks.py.
  const canDelete = isAdmin || isApprover;

  const completeTask = async (e) => {
    e?.stopPropagation();
    try {
      let didComplete = false;
      if (task.status === 'pending_approval' && (isApprover || isAdmin)) {
        await axios.post(`${API}/tasks/${task.id}/approve`, {}, { headers: getAuthHeaders() });
        toast.success('Approved & completed');
        didComplete = true;
      } else if (isAssignee && isSelfAssigned) {
        await axios.patch(`${API}/tasks/${task.id}`, { status: 'completed' }, { headers: getAuthHeaders() });
        toast.success('Marked complete');
        didComplete = true;
      } else if (isAssignee) {
        await axios.post(`${API}/tasks/${task.id}/submit`, {}, { headers: getAuthHeaders() });
        toast.success('Submitted for approval');
      } else {
        toast.error('Only the task owner can mark this complete');
        return;
      }
      if (didComplete) celebrateTaskComplete(e);
      onStatus('__reload__');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed');
    }
  };

  const startTask = async (e) => {
    e?.stopPropagation();
    try {
      await axios.patch(`${API}/tasks/${task.id}`, { status: 'in_progress' }, { headers: getAuthHeaders() });
      toast.success('Task in progress');
      onStatus('__reload__');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed');
    }
  };

  const canComplete = task.status !== 'completed' && (
    isAssignee ||
    (task.status === 'pending_approval' && (isApprover || isAdmin))
  );
  const canStart = task.status === 'pending' && isAssignee;
  // Anyone signed into the tasks module can edit (no more "waiting on the assignee/admin" bottleneck).
  // Reassignment stays admin-only; that's enforced at the backend PATCH endpoint.
  const canEdit = true;

  const attachmentCount = (task.attachments || []).length + (task.gdrive_link ? 1 : 0);
  const tagList = Array.isArray(task.tags) ? task.tags : [];
  const descSnippet = (task.description || '').trim().split('\n')[0].slice(0, 140);

  return (
    <div data-testid={`task-row-${task.id}`}
      className="group relative px-3 sm:px-4 py-3 hover:bg-slate-50/60 transition-colors">
      {/* ── Desktop / tablet layout (sm+) ────────────────────────────────── */}
      <div className="hidden sm:flex items-start gap-3">
        {/* Expand chevron */}
        <div className="flex items-center pt-1 w-5 shrink-0">
          {hasSubtasks && (
            <button onClick={onToggle}
              className="p-0.5 hover:bg-slate-200 rounded transition"
              data-testid={`task-expand-${task.id}`}>
              {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
            </button>
          )}
        </div>

        {/* Priority dot */}
        <div className="flex flex-col items-center pt-2 w-2 shrink-0">
          <span className={`w-2 h-2 rounded-full ${P.dot}`} title={`${P.label} priority`} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <button onClick={onOpen} className="text-left w-full block">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {task.title}
              </span>
              {task.project_name && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: (task.project_color || '#64748b') + '20',
                    color: task.project_color || '#334155',
                  }}
                  data-testid={`task-project-${task.id}`}
                  title={`Project: ${task.project_name}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.project_color || '#64748b' }} />
                  {task.project_name}
                </span>
              )}
              {overdue && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                  <AlertCircle className="w-2.5 h-2.5" /> Overdue
                </span>
              )}
            </div>

            {descSnippet && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-[70ch]">
                {descSnippet}{(task.description || '').length > 140 ? '…' : ''}
              </p>
            )}

            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
              {hasSubtasks && (
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="w-3 h-3" /> {task.subtask_done || 0}/{task.subtask_total}
                </span>
              )}
              {task.comment_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> {task.comment_count}
                </span>
              )}
              {attachmentCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> {attachmentCount}
                </span>
              )}
              {tagList.slice(0, 3).map((tg, i) => (
                <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                  {tg}
                </span>
              ))}
              {tagList.length > 3 && <span className="text-[10px] text-slate-400">+{tagList.length - 3}</span>}
            </div>
          </button>
        </div>

        {/* Due date */}
        <div className="flex items-start justify-end pt-1 w-[76px] shrink-0">
          {task.due_date && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
              overdue
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`} data-testid={`task-due-${task.id}`}>
              <Calendar className="w-3 h-3" />
              {fmtDate(task.due_date)}
            </span>
          )}
        </div>

        {/* Status pill */}
        <div className="hidden md:flex items-start justify-start pt-1 w-[130px] shrink-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${S.pill}`}>
            <S.icon className="w-3 h-3" /> {S.label}
          </span>
        </div>

        {/* Start (in-progress) button */}
        <div className="pt-1 w-[32px] shrink-0 flex justify-center">
          {canStart && (
            <button
              onClick={startTask}
              title="Start task"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 opacity-70 group-hover:opacity-100 transition-all"
              data-testid={`task-start-${task.id}`}
            >
              <Play className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Complete / approve button */}
        <div className="pt-1 w-[32px] shrink-0 flex justify-center">
          {canComplete && (
            <button
              onClick={completeTask}
              title={
                task.status === 'pending_approval' && (isApprover || isAdmin) ? 'Approve'
                : isSelfAssigned ? 'Mark complete'
                : 'Submit for approval'
              }
              className={`p-1.5 rounded-lg transition-all opacity-70 group-hover:opacity-100 hover:bg-green-50 hover:text-green-700 ${
                task.status === 'pending_approval' && (isApprover || isAdmin) ? 'text-amber-600 opacity-100' : 'text-slate-400'
              }`}
              data-testid={`task-complete-${task.id}`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
          )}
          {isAdmin && task.status !== 'completed' && task.status !== 'cancelled' && task.assigned_to !== currentUserId && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const { data } = await axios.post(
                    `${API}/admin/tasks/${task.id}/send-reminder`,
                    {},
                    { headers: getAuthHeaders() },
                  );
                  toast.success(`Reminder sent to ${data.to}`);
                } catch (err) {
                  toast.error(err.response?.data?.detail || 'Could not send reminder');
                }
              }}
              title={task.last_manual_reminder_at
                ? `Send another reminder (last sent ${new Date(task.last_manual_reminder_at).toLocaleString()})`
                : 'Send reminder email to assignee'}
              className="p-1.5 rounded-lg transition-all opacity-70 group-hover:opacity-100 text-slate-400 hover:bg-amber-50 hover:text-amber-700"
              data-testid={`task-remind-${task.id}`}
            >
              <Mail className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Assignee */}
        <div className="flex items-center gap-2 pt-0.5 w-[180px] shrink-0">
          <Avatar name={task.assigned_to_name} />
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-semibold text-slate-800 truncate" title={task.assigned_to_name}>
              {task.assigned_to_name || 'Unassigned'}
              {task.assigned_to === currentUserId && <span className="text-[10px] text-blue-600 font-medium ml-1">(you)</span>}
            </p>
            {task.assigned_by_name && task.assigned_by !== task.assigned_to && (
              <p className="text-[10px] text-slate-400 truncate" title={`Assigned by ${task.assigned_by_name}`}>
                by {task.assigned_by === currentUserId ? 'you' : task.assigned_by_name}
              </p>
            )}
          </div>
        </div>

        {/* 3-dot menu */}
        <div className="pt-1 w-[28px] shrink-0">
          <button
            ref={menuBtnRef}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
            className="p-1 rounded hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid={`task-menu-${task.id}`}
          >
            <MoreHorizontal className="w-4 h-4 text-slate-500" />
          </button>
          {menuOpen && (
            <FloatingMenu anchorRef={menuBtnRef} onClose={() => setMenuOpen(false)} testid={`task-menu-popup-${task.id}`}>
              {canEdit && onEdit && (
                <button
                  onClick={() => { setMenuOpen(false); onEdit(); }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  data-testid={`task-edit-${task.id}`}
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit task
                </button>
              )}
              <button
                onClick={() => { setMenuOpen(false); onAddSubtask(); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                data-testid={`task-subtask-${task.id}`}
              >
                <Plus className="w-3.5 h-3.5" /> Add sub-task
              </button>
              <button
                onClick={() => { setMenuOpen(false); onOpen(); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Open detail
              </button>
              {isAdmin && (
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    try {
                      const { data } = await axios.post(
                        `${API}/admin/tasks/${task.id}/send-reminder`,
                        {},
                        { headers: getAuthHeaders() },
                      );
                      toast.success(`Reminder emailed to ${data.to}`);
                    } catch (e) {
                      toast.error(e.response?.data?.detail || 'Could not send reminder');
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  data-testid={`task-send-reminder-${task.id}`}
                >
                  <Mail className="w-3.5 h-3.5" /> Send reminder
                </button>
              )}
              <div className="h-px bg-slate-100 my-1" />
              {canDelete && (
                <button
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  data-testid={`task-delete-${task.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete task
                </button>
              )}
            </FloatingMenu>
          )}
        </div>
      </div>

      {/* ── Mobile layout (< sm) ────────────────────────────────────────── */}
      <div className="sm:hidden">
        <div className="flex items-start gap-2">
          <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${P.dot}`} title={`${P.label} priority`} />
          <button onClick={onOpen} className="flex-1 min-w-0 text-left">
            <p className="font-semibold text-slate-900 line-clamp-2">{task.title}</p>
            {descSnippet && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{descSnippet}</p>}
          </button>
          <button
            ref={menuBtnRefMobile}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
            className="p-1 rounded hover:bg-slate-200 shrink-0"
            data-testid={`task-menu-m-${task.id}`}
          >
            <MoreHorizontal className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-2 ml-4 flex-wrap">
          {task.project_name && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ backgroundColor: (task.project_color || '#64748b') + '20', color: task.project_color || '#334155' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.project_color || '#64748b' }} />
              {task.project_name}
            </span>
          )}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${S.pill}`}>
            <S.icon className="w-2.5 h-2.5" /> {S.label}
          </span>
          {task.due_date && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              overdue ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
            }`}>
              <Calendar className="w-2.5 h-2.5" /> {fmtDate(task.due_date)}
            </span>
          )}
          {overdue && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
              <AlertCircle className="w-2.5 h-2.5" /> Overdue
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 ml-4">
          <div className="flex items-center gap-1.5">
            <Avatar name={task.assigned_to_name} size="xs" />
            <div className="leading-tight">
              <p className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                {task.assigned_to_name}
                {task.assigned_to === currentUserId && <span className="text-[10px] text-blue-600 ml-1">(you)</span>}
              </p>
              {task.assigned_by_name && task.assigned_by !== task.assigned_to && (
                <p className="text-[9px] text-slate-400 truncate max-w-[140px]">
                  by {task.assigned_by === currentUserId ? 'you' : task.assigned_by_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canStart && (
              <button onClick={startTask}
                className="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100"
                data-testid={`task-start-m-${task.id}`}>
                <Play className="w-3.5 h-3.5" />
              </button>
            )}
            {canComplete && (
              <button onClick={completeTask}
                className={`p-1.5 rounded-lg ${
                  task.status === 'pending_approval' && (isApprover || isAdmin)
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-green-600 bg-green-50'
                } hover:opacity-80`}
                data-testid={`task-complete-m-${task.id}`}>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {menuOpen && (
          <FloatingMenu anchorRef={menuBtnRefMobile} onClose={() => setMenuOpen(false)} testid={`task-menu-popup-m-${task.id}`}>
            {canEdit && onEdit && (
              <button onClick={() => { setMenuOpen(false); onEdit(); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                <Edit2 className="w-3.5 h-3.5" /> Edit task
              </button>
            )}
            <button onClick={() => { setMenuOpen(false); onAddSubtask(); }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Add sub-task
            </button>
            <button onClick={() => { setMenuOpen(false); onOpen(); }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Open detail
            </button>
            <div className="h-px bg-slate-100 my-1" />
            {canDelete && (
              <button onClick={() => { setMenuOpen(false); onDelete(); }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                data-testid={`task-delete-mobile-${task.id}`}>
                <Trash2 className="w-3.5 h-3.5" /> Delete task
              </button>
            )}
          </FloatingMenu>
        )}
      </div>

      {/* Nested subtasks — each with its OWN independent status control */}
      {expanded && subtasks.length > 0 && (
        <div className="mt-2 ml-6 sm:ml-12 border-l-2 border-slate-100 pl-3 sm:pl-4 space-y-1.5">
          {subtasks.map(st => (
            <SubtaskRow
              key={st.id}
              subtask={st}
              onOpen={() => onOpen(st)}
              getAuthHeaders={getAuthHeaders}
              onLocalUpdate={(updated) => setSubtasks(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))}
              onParentReload={() => onStatus('__reload__')}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
};


// ── Sub-task row: each sub-task has its own independent status control.
// Fixes the "cannot update subtask status" bug — click the pill for an inline
// dropdown, or click anywhere else on the row to open the full detail modal.
const SubtaskRow = ({ subtask, onOpen, getAuthHeaders, onLocalUpdate, onParentReload, isAdmin, currentUserId }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const rowRef = useRef(null);
  const SS = STATUS_META[subtask.status] || STATUS_META.pending;

  // Users allowed to change status: admin, creator, or the assignee.
  const canChangeStatus = isAdmin
    || subtask.created_by === currentUserId
    || subtask.assigned_to === currentUserId;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => { if (rowRef.current && !rowRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const setStatus = async (newStatus) => {
    if (newStatus === subtask.status) { setMenuOpen(false); return; }
    setSaving(true);
    try {
      const res = await axios.patch(
        `${API}/tasks/${subtask.id}`,
        { status: newStatus },
        { headers: getAuthHeaders() }
      );
      onLocalUpdate(res.data);
      toast.success(`Subtask marked ${STATUS_META[newStatus]?.label || newStatus}`);
      // Reload parent so subtask_done counter updates without losing expansion.
      onParentReload();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update subtask');
    } finally {
      setSaving(false);
      setMenuOpen(false);
    }
  };

  return (
    <div
      ref={rowRef}
      className="flex items-center gap-2 py-1 text-xs relative"
      data-testid={`task-subtask-row-${subtask.id}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${SS.dot}`} />
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 text-slate-700 truncate text-left hover:text-slate-900 hover:underline"
        title="Open subtask details"
        data-testid={`task-subtask-open-${subtask.id}`}
      >
        {subtask.title}
      </button>
      <span className="text-slate-500 hidden sm:inline">{subtask.assigned_to_name || '—'}</span>

      {canChangeStatus ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
          disabled={saving}
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${SS.pill} hover:ring-2 ${SS.ring} transition inline-flex items-center gap-1`}
          data-testid={`task-subtask-status-btn-${subtask.id}`}
          title="Change subtask status"
        >
          {saving ? '…' : SS.label}
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
      ) : (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${SS.pill}`}>{SS.label}</span>
      )}

      {subtask.due_date && (
        <span className="text-slate-500 hidden sm:inline">{fmtDate(subtask.due_date)}</span>
      )}

      {menuOpen && (
        <div
          className="absolute right-0 top-6 z-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]"
          data-testid={`task-subtask-status-menu-${subtask.id}`}
        >
          {Object.entries(STATUS_META).filter(([k]) => k !== 'pending_approval' && k !== 'rejected').map(([k, m]) => (
            <button
              key={k}
              onClick={(e) => { e.stopPropagation(); setStatus(k); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 ${k === subtask.status ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
              data-testid={`task-subtask-status-option-${subtask.id}-${k}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
              {m.label}
              {k === subtask.status && <Check className="w-3 h-3 ml-auto text-emerald-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};


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
  const approve = async (e) => {
    try {
      await axios.post(`${API}/tasks/${task.id}/approve`, {}, { headers: getAuthHeaders() });
      celebrateTaskComplete(e);
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

  const canSubmit  = currentUserId === task.assigned_to
                     && task.assigned_to !== task.assigned_by
                     && ['pending', 'in_progress', 'rejected'].includes(task.status);
  const canApprove = (isAdmin || currentUserId === task.assigned_by) && task.status === 'pending_approval';
  // Only the assignee who owns a self-assigned task can directly mark complete
  const canComplete = task.status !== 'completed'
                      && currentUserId === task.assigned_to
                      && task.assigned_to === task.assigned_by;

  const markComplete = async (e) => {
    try {
      await axios.patch(`${API}/tasks/${task.id}`, { status: 'completed' }, { headers: getAuthHeaders() });
      celebrateTaskComplete(e);
      toast.success('Marked complete');
      onClose();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const saveAttachments = async (newAttachments) => {
    try {
      await axios.patch(`${API}/tasks/${task.id}`, { attachments: newAttachments }, { headers: getAuthHeaders() });
      task.attachments = newAttachments; // local sync
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to save'); }
  };

  const S = STATUS_META[task.status] || STATUS_META.pending;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-2xl w-full p-4 sm:p-6 h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()} data-testid="task-detail-modal">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{task.title}</h2>
            <div className="flex items-center gap-2 mt-2 text-sm flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${S.pill}`}>
                <S.icon className="w-3 h-3" /> {S.label}
              </span>
              {task.due_date && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  <Calendar className="w-3 h-3" /> {fmtDate(task.due_date)}
                </span>
              )}
              <span className="text-slate-400">•</span>
              <div className="flex items-center gap-1.5">
                <Avatar name={task.assigned_to_name} size="xs" />
                <span className="text-slate-700 text-xs font-medium">{task.assigned_to_name || 'Unassigned'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {task.description && <p className="text-sm text-slate-600 mb-4 whitespace-pre-wrap">{task.description}</p>}
        {task.rejection_reason && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-4">
            <strong>Rejected:</strong> {task.rejection_reason}
          </div>
        )}

        {/* Attachments */}
        <div className="mb-4">
          <AttachmentsPanel
            attachments={task.attachments || []}
            onChange={saveAttachments}
            getAuthHeaders={getAuthHeaders}
          />
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {canComplete && (
            <button onClick={markComplete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 font-medium"
              data-testid="task-mark-complete-btn">
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
            </button>
          )}
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

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" /> Comments ({comments.length})
          </h3>
          <div className="space-y-2 mb-3 sm:max-h-56 sm:overflow-y-auto">
            {comments.length === 0 && <p className="text-xs text-slate-400 italic">No comments yet.</p>}
            {comments.map(c => (
              <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg" data-testid={`comment-${c.id}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Avatar name={c.user_name || 'User'} size="xs" />
                  <span className="text-xs font-semibold text-slate-700">{c.user_name || 'User'}</span>
                  <span className="text-[10px] text-slate-400 ml-auto">{new Date(c.created_at).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap pl-7">{c.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && postComment()}
              placeholder="Write a comment…"
              className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              data-testid="comment-input" />
            <button onClick={postComment}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
              data-testid="comment-send-btn">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTasks;
