import { useState, useRef, useEffect } from 'react';
import { Search, Check, User as UserIcon, ChevronDown, X } from 'lucide-react';

/**
 * Searchable user picker with an explicit "Select self" shortcut.
 *
 * Props:
 *   users       — array of { id, name, email, avatar? }
 *   value       — currently selected user id
 *   onChange    — (id: string) => void
 *   currentUser — the logged-in user (for the "Select self" chip)
 *   placeholder — placeholder text when nothing selected
 *   testid      — data-testid prefix
 *   allowClear  — show an "x" to clear (default true)
 */
const UserPicker = ({
  users = [],
  value,
  onChange,
  currentUser,
  placeholder = 'Select user',
  testid = 'user-picker',
  allowClear = true,
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const selected =
    users.find(u => u.id === value) ||
    (currentUser?.id === value ? { id: currentUser.id, name: currentUser.name || 'You', email: currentUser.email || '' } : null);
  // Show the "Select myself" shortcut whenever we know the current user —
  // even if they aren't in the users array (e.g. admin who isn't in team_users).
  const showSelfShortcut = !!currentUser?.id;

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 30);
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? users.filter(u =>
        (u.name || '').toLowerCase().includes(needle) ||
        (u.email || '').toLowerCase().includes(needle)
      )
    : users;

  const pick = (id) => {
    onChange?.(id);
    setOpen(false);
    setQ('');
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange?.('');
  };

  return (
    <div ref={wrapRef} className="relative" data-testid={testid}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        data-testid={`${testid}-trigger`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          <UserIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className={`truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
            {selected ? selected.name : placeholder}
          </span>
          {selected?.email && (
            <span className="text-[10px] text-slate-400 truncate hidden sm:inline">{selected.email}</span>
          )}
        </span>
        {allowClear && selected ? (
          <span
            onClick={clear}
            className="p-0.5 text-slate-400 hover:text-red-500 rounded"
            data-testid={`${testid}-clear`}
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-72 overflow-hidden flex flex-col" data-testid={`${testid}-popover`}>
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or email…"
              className="flex-1 text-sm outline-none placeholder:text-slate-400"
              data-testid={`${testid}-search`}
            />
          </div>

          {/* Self shortcut */}
          {showSelfShortcut && (
            <button
              type="button"
              onClick={() => pick(currentUser.id)}
              className="flex items-center gap-2 px-3 py-2 text-sm border-b border-slate-100 hover:bg-blue-50 text-left"
              data-testid={`${testid}-self`}
            >
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                ME
              </span>
              <span className="flex-1 min-w-0">
                <div className="font-medium text-blue-700 truncate">Select myself ({currentUser.name || 'You'})</div>
                {currentUser.email && <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>}
              </span>
              {value === currentUser.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </button>
          )}

          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">No users match &ldquo;{q}&rdquo;</div>
            ) : (
              filtered.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => pick(u.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${value === u.id ? 'bg-blue-50/50' : ''}`}
                  data-testid={`${testid}-option-${u.id}`}
                >
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                    {(u.name || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{u.name}</div>
                    {u.email && <div className="text-[10px] text-slate-400 truncate">{u.email}</div>}
                  </span>
                  {value === u.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPicker;
