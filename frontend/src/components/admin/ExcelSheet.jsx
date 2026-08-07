import React from 'react';
import { Check } from 'lucide-react';

/**
 * Shared Excel-style building blocks for the Future Skills CRM.
 *
 * Deliberately minimal — these are only visual wrappers; the parent tables
 * still control their own data flow, actions and modals so the functional
 * surface area is untouched.
 */

// ── Row-color palette ────────────────────────────────────────────────
// Kept intentionally narrow (7 highlights + None) so admins don't fatigue
// over choice. Values are stored on the document as `row_color` and used
// to compute both the tint (row background) and the dot indicator.
export const ROW_COLORS = [
  { key: '',       label: 'None',   dot: 'bg-white border-slate-300',      tint: '' },
  { key: 'yellow', label: 'Yellow', dot: 'bg-yellow-300 border-yellow-400', tint: 'bg-yellow-50' },
  { key: 'green',  label: 'Green',  dot: 'bg-emerald-400 border-emerald-500', tint: 'bg-emerald-50' },
  { key: 'red',    label: 'Red',    dot: 'bg-rose-400 border-rose-500',       tint: 'bg-rose-50' },
  { key: 'blue',   label: 'Blue',   dot: 'bg-sky-400 border-sky-500',         tint: 'bg-sky-50' },
  { key: 'purple', label: 'Purple', dot: 'bg-violet-400 border-violet-500',   tint: 'bg-violet-50' },
  { key: 'pink',   label: 'Pink',   dot: 'bg-pink-300 border-pink-400',       tint: 'bg-pink-50' },
  { key: 'gray',   label: 'Gray',   dot: 'bg-slate-300 border-slate-400',     tint: 'bg-slate-100' },
];

export const rowTintClass = (color) =>
  (ROW_COLORS.find((c) => c.key === color) || ROW_COLORS[0]).tint;

/**
 * <RowColorPicker /> — small palette that hovers off the last column.
 * `current` is the current color key, `onChange(nextKey)` is called when
 * the user picks a new one. The dot itself opens the popover on click.
 */
export const RowColorPicker = ({ current, onChange, testId = 'row-color' }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const off = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, []);
  const currentCfg = ROW_COLORS.find((c) => c.key === current) || ROW_COLORS[0];

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`w-4 h-4 rounded-sm border-2 ${currentCfg.dot} hover:scale-110 transition-transform`}
        data-testid={`${testId}-btn`}
        title={`Row color: ${currentCfg.label}`}
        aria-label="Change row color"
      />
      {open && (
        <div
          className="absolute right-0 top-6 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 flex gap-1"
          data-testid={`${testId}-popover`}
          onClick={(e) => e.stopPropagation()}
        >
          {ROW_COLORS.map((c) => (
            <button
              key={c.key || 'none'}
              type="button"
              onClick={() => { onChange(c.key); setOpen(false); }}
              className={`w-5 h-5 rounded-sm border-2 ${c.dot} hover:scale-110 relative flex items-center justify-center`}
              title={c.label}
              data-testid={`${testId}-opt-${c.key || 'none'}`}
            >
              {current === c.key && <Check className="w-3 h-3 text-slate-800" strokeWidth={3} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
