import React from 'react';

/**
 * Shared Excel-style building blocks for the Future Skills CRM.
 *
 * Deliberately minimal — these are only visual wrappers; the parent tables
 * still control their own data flow, actions and modals so the functional
 * surface area is untouched.
 */

/**
 * Status → row tint mapping. Colors match the StatusBadge palette so
 * admins get an instant visual signal of the pipeline stage without
 * needing a manual color picker.
 *   new         → blue
 *   followup    → yellow (call back)
 *   no_answer   → red
 *   interested  → green
 * Anything else falls through to the default (no tint).
 */
const STATUS_TINT = {
  new:        'bg-sky-50',
  followup:   'bg-yellow-50',
  no_answer:  'bg-rose-50',
  interested: 'bg-emerald-50',
  // Trials / customers pipeline statuses reuse the same palette conceptually
  scheduled:      'bg-sky-50',
  rescheduled:    'bg-yellow-50',
  trial_scheduled:'bg-sky-50',
  completed:      'bg-emerald-50',
  contacted:      'bg-yellow-50',
  qualified:      'bg-emerald-50',
  active:         'bg-emerald-50',
  overdue:        'bg-rose-50',
  upcoming:       'bg-yellow-50',
};

export const rowTintClass = (status) => STATUS_TINT[status] || '';

/**
 * <SheetTabs /> — bottom-of-Excel-workbook tab strip. Active tab appears
 * "lifted" on white background; inactive tabs sit lower on a muted bg.
 *
 * Props:
 *   tabs   — [{ key, label, count? }]
 *   active — the active key
 *   onChange(key) — callback
 */
export const SheetTabs = ({ tabs, active, onChange, testIdPrefix = 'sheet-tab' }) => (
  <div
    className="flex items-end gap-0.5 bg-slate-100 border-b border-slate-300 px-2 pt-1 overflow-x-auto scrollbar-thin"
    data-testid="sheet-tabs"
  >
    {tabs.map((t) => {
      const isActive = active === t.key;
      return (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`shrink-0 px-3 py-1.5 text-[12px] font-semibold border border-slate-300 border-b-0 rounded-t-md transition-colors ${
            isActive
              ? 'bg-white text-emerald-700 border-b-white -mb-px shadow-[0_-1px_0_#059669_inset]'
              : 'bg-slate-200/70 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
          data-testid={`${testIdPrefix}-${t.key}`}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span className={`ml-1.5 text-[10px] font-bold ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
              {t.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

/**
 * Wrapper for tables that need the Excel look.
 * Provides the outer border + inner grid lines used by all sheet tables.
 */
export const SheetTable = ({ children, testId = 'sheet-table' }) => (
  <div className="w-full overflow-x-auto bg-white border border-slate-300 rounded-b-lg" data-testid={testId}>
    <table className="w-full text-[12px] border-collapse font-['Inter',_'Segoe_UI',_sans-serif]">
      {children}
    </table>
  </div>
);

// Column header cell — Excel style: gray, tight, uppercase
export const SheetTh = ({ children, className = '', width }) => (
  <th
    className={`text-left px-2 py-1.5 font-bold text-[11px] uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-300 whitespace-nowrap ${className}`}
    style={width ? { width, minWidth: width } : undefined}
  >
    {children}
  </th>
);

/**
 * Clickable column header. Click cycles: asc → desc → none.
 * `currentSort` is one of e.g. 'name-asc' | 'name-desc' | ''.
 */
export const SheetSortTh = ({ label, sortKey, currentSort, onSort, className = '', width }) => {
  const asc = `${sortKey}-asc`;
  const desc = `${sortKey}-desc`;
  const isAsc = currentSort === asc;
  const isDesc = currentSort === desc;
  const next = isAsc ? desc : (isDesc ? '' : asc);
  return (
    <SheetTh className={`cursor-pointer select-none hover:bg-slate-200 ${className}`} width={width}>
      <button
        type="button"
        onClick={() => onSort(next)}
        className="flex items-center gap-1 uppercase font-bold w-full text-left"
        data-testid={`sort-${sortKey}`}
      >
        {label}
        <span className="text-[9px] leading-none">
          {isAsc ? '▲' : (isDesc ? '▼' : '▲▼')}
        </span>
      </button>
    </SheetTh>
  );
};

/**
 * Excel-style filter drop-down on a column header. Shows a funnel icon;
 * clicking opens a checklist of unique values from the column.
 * `options` = [{ value, label, count? }], `selected` = string (single-value filter for now).
 */
export const SheetFilterTh = ({ label, options = [], selected = '', onChange, className = '', width, testId }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const off = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, []);
  const active = !!selected;
  return (
    <SheetTh className={className} width={width}>
      <div className="flex items-center gap-1 relative" ref={ref}>
        <span>{label}</span>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`ml-auto text-[10px] px-1 py-0.5 rounded ${active ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
          title={active ? `Filtered: ${selected}` : 'Filter'}
          data-testid={testId ? `${testId}-btn` : undefined}
        >
          ⛭
        </button>
        {open && (
          <div className="absolute right-0 top-6 z-30 bg-white border border-slate-300 rounded-md shadow-lg p-1 min-w-[160px] max-h-[300px] overflow-y-auto normal-case tracking-normal"
               data-testid={testId ? `${testId}-menu` : undefined}>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className={`w-full text-left text-[11px] px-2 py-1 rounded hover:bg-slate-100 ${!selected ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'}`}
            >
              All {label.toLowerCase()}s
            </button>
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left text-[11px] px-2 py-1 rounded hover:bg-slate-100 flex items-center justify-between ${selected === o.value ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'}`}
              >
                <span className="truncate">{o.label}</span>
                {typeof o.count === 'number' && <span className="text-[10px] text-slate-400 ml-1">{o.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </SheetTh>
  );
};

// Data cell — thin border, tight padding
export const SheetTd = ({ children, className = '', onClick, title, testId, colSpan }) => (
  <td
    className={`px-2 py-1 border border-slate-200 align-middle ${className}`}
    onClick={onClick}
    title={title}
    data-testid={testId}
    colSpan={colSpan}
  >
    {children}
  </td>
);
