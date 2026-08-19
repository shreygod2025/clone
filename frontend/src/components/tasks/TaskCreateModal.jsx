import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Calendar, User as UserIcon, Flag, X, Search, ChevronDown, Check,
  Repeat, Link2, Tag as TagIcon, FolderKanban as FolderIcon,
  Paperclip, Upload, FileText, Trash2
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

// ── Attachments panel (real file upload + link) ──────────────────────────────
export const AttachmentsPanel = ({ attachments = [], onChange, getAuthHeaders, compact = false }) => {
  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const fileInputRef = useRef(null);

  const add = (att) => onChange([...(attachments || []), att]);
  const remove = (idx) => onChange(attachments.filter((_, i) => i !== idx));

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10 MB)');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API}/upload?type=task`, fd, {
        headers: { ...getAuthHeaders() },
      });
      add({ name: file.name, url: res.data.url, kind: 'file', size: file.size });
      toast.success('File attached');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const submitLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    add({ name: linkName.trim() || url, url, kind: 'link' });
    setLinkUrl(''); setLinkName(''); setLinkOpen(false);
    toast.success('Link added');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3" data-testid="attachments-panel">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase inline-flex items-center gap-1">
          <Paperclip className="w-3 h-3" /> Attachments
        </span>
        {attachments.length > 0 && (
          <span className="text-[10px] text-slate-400 font-medium">{attachments.length} added</span>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs" data-testid={`attachment-item-${i}`}>
              {a.kind === 'link'
                ? <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                : <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              }
              <a href={a.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 truncate text-slate-700 hover:text-blue-600 hover:underline">
                {a.name || a.url}
              </a>
              <button type="button" onClick={() => remove(i)}
                className="p-0.5 text-slate-400 hover:text-red-600" data-testid={`attachment-remove-${i}`}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={compact ? 'flex gap-2' : 'grid grid-cols-2 gap-2'}>
        <button type="button" onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center justify-center gap-1 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-dashed border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-60"
          data-testid="attachment-upload-btn">
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading…' : 'Upload file'}
        </button>
        <button type="button" onClick={() => setLinkOpen(o => !o)}
          className="inline-flex items-center justify-center gap-1 py-2 text-xs font-medium text-slate-600 bg-white border border-dashed border-slate-200 rounded-lg hover:bg-slate-100"
          data-testid="attachment-link-btn">
          <Link2 className="w-3.5 h-3.5" /> Add link
        </button>
      </div>

      {linkOpen && (
        <div className="mt-2 p-2 bg-white border border-slate-200 rounded-lg space-y-1.5" data-testid="attachment-link-form">
          <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://drive.google.com/…"
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-blue-300"
            autoFocus data-testid="attachment-link-url" />
          <input type="text" value={linkName} onChange={e => setLinkName(e.target.value)}
            placeholder="Label (optional)"
            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-blue-300"
            data-testid="attachment-link-name" />
          <div className="flex gap-1.5 justify-end">
            <button type="button" onClick={() => { setLinkOpen(false); setLinkUrl(''); setLinkName(''); }}
              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
            <button type="button" onClick={submitLink}
              className="px-2.5 py-1 text-xs font-medium bg-blue-500 text-white rounded hover:bg-blue-600"
              data-testid="attachment-link-save">Add</button>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" hidden onChange={onPickFile}
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
        data-testid="attachment-file-input" />
    </div>
  );
};

// ── Main modal ───────────────────────────────────────────────────────────────
const TaskCreateModal = ({ open, onClose, onCreated, currentUser, parentTask = null, defaultProjectId = '', existingTask = null, defaultAssigneeId = '' }) => {
  const isEdit = !!existingTask;
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(null);
  const [openPanel, setOpenPanel] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [rows, setRows] = useState([]); // [{ id, title, description, expanded, overrides }]

  const supportsBulk = !isEdit && !parentTask; // no bulk when editing / creating sub-tasks

  const newRow = () => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    description: '',
    expanded: false,
    overrides: {
      assigned_to: '',
      priority: '',
      due_date: '',
      tags: '',
      gdrive_link: '',
    },
  });

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
    // Reset bulk state on every open
    setBulkMode(false);
    setRows([newRow()]);
    if (isEdit) {
      // Prefill from existing task
      setForm({
        title: existingTask.title || '',
        description: existingTask.description || '',
        assigned_to: existingTask.assigned_to || currentUser?.id || '',
        priority: existingTask.priority || 'medium',
        due_date: existingTask.due_date ? existingTask.due_date.slice(0, 10) : '',
        project_id: existingTask.project_id || '',
        parent_task_id: existingTask.parent_task_id || null,
        tags: Array.isArray(existingTask.tags) ? existingTask.tags.join(', ') : '',
        gdrive_link: existingTask.gdrive_link || '',
        repeat_freq: '',
        repeat_day_of_week: existingTask.repeat_day_of_week ?? null,
        repeat_day_of_month: existingTask.repeat_day_of_month ?? null,
        attachments: existingTask.attachments || [],
      });
    } else {
      setForm({
        title: '',
        description: '',
        assigned_to: defaultAssigneeId || currentUser?.id || '',
        priority: 'medium',
        due_date: '',
        project_id: defaultProjectId || '',
        parent_task_id: parentTask?.id || null,
        tags: '',
        gdrive_link: '',
        repeat_freq: '',
        repeat_day_of_week: null,
        repeat_day_of_month: null,
        attachments: [],
      });
    }
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
  }, [open, currentUser, parentTask, defaultProjectId, existingTask, isEdit]);

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
  }, [open, form]);

  if (!open || !form) return null;

  const handleSubmit = async () => {
    // ── Bulk mode: create many tasks in one shot ─────────────────────
    if (bulkMode) {
      const clean = rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.title.trim());
      if (clean.length === 0) {
        toast.error('Add at least one task with a title');
        return;
      }
      const sharedAssignee = form.assigned_to;
      if (!sharedAssignee && !clean.every(({ r }) => r.overrides.assigned_to)) {
        toast.error('Pick a default assignee (or set one on every row)');
        return;
      }
      setSubmitting(true);
      try {
        const payloadTasks = clean.map(({ r }) => ({
          title: r.title.trim(),
          description: r.description || form.description || '',
          assigned_to: r.overrides.assigned_to || sharedAssignee,
          priority: r.overrides.priority || form.priority,
          due_date: (r.overrides.due_date
            ? new Date(r.overrides.due_date).toISOString()
            : (form.due_date ? new Date(form.due_date).toISOString() : null)),
          project_id: form.project_id || null,
          parent_task_id: null,
          tags: (r.overrides.tags || form.tags || '')
            .split(',').map(t => t.trim()).filter(Boolean),
          gdrive_link: r.overrides.gdrive_link || form.gdrive_link || null,
          attachments: form.attachments || [],
        }));
        const res = await axios.post(`${API}/tasks/bulk`, { tasks: payloadTasks }, { headers: getAuthHeaders() });
        const created = res.data?.count ?? 0;
        const errors = res.data?.errors || [];
        if (created > 0) {
          toast.success(`${created} task${created === 1 ? '' : 's'} created`);
        }
        if (errors.length) {
          toast.error(`${errors.length} row${errors.length === 1 ? '' : 's'} failed: ${errors[0].detail}`);
        }
        if (created > 0) {
          onCreated?.(res.data);
          onClose();
        }
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Bulk create failed');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ── Single-task path (unchanged) ─────────────────────────────────
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
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        gdrive_link: form.gdrive_link || null,
        attachments: form.attachments || [],
      };

      let result;
      if (isEdit) {
        result = await axios.patch(`${API}/tasks/${existingTask.id}`, body, { headers: getAuthHeaders() });
      } else {
        body.parent_task_id = form.parent_task_id || null;
        result = await axios.post(`${API}/tasks`, body, { headers: getAuthHeaders() });

        if (form.repeat_freq && !form.parent_task_id) {
          try {
            await axios.post(`${API}/scheduled-tasks`, {
              title: form.title.trim(),
              description: form.description,
              priority: form.priority,
              frequency: form.repeat_freq,
              // Convert JS getDay() (Sun=0..Sat=6) to backend format (Mon=0..Sun=6)
              days_of_week: form.repeat_freq === 'weekly' && form.repeat_day_of_week !== null && form.repeat_day_of_week !== undefined
                ? [(form.repeat_day_of_week + 6) % 7]
                : [],
              day_of_month: form.repeat_freq === 'monthly' ? form.repeat_day_of_month : null,
              assigned_to: form.assigned_to,
              project_id: form.project_id || null,
              is_active: true,
            }, { headers: getAuthHeaders() });
          } catch { /* non-blocking */ }
        }
      }

      toast.success(isEdit ? 'Task updated' : form.parent_task_id ? 'Sub-task created' : 'Task created');
      onCreated?.(result.data);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || (isEdit ? 'Failed to update task' : 'Failed to create task'));
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
            {isEdit ? 'Edit task' : form.parent_task_id ? 'New sub-task' : bulkMode ? `New tasks (${rows.filter(r => r.title.trim()).length})` : 'New task'}
          </p>
          <div className="flex items-center gap-2">
            {supportsBulk && (
              <button
                type="button"
                onClick={() => setBulkMode(v => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  bulkMode
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
                }`}
                data-testid="task-bulk-toggle"
                title="Add several tasks at once — the details below apply to all rows unless a row is customised."
              >
                {bulkMode ? '✓ Bulk mode' : '+ Add multiple'}
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" data-testid="new-task-close">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-5 space-y-3">
          {!bulkMode && (
            <>
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
            </>
          )}

          {bulkMode && (
            <div className="space-y-2" data-testid="task-bulk-rows">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Add task names below. The <strong>assignee, due date, priority</strong> and other chips below apply to every row. Expand a row to customise its own details.
              </p>
              {rows.map((row, idx) => {
                const rowAssignee = row.overrides.assigned_to ? users.find(u => u.id === row.overrides.assigned_to) : null;
                const rowPriority = row.overrides.priority || null;
                const rowDue = row.overrides.due_date || null;
                return (
                  <div key={row.id} className="rounded-xl border border-slate-200 bg-white overflow-visible" data-testid={`task-bulk-row-${idx}`}>
                    <div className="flex items-start gap-2 px-3 py-2">
                      <span className="mt-2 text-[11px] text-slate-400 font-mono w-6 text-right shrink-0">{idx + 1}.</span>
                      <input
                        type="text"
                        value={row.title}
                        onChange={e => setRows(rs => rs.map(r => r.id === row.id ? { ...r, title: e.target.value } : r))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (idx === rows.length - 1 && row.title.trim()) {
                              setRows(rs => [...rs, newRow()]);
                              setTimeout(() => {
                                const inputs = document.querySelectorAll('[data-testid^="task-bulk-row-"] input[type="text"]');
                                inputs[idx + 1]?.focus();
                              }, 0);
                            }
                          }
                        }}
                        autoFocus={idx === 0}
                        placeholder={idx === 0 ? 'Task name… (Enter to add another)' : 'Task name…'}
                        className="flex-1 min-w-0 px-2 py-1.5 text-sm border-0 outline-none focus:ring-0 placeholder:text-slate-400"
                        data-testid={`task-bulk-title-${idx}`}
                      />
                      <button
                        type="button"
                        onClick={() => setRows(rs => rs.map(r => r.id === row.id ? { ...r, expanded: !r.expanded } : r))}
                        className={`text-[11px] font-semibold px-2 py-1 rounded shrink-0 whitespace-nowrap ${
                          row.expanded || rowAssignee || rowPriority || rowDue
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            : 'text-slate-500 hover:bg-slate-100'
                        }`}
                        data-testid={`task-bulk-customize-${idx}`}
                        title="Customise this row"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 inline transition-transform ${row.expanded ? 'rotate-180' : ''}`} /> Customise
                      </button>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRows(rs => rs.filter(r => r.id !== row.id))}
                          className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                          aria-label="Remove row"
                          data-testid={`task-bulk-remove-${idx}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {row.expanded && (
                      <div className="border-t border-slate-100 px-3 py-2 space-y-2 bg-slate-50/60">
                        <textarea
                          value={row.description}
                          onChange={e => setRows(rs => rs.map(r => r.id === row.id ? { ...r, description: e.target.value } : r))}
                          placeholder="Description for this task only…"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs min-h-[52px] outline-none focus:ring-1 focus:ring-blue-200 resize-none"
                          data-testid={`task-bulk-desc-${idx}`}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <label className="text-[11px] text-slate-500">
                            <span className="block mb-0.5 font-semibold uppercase tracking-wider">Assignee</span>
                            <select
                              value={row.overrides.assigned_to}
                              onChange={e => setRows(rs => rs.map(r => r.id === row.id ? { ...r, overrides: { ...r.overrides, assigned_to: e.target.value } } : r))}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"
                              data-testid={`task-bulk-assignee-${idx}`}
                            >
                              <option value="">Use shared</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}{u.id === currentUser?.id ? ' (you)' : ''}</option>
                              ))}
                            </select>
                          </label>
                          <label className="text-[11px] text-slate-500">
                            <span className="block mb-0.5 font-semibold uppercase tracking-wider">Priority</span>
                            <select
                              value={row.overrides.priority}
                              onChange={e => setRows(rs => rs.map(r => r.id === row.id ? { ...r, overrides: { ...r.overrides, priority: e.target.value } } : r))}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"
                              data-testid={`task-bulk-priority-${idx}`}
                            >
                              <option value="">Use shared</option>
                              {Object.entries(PRIORITY_META).map(([v, m]) => (
                                <option key={v} value={v}>{m.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="text-[11px] text-slate-500">
                            <span className="block mb-0.5 font-semibold uppercase tracking-wider">Due date</span>
                            <input
                              type="date"
                              value={row.overrides.due_date}
                              onChange={e => setRows(rs => rs.map(r => r.id === row.id ? { ...r, overrides: { ...r.overrides, due_date: e.target.value } } : r))}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"
                              data-testid={`task-bulk-due-${idx}`}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setRows(rs => [...rs, newRow()])}
                className="w-full py-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-xs font-semibold hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/40 transition-colors"
                data-testid="task-bulk-add-row"
              >
                + Add another task
              </button>
            </div>
          )}
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
              label={
                form.repeat_freq
                  ? (form.repeat_freq === 'weekly' && form.repeat_day_of_week !== null && form.repeat_day_of_week !== undefined
                      ? `Repeat: weekly (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][form.repeat_day_of_week] || '?'})`
                      : form.repeat_freq === 'monthly' && form.repeat_day_of_month
                      ? `Repeat: monthly (day ${form.repeat_day_of_month})`
                      : `Repeat: ${form.repeat_freq}`)
                  : 'Repeat'
              }
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

          <AttachmentsPanel
            attachments={form.attachments}
            onChange={(atts) => setForm({ ...form, attachments: atts })}
            getAuthHeaders={getAuthHeaders}
          />
        </div>

        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t rounded-b-2xl">
          <p className="text-[10px] text-slate-400 tracking-wider font-medium">⌘ + ENTER TO {isEdit ? 'SAVE' : 'CREATE'}</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-1.5 border rounded-lg text-sm hover:bg-white">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="px-5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium"
              data-testid="task-submit-btn">
              {submitting
                ? (isEdit ? 'Saving…' : bulkMode ? 'Creating…' : 'Creating…')
                : (isEdit
                    ? 'Save Changes'
                    : bulkMode
                      ? `Create ${rows.filter(r => r.title.trim()).length || ''} task${rows.filter(r => r.title.trim()).length === 1 ? '' : 's'}`.trim()
                      : 'Create Task')}
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
        <Popover anchor={chipRefs.repeat} onClose={closePanel} testid="panel-repeat" width={260}>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Frequency</p>
            {[{ v: '', l: 'No repeat' }, { v: 'daily', l: 'Every day' }, { v: 'weekly', l: 'Every week' }, { v: 'monthly', l: 'Every month' }].map(o => (
              <button key={o.v || 'none'} type="button"
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    repeat_freq: o.v,
                    // reset day fields when frequency changes
                    repeat_day_of_week: o.v === 'weekly' ? (prev.repeat_day_of_week ?? new Date().getDay()) : null,
                    repeat_day_of_month: o.v === 'monthly' ? (prev.repeat_day_of_month ?? new Date().getDate()) : null,
                  }));
                  if (!o.v) closePanel();
                }}
                className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-slate-50 ${
                  form.repeat_freq === o.v ? 'bg-blue-50 text-blue-700' : ''
                }`}
                data-testid={`repeat-option-${o.v || 'none'}`}>
                {o.l}
              </button>
            ))}

            {form.repeat_freq === 'weekly' && (
              <div className="pt-2 border-t border-slate-100" data-testid="repeat-weekly-day-picker">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Day of week</p>
                <div className="grid grid-cols-7 gap-1">
                  {['S','M','T','W','T','F','S'].map((letter, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setForm({ ...form, repeat_day_of_week: i })}
                      className={`h-8 rounded text-xs font-semibold border transition-colors ${
                        form.repeat_day_of_week === i
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                      data-testid={`repeat-weekday-${i}`}
                      title={['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i]}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Runs every {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][form.repeat_day_of_week ?? new Date().getDay()]}
                </p>
              </div>
            )}

            {form.repeat_freq === 'monthly' && (
              <div className="pt-2 border-t border-slate-100" data-testid="repeat-monthly-day-picker">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Day of month</p>
                <select
                  value={form.repeat_day_of_month || new Date().getDate()}
                  onChange={(e) => setForm({ ...form, repeat_day_of_month: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                  data-testid="repeat-day-of-month-select"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>
                      {d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : d === 21 ? 'st' : d === 22 ? 'nd' : d === 23 ? 'rd' : d === 31 ? 'st' : 'th'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  {(form.repeat_day_of_month || new Date().getDate()) > 28
                    ? 'Skipped in months without this date (e.g. Feb).'
                    : 'Runs on this day every month.'}
                </p>
              </div>
            )}
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
