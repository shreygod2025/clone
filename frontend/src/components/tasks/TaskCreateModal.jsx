import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Calendar, User as UserIcon, Flag, X, Search, ChevronDown, Check,
  Repeat, Link2, Tag as TagIcon, FolderKanban as FolderIcon
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRIORITY_META = {
  low:    { label: 'Low',    dot: 'bg-slate-300' },
  medium: { label: 'Medium', dot: 'bg-blue-500' },
  high:   { label: 'High',   dot: 'bg-amber-500' },
  urgent: { label: 'Urgent', dot: 'bg-red-500' },
};

// ── Chip (hoisted, stable) ───────────────────────────────────────────────────
const Chip = ({ ref: chipRef, onClick, icon: Icon, label, active, dotColor, testid }) => (
  <button
    ref={chipRef}
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      active
        ? 'bg-blue-50 border-blue-300 text-blue-700'
        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
    }`}
    data-testid={testid}
  >
    {dotColor && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {label}
  </button>
);

// ── Floating popover positioned ABOVE the anchor chip ────────────────────────
const Popover = ({ anchor, onClose, children, testid, width = 260 }) => {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const boxRef = useRef(null);

  useEffect(() => {
    if (!anchor?.current) return;
    const r = anchor.current.getBoundingClientRect();
    // Position ABOVE the chip; left-aligned to it, clamp to viewport
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setPos({ top: r.top - 8, left });
  }, [anchor, width]);

  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current?.contains(e.target)) return;
      if (anchor?.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [anchor, onClose]);

  return (
    <div
      ref={boxRef}
      data-testid={testid}
      className="fixed z-[110] bg-white rounded-xl shadow-2xl border border-slate-200 p-3"
      style={{ top: pos.top, left: pos.left, width, transform: 'translateY(-100%)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
};

// ── Searchable Assignee ──────────────────────────────────────────────────────
const AssigneeList = ({ value, onChange, users, currentUserId }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    if (!q.trim()) return users;
    const s = q.toLowerCase();
    return users.filter(u => u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s));
  }, [q, users]);

  return (
    <div>
      <div className="relative mb-2">
        <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
        <input
          autoFocus value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search name or email…"
          className="w-full pl-8 pr-3 py-1.5 border rounded-md text-sm outline-none focus:ring-1 focus:ring-slate-400"
          data-testid="assignee-search"
        />
      </div>
      <div className="max-h-52 overflow-y-auto -mx-1">
        {filtered.length === 0 && <p className="p-2 text-xs text-slate-400 text-center">No matches</p>}
        {filtered.map(u => (
          <button
            key={u.id}
            type="button"
            onClick={() => onChange(u.id)}
            className={`w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 flex items-center justify-between text-sm ${u.id === value ? 'bg-blue-50' : ''}`}
            data-testid={`assignee-option-${u.id}`}
          >
            <div className="min-w-0">
              <p className="font-medium text-slate-900 truncate">
                {u.name}{u.id === currentUserId && <span className="ml-1 text-xs text-blue-600">(you)</span>}
              </p>
              <p className="text-xs text-slate-500 truncate">{u.email}</p>
            </div>
            {u.id === value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Due-date presets popover ────────────────────────────────────────────────
const DueDatePicker = ({ value, onChange }) => {
  const now = new Date();
  const preset = (days) => {
    const d = new Date(now.getTime() + days * 86400000);
    d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16);   // datetime-local format
  };
  const presets = [
    { l: 'Today',       v: preset(0) },
    { l: 'Tomorrow',    v: preset(1) },
    { l: '3 days later', v: preset(3) },
    { l: '7 days later', v: preset(7) },
  ];

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Quick presets</p>
      {presets.map(p => (
        <button
          key={p.l}
          type="button"
          onClick={() => onChange(p.v)}
          className={`w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 text-sm ${value === p.v ? 'bg-blue-50 text-blue-700' : ''}`}
          data-testid={`due-preset-${p.l.replace(/\s+/g, '-').toLowerCase()}`}
        >
          {p.l}
        </button>
      ))}
      <div className="pt-2 border-t mt-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Custom</p>
        <input
          type="datetime-local"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full px-2 py-1.5 border rounded text-sm"
          data-testid="due-custom-input"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-red-600 mt-1.5 hover:underline"
          >Clear</button>
        )}
      </div>
    </div>
  );
};

// ── Main modal ───────────────────────────────────────────────────────────────
const TaskCreateModal = ({ open, onClose, onCreated, currentUser, parentTask = null, defaultProjectId = '' }) => {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(null);
  const [openPanel, setOpenPanel] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const chipRefs = {
    assignee: useRef(null),
    due:      useRef(null),
    priority: useRef(null),
    project:  useRef(null),
    repeat:   useRef(null),
    drive:    useRef(null),
    tags:     useRef(null),
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('oll_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (!open) return;
    setForm({
      title: '',
      description: '',
      assigned_to: currentUser?.id || '',
      priority: 'medium',
      due_date: '',
      project_id: defaultProjectId || '',
      parent_task_id: parentTask?.id || null,
      tags: '',
      gdrive_link: '',
      repeat_freq: '',
    });
    setOpenPanel(null);

    axios.get(`${API}/team-users`, { headers: getAuthHeaders() })
      .then(r => {
        const list = r.data || [];
        if (currentUser?.id && !list.find(u => u.id === currentUser.id)) {
          list.unshift({ id: currentUser.id, name: currentUser.name || 'Me (Admin)', email: currentUser.email || '' });
        }
        list.sort((a, b) => (a.id === currentUser?.id ? -1 : b.id === currentUser?.id ? 1 : 0));
        setUsers(list);
      })
      .catch(() => {});
    axios.get(`${API}/projects`, { headers: getAuthHeaders() })
      .then(r => setProjects(r.data || []))
      .catch(() => {});
  }, [open, currentUser, parentTask, defaultProjectId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form]);

  if (!open || !form) return null;

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.assigned_to) {
      toast.error('Title and assignee are required');
      return;
    }
    setSubmitting(true);
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
        gdrive_link: form.gdrive_link || null,
      };
      const created = await axios.post(`${API}/tasks`, body, { headers: getAuthHeaders() });

      if (form.repeat_freq && !form.parent_task_id) {
        try {
          await axios.post(`${API}/scheduled-tasks`, {
            title: form.title.trim(),
            description: form.description,
            priority: form.priority,
            frequency: form.repeat_freq,
            assigned_to: form.assigned_to,
            project_id: form.project_id || null,
            is_active: true,
          }, { headers: getAuthHeaders() });
        } catch { /* non-blocking */ }
      }

      toast.success(form.parent_task_id ? 'Sub-task created' : 'Task created');
      onCreated?.(created.data);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePanel = (k) => setOpenPanel(p => (p === k ? null : k));
  const closePanel = () => setOpenPanel(null);

  const selectedAssignee = users.find(u => u.id === form.assigned_to);
  const selectedProject  = projects.find(p => p.id === form.project_id);
  const pMeta = PRIORITY_META[form.priority] || PRIORITY_META.medium;

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="new-task-overlay"
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-visible relative"
        onClick={e => e.stopPropagation()}
        data-testid="new-task-modal"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <p className="text-xs font-semibold text-blue-600">
            {form.parent_task_id ? 'New sub-task' : 'New task'}
          </p>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" data-testid="new-task-close">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 pb-5 space-y-3">
          <input
            autoFocus type="text" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder={form.parent_task_id ? 'Sub-task name…' : 'Task name… (Cmd+Enter to create)'}
            className="w-full px-4 py-3 text-lg font-medium border rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 placeholder:text-slate-400"
            data-testid="task-title-input"
          />
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Add a description… what does done look like?"
            className="w-full px-4 py-3 border rounded-xl text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 placeholder:text-slate-400 resize-none"
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 bg-slate-400 rounded-full" /> TO DO
            </span>
            <Chip ref={chipRefs.assignee}
              onClick={() => togglePanel('assignee')}
              icon={UserIcon}
              label={selectedAssignee ? `${selectedAssignee.name}${selectedAssignee.id === currentUser?.id ? ' (you)' : ''}` : 'Assignee'}
              active={!!selectedAssignee && selectedAssignee.id !== currentUser?.id}
              testid="chip-assignee" />
            <Chip ref={chipRefs.due}
              onClick={() => togglePanel('due')}
              icon={Calendar}
              label={form.due_date ? new Date(form.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Due date'}
              active={!!form.due_date} testid="chip-due" />
            <Chip ref={chipRefs.priority}
              onClick={() => togglePanel('priority')}
              icon={Flag} label={pMeta.label} active={true} dotColor={pMeta.dot}
              testid="chip-priority" />
            {!form.parent_task_id && (
              <Chip ref={chipRefs.project}
                onClick={() => togglePanel('project')}
                icon={FolderIcon}
                label={selectedProject ? selectedProject.name : 'Project'}
                active={!!selectedProject} testid="chip-project" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip ref={chipRefs.repeat} onClick={() => togglePanel('repeat')}
              icon={Repeat}
              label={form.repeat_freq ? `Repeat: ${form.repeat_freq}` : 'Repeat'}
              active={!!form.repeat_freq} testid="chip-repeat" />
            <Chip ref={chipRefs.drive} onClick={() => togglePanel('drive')}
              icon={Link2}
              label={form.gdrive_link ? 'Drive linked' : 'Drive link'}
              active={!!form.gdrive_link} testid="chip-drive" />
            <Chip ref={chipRefs.tags} onClick={() => togglePanel('tags')}
              icon={TagIcon}
              label={form.tags ? `${form.tags.split(',').filter(Boolean).length} tag${form.tags.split(',').filter(Boolean).length !== 1 ? 's' : ''}` : 'Tags'}
              active={!!form.tags} testid="chip-tags" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border bg-slate-50/70 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">📎 Attachments</span>
                <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded-full border">Soon</span>
              </div>
              <button type="button" disabled
                className="w-full py-2 text-xs font-medium text-blue-500 bg-blue-50/60 border border-dashed border-blue-200 rounded-lg cursor-not-allowed opacity-70">
                + Attach files
              </button>
            </div>
            <div className="rounded-xl border bg-slate-50/70 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">🎙 Voice Note</span>
                <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded-full border">Soon</span>
              </div>
              <button type="button" disabled
                className="w-full py-2 text-xs font-medium text-red-500 bg-red-50/50 border border-dashed border-red-200 rounded-lg cursor-not-allowed opacity-70">
                🎙 Record
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t rounded-b-2xl">
          <p className="text-[10px] text-slate-400 tracking-wider font-medium">⌘ + ENTER TO CREATE</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-1.5 border rounded-lg text-sm hover:bg-white">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="px-5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium"
              data-testid="task-submit-btn">
              {submitting ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>

      {/* Floating popovers positioned above their chip */}
      {openPanel === 'assignee' && (
        <Popover anchor={chipRefs.assignee} onClose={closePanel} testid="panel-assignee" width={280}>
          <AssigneeList value={form.assigned_to}
            onChange={(id) => { setForm({ ...form, assigned_to: id }); closePanel(); }}
            users={users} currentUserId={currentUser?.id} />
        </Popover>
      )}
      {openPanel === 'due' && (
        <Popover anchor={chipRefs.due} onClose={closePanel} testid="panel-due" width={260}>
          <DueDatePicker value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} />
        </Popover>
      )}
      {openPanel === 'priority' && (
        <Popover anchor={chipRefs.priority} onClose={closePanel} testid="panel-priority" width={220}>
          <div className="space-y-1">
            {Object.entries(PRIORITY_META).map(([v, m]) => (
              <button key={v} type="button"
                onClick={() => { setForm({ ...form, priority: v }); closePanel(); }}
                className={`w-full inline-flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-50 ${
                  form.priority === v ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                }`}
                data-testid={`priority-option-${v}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                {m.label}
              </button>
            ))}
          </div>
        </Popover>
      )}
      {openPanel === 'project' && !form.parent_task_id && (
        <Popover anchor={chipRefs.project} onClose={closePanel} testid="panel-project" width={260}>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <button type="button" onClick={() => { setForm({ ...form, project_id: '' }); closePanel(); }}
              className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-slate-50 text-slate-500 italic">
              No project
            </button>
            {projects.map(p => (
              <button key={p.id} type="button"
                onClick={() => { setForm({ ...form, project_id: p.id }); closePanel(); }}
                className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-slate-50 flex items-center gap-2 ${
                  form.project_id === p.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                }`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </Popover>
      )}
      {openPanel === 'repeat' && (
        <Popover anchor={chipRefs.repeat} onClose={closePanel} testid="panel-repeat" width={240}>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Frequency</p>
            {[{ v: '', l: 'No repeat' }, { v: 'daily', l: 'Every day' }, { v: 'weekly', l: 'Every week' }, { v: 'monthly', l: 'Every month' }].map(o => (
              <button key={o.v || 'none'} type="button"
                onClick={() => { setForm({ ...form, repeat_freq: o.v }); closePanel(); }}
                className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-slate-50 ${
                  form.repeat_freq === o.v ? 'bg-blue-50 text-blue-700' : ''
                }`}
                data-testid={`repeat-option-${o.v || 'none'}`}>
                {o.l}
              </button>
            ))}
          </div>
        </Popover>
      )}
      {openPanel === 'drive' && (
        <Popover anchor={chipRefs.drive} onClose={closePanel} testid="panel-drive" width={300}>
          <input type="url" value={form.gdrive_link || ''}
            onChange={e => setForm({ ...form, gdrive_link: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), closePanel())}
            placeholder="https://drive.google.com/…"
            className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-slate-400"
            data-testid="drive-link-input" autoFocus />
        </Popover>
      )}
      {openPanel === 'tags' && (
        <Popover anchor={chipRefs.tags} onClose={closePanel} testid="panel-tags" width={280}>
          <input type="text" value={form.tags}
            onChange={e => setForm({ ...form, tags: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), closePanel())}
            placeholder="comma-separated e.g. urgent, cms"
            className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-slate-400"
            data-testid="task-tags-input" autoFocus />
        </Popover>
      )}
    </div>
  );
};

export default TaskCreateModal;
