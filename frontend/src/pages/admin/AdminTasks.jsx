import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from './AdminDashboard';
import TaskCreateModal, { AttachmentsPanel } from '../../components/tasks/TaskCreateModal';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus, Calendar, Trash2, X, Search,
  CheckCircle2, Circle, Clock, MessageSquare, ChevronDown, ChevronRight,
  Check, XCircle, Send, ListChecks, Link2, MoreHorizontal, AlertCircle,
  Sparkles, Paperclip, FileText
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
const AdminTasks = () => {
  const { user, getAuthHeaders } = useAuth();
  const isAdmin = user?.role === 'admin';
  const currentUserId = user?.id;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(isAdmin ? 'team' : 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [searchParams, setSearchParams] = useSearchParams();
  const [subTaskParent, setSubTaskParent] = useState(null);
  const [groupByStatus, setGroupByStatus] = useState(true);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/tasks?filter=${filter}`, { headers: getAuthHeaders() });
      setTasks(res.data || []);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  }, [filter, getAuthHeaders]);

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
    // Sort: earliest due_date first (nulls last), then priority DESC
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
  }, [tasks, statusFilter, query]);

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

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-5" data-testid="admin-tasks-page">
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
          <button
            onClick={() => openCreate(null)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium shadow-sm shadow-blue-500/20 transition-colors"
            data-testid="new-task-btn"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
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
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search tasks…"
                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-64 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                data-testid="tasks-search-input"
              />
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
            <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center text-slate-400 text-sm">
              Loading tasks…
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
          ) : groupByStatus ? (
            <div className="space-y-4">
              {grouped.map(({ key, tasks: gTasks }) => (
                <StatusSection key={key} statusKey={key} tasks={gTasks}
                  expandedIds={expandedIds}
                  onToggle={toggleExpand}
                  onOpen={setDetailTask}
                  onDelete={deleteTask}
                  onStatus={updateStatus}
                  onAddSubtask={openCreate}
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
const StatusSection = ({ statusKey, tasks, expandedIds, onToggle, onOpen, onDelete, onStatus, onAddSubtask, getAuthHeaders, currentUserId, isAdmin }) => {
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
const FloatingMenu = ({ anchorRef, onClose, children, testid }) => {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200 });
  const popupRef = useRef(null);
  useEffect(() => {
    if (!anchorRef?.current) return;
    const r = anchorRef.current.getBoundingClientRect();
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
    >
      {children}
    </div>
  );
};

const TaskCard = ({ task, expanded, onToggle, onOpen, onDelete, onStatus, onAddSubtask, getAuthHeaders, currentUserId, isAdmin }) => {
  const S = STATUS_META[task.status] || STATUS_META.pending;
  const P = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const overdue = isOverdue(task);
  const hasSubtasks = (task.subtask_total || 0) > 0;
  const [subtasks, setSubtasks] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef(null);

  useEffect(() => {
    if (expanded && hasSubtasks) {
      axios.get(`${API}/tasks/${task.id}/subtasks`, { headers: getAuthHeaders() })
        .then(r => setSubtasks(r.data || []))
        .catch(() => {});
    }
  }, [expanded, hasSubtasks, task.id, getAuthHeaders]);

  // Ownership: assignee is the OWNER of the task; only they can mark it complete.
  // Assigner (or admin) can only APPROVE when status = pending_approval.
  const isSelfAssigned = task.assigned_to === task.assigned_by;
  const isAssignee = currentUserId === task.assigned_to;
  const isApprover = currentUserId === task.assigned_by;

  const completeTask = async (e) => {
    e?.stopPropagation();
    try {
      if (task.status === 'pending_approval' && (isApprover || isAdmin)) {
        await axios.post(`${API}/tasks/${task.id}/approve`, {}, { headers: getAuthHeaders() });
        toast.success('Approved & completed');
      } else if (isAssignee && isSelfAssigned) {
        await axios.patch(`${API}/tasks/${task.id}`, { status: 'completed' }, { headers: getAuthHeaders() });
        toast.success('Marked complete');
      } else if (isAssignee) {
        await axios.post(`${API}/tasks/${task.id}/submit`, {}, { headers: getAuthHeaders() });
        toast.success('Submitted for approval');
      } else {
        toast.error('Only the task owner can mark this complete');
        return;
      }
      onStatus('__reload__');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed');
    }
  };

  // Show the complete/approve icon only for people who can act right now
  const canComplete = task.status !== 'completed' && (
    isAssignee ||
    (task.status === 'pending_approval' && (isApprover || isAdmin))
  );
  const attachmentCount = (task.attachments || []).length + (task.gdrive_link ? 1 : 0);
  const tagList = Array.isArray(task.tags) ? task.tags : [];
  const descSnippet = (task.description || '').trim().split('\n')[0].slice(0, 140);

  return (
    <div data-testid={`task-row-${task.id}`}
      className="group relative px-4 py-3 hover:bg-slate-50/60 transition-colors">
      <div className="flex items-start gap-3">
        {/* Expand chevron + status icon */}
        <div className="flex items-center gap-1 pt-1">
          {hasSubtasks ? (
            <button onClick={onToggle}
              className="p-0.5 hover:bg-slate-200 rounded transition"
              data-testid={`task-expand-${task.id}`}>
              {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
            </button>
          ) : <span className="inline-block w-4" />}
          <div
            title={S.label}
            className={`w-4 h-4 rounded-full ring-2 ring-offset-1 flex items-center justify-center transition-all ${S.ring} ${
              task.status === 'completed' ? S.dot : 'bg-white'
            }`}
          >
            {task.status === 'completed' && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
          </div>
        </div>

        {/* Priority dot */}
        <div className="flex flex-col items-center pt-2">
          <span className={`w-2 h-2 rounded-full ${P.dot}`} title={`${P.label} priority`} />
        </div>

        {/* Main content: title + description snippet + tag row */}
        <div className="flex-1 min-w-0">
          <button onClick={onOpen} className="text-left w-full block">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                {task.title}
              </span>
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

        {/* Due date — fixed width slot for alignment */}
        <div className="hidden sm:flex items-start justify-end pt-1 w-[76px] shrink-0">
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

        {/* Status pill — fixed width slot */}
        <div className="hidden md:flex items-start justify-start pt-1 w-[130px] shrink-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${S.pill}`}>
            <S.icon className="w-3 h-3" /> {S.label}
          </span>
        </div>

        {/* Assignee block — fixed width slot */}
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

        {/* Complete action — fixed width slot */}
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
        </div>

        {/* 3-dot menu — fixed width slot */}
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
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={() => { setMenuOpen(false); onDelete(); }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                data-testid={`task-delete-${task.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete task
              </button>
            </FloatingMenu>
          )}
        </div>
      </div>

      {/* Nested subtasks */}
      {expanded && subtasks.length > 0 && (
        <div className="mt-2 ml-12 border-l-2 border-slate-100 pl-4 space-y-1.5">
          {subtasks.map(st => {
            const SS = STATUS_META[st.status] || STATUS_META.pending;
            return (
              <div key={st.id} className="flex items-center gap-2 py-1 text-xs" data-testid={`task-subtask-row-${st.id}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${SS.dot}`} />
                <span className="flex-1 text-slate-700 truncate">{st.title}</span>
                <span className="text-slate-500">{st.assigned_to_name || '—'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${SS.pill}`}>{SS.label}</span>
                {st.due_date && <span className="text-slate-500">{fmtDate(st.due_date)}</span>}
              </div>
            );
          })}
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

  const canSubmit  = currentUserId === task.assigned_to
                     && task.assigned_to !== task.assigned_by
                     && ['pending', 'in_progress', 'rejected'].includes(task.status);
  const canApprove = (isAdmin || currentUserId === task.assigned_by) && task.status === 'pending_approval';
  // Only the assignee who owns a self-assigned task can directly mark complete
  const canComplete = task.status !== 'completed'
                      && currentUserId === task.assigned_to
                      && task.assigned_to === task.assigned_by;

  const markComplete = async () => {
    try {
      await axios.patch(`${API}/tasks/${task.id}`, { status: 'completed' }, { headers: getAuthHeaders() });
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()} data-testid="task-detail-modal">
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
          <div className="space-y-2 mb-3 max-h-56 overflow-y-auto">
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
