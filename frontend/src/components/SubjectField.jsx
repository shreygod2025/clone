import { useRef } from 'react';

const VARIABLES = [
  { token: '{{first_name}}', label: 'First name' },
  { token: '{{last_name}}',  label: 'Last name' },
  { token: '{{school}}',     label: 'School' },
  { token: '{{course}}',     label: 'Course' },
  { token: '{{city}}',       label: 'City' },
];

export default function SubjectField({ value, onChange, 'data-testid': testId }) {
  const inputRef = useRef(null);
  const insertVar = (token) => {
    const el = inputRef.current;
    if (!el) { onChange((value || '') + token); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const newVal = (value || '').slice(0, start) + token + (value || '').slice(end);
    onChange(newVal);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); }, 0);
  };
  return (
    <div className="flex items-stretch gap-1">
      <input
        ref={inputRef}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. {{first_name}}, here's what's new at OLL"
        className="flex-1 px-3 py-2 border border-slate-300 rounded-l-lg text-sm"
        data-testid={testId}
      />
      <div className="relative group">
        <button type="button" className="h-full px-3 border border-slate-300 border-l-0 rounded-r-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 whitespace-nowrap" data-testid="subject-vars">
          {'{{·}}'}
        </button>
        <div className="absolute top-full right-0 z-10 hidden group-hover:block bg-white border border-slate-200 rounded shadow-lg min-w-[160px]">
          {VARIABLES.map(v => (
            <button type="button" key={v.token} onClick={() => insertVar(v.token)} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">
              <code className="text-indigo-700">{v.token}</code> <span className="text-slate-500 ml-1">{v.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
