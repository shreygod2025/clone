import React from 'react';
import { ArrowUpAZ, ArrowDownZA, Clock, X } from 'lucide-react';

/**
 * Reusable sort + date-range filter bar used across CRMs and Orders.
 *
 * Sort options:
 *   - name-asc   → A → Z
 *   - name-desc  → Z → A
 *   - date-desc  → Latest → Oldest
 *   - date-asc   → Oldest → Latest
 */
export const SORT_OPTIONS = [
  { value: '', label: 'Default order' },
  { value: 'name-asc', label: 'Name (A → Z)' },
  { value: 'name-desc', label: 'Name (Z → A)' },
  { value: 'date-desc', label: 'Latest → Oldest' },
  { value: 'date-asc', label: 'Oldest → Latest' },
];

const SortFilterBar = ({
  sort,
  onSortChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  testIdPrefix = 'sfb',
  compact = false,
}) => {
  const size = compact ? 'h-8 text-xs' : 'h-9 text-sm';
  const hasAnything = sort || dateFrom || dateTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={sort || ''}
        onChange={(e) => onSortChange(e.target.value)}
        className={`${size} px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200`}
        data-testid={`${testIdPrefix}-sort`}
        title="Sort"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Month quick-picker — one click sets from/to to the 1st→last of a
          specific month. Handy for month-end reports. */}
      <select
        value=""
        onChange={(e) => {
          const val = e.target.value;
          if (!val) return;
          if (val === 'this-month') {
            const now = new Date();
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            onDateFromChange(first.toISOString().slice(0, 10));
            onDateToChange(last.toISOString().slice(0, 10));
            return;
          }
          if (val === 'last-month') {
            const now = new Date();
            const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const last  = new Date(now.getFullYear(), now.getMonth(), 0);
            onDateFromChange(first.toISOString().slice(0, 10));
            onDateToChange(last.toISOString().slice(0, 10));
            return;
          }
          // Format YYYY-MM → first / last day of that month
          const [y, m] = val.split('-').map(Number);
          const first = new Date(y, m - 1, 1);
          const last  = new Date(y, m, 0);
          onDateFromChange(first.toISOString().slice(0, 10));
          onDateToChange(last.toISOString().slice(0, 10));
        }}
        className={`${size} px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200`}
        data-testid={`${testIdPrefix}-month`}
        title="Filter by month"
      >
        <option value="">Filter by month…</option>
        <option value="this-month">This month</option>
        <option value="last-month">Last month</option>
        <optgroup label="Choose month">
          {(() => {
            const now = new Date();
            const options = [];
            for (let i = 0; i < 12; i++) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
              options.push(<option key={key} value={key}>{label}</option>);
            }
            return options;
          })()}
        </optgroup>
      </select>

      <div className="flex items-center gap-1">
        <label className="text-xs text-slate-500 whitespace-nowrap">From</label>
        <input
          type="date"
          value={dateFrom || ''}
          onChange={(e) => onDateFromChange(e.target.value)}
          className={`${size} px-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200`}
          data-testid={`${testIdPrefix}-date-from`}
        />
        <label className="text-xs text-slate-500 whitespace-nowrap">To</label>
        <input
          type="date"
          value={dateTo || ''}
          onChange={(e) => onDateToChange(e.target.value)}
          className={`${size} px-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200`}
          data-testid={`${testIdPrefix}-date-to`}
        />
      </div>

      {hasAnything && (
        <button
          type="button"
          onClick={() => {
            onSortChange('');
            onDateFromChange('');
            onDateToChange('');
          }}
          className={`${size} px-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1 font-semibold`}
          data-testid={`${testIdPrefix}-clear`}
          title="Clear sort & date filter"
        >
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}
    </div>
  );
};

/**
 * Return a *new* sorted+date-filtered list.
 *
 * @param {Array}  list
 * @param {string} sort             one of SORT_OPTIONS
 * @param {string} dateFrom         YYYY-MM-DD (inclusive)
 * @param {string} dateTo           YYYY-MM-DD (inclusive, up to 23:59:59)
 * @param {object} opts
 * @param {string[]} opts.nameFields  candidate name fields to sort on
 * @param {string[]} opts.dateFields  candidate date fields (ISO strings) to sort / filter on
 */
export const applySortFilter = (list, sort, dateFrom, dateTo, opts = {}) => {
  if (!Array.isArray(list)) return [];
  const nameFields = opts.nameFields || ['child_name', 'student_name', 'name', 'parent_name'];
  const dateFields = opts.dateFields || ['created_at', 'createdAt', 'created', 'booked_at', 'date'];

  const getName = (item) => {
    for (const f of nameFields) {
      if (item?.[f]) return String(item[f]);
    }
    return '';
  };
  const getDate = (item) => {
    for (const f of dateFields) {
      if (item?.[f]) {
        const t = new Date(item[f]).getTime();
        if (!Number.isNaN(t)) return t;
      }
    }
    return 0;
  };

  let out = list;

  if (dateFrom || dateTo) {
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    out = out.filter((item) => {
      const t = getDate(item);
      if (!t) return false;
      if (fromMs && t < fromMs) return false;
      if (toMs && t > toMs) return false;
      return true;
    });
  }

  if (sort) {
    out = [...out].sort((a, b) => {
      switch (sort) {
        case 'name-asc':
          return getName(a).toLowerCase().localeCompare(getName(b).toLowerCase());
        case 'name-desc':
          return getName(b).toLowerCase().localeCompare(getName(a).toLowerCase());
        case 'date-desc':
          return getDate(b) - getDate(a);
        case 'date-asc':
          return getDate(a) - getDate(b);
        default:
          return 0;
      }
    });
  }

  return out;
};

export default SortFilterBar;
