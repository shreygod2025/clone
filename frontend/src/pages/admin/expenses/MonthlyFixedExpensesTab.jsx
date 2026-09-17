/**
 * Monthly Fixed Expenses — recurring per-month fixed cost view.
 * v1 focuses on team salaries (largest fixed cost). Rows come from
 * `/api/salaries` filtered by month, with a bulk-import CTA that
 * re-uses the existing `ImportSalariesModal`.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Upload, RefreshCw, IndianRupee, TrendingUp, TrendingDown,
  Users as UsersIcon, Calendar,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useAuth } from '../../../context/AuthContext';
import ImportSalariesModal from '../../../components/ImportSalariesModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const currentMonth = () => format(new Date(), 'yyyy-MM');

const StatCard = ({ label, value, icon: Icon, tone = 'slate' }) => {
  const toneMap = {
    slate:   { bg: 'bg-slate-50',   ic: 'text-slate-600',   text: 'text-slate-900'   },
    emerald: { bg: 'bg-emerald-50', ic: 'text-emerald-700', text: 'text-emerald-900' },
    amber:   { bg: 'bg-amber-50',   ic: 'text-amber-700',   text: 'text-amber-900'   },
    rose:    { bg: 'bg-rose-50',    ic: 'text-rose-700',    text: 'text-rose-900'    },
    indigo:  { bg: 'bg-indigo-50',  ic: 'text-indigo-700',  text: 'text-indigo-900'  },
  }[tone];
  return (
    <div className={`rounded-xl border border-slate-100 p-4 ${toneMap.bg}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
        <Icon className={`w-3.5 h-3.5 ${toneMap.ic}`} /> {label}
      </div>
      <div className={`mt-1 text-2xl font-black ${toneMap.text}`}>{value}</div>
    </div>
  );
};

export default function MonthlyFixedExpensesTab() {
  const { getAuthHeaders } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total_base: 0, total_incentive: 0, total_deduction: 0, total_net: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        axios.get(`${API}/salaries?month=${month}&limit=500`, { headers: getAuthHeaders() }),
        axios.get(`${API}/salaries/summary?month=${month}`, { headers: getAuthHeaders() }),
      ]);
      setRecords(Array.isArray(listRes.data) ? listRes.data : []);
      setSummary(sumRes.data || {});
    } catch (e) {
      toast.error('Failed to load monthly fixed expenses');
    } finally {
      setLoading(false);
    }
  }, [month, getAuthHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalFixed = useMemo(() => Number(summary.total_net || 0), [summary]);

  return (
    <div className="space-y-6" data-testid="monthly-fixed-tab">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Month
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 h-10 px-3 border border-slate-200 rounded-lg text-sm"
            data-testid="monthly-fixed-month-picker"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            onClick={() => setImportOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            data-testid="import-salary-sheet-btn"
          >
            <Upload className="w-4 h-4 mr-1.5" /> Import Salary Sheet
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total Fixed Cost" value={fmtINR(totalFixed)} icon={IndianRupee} tone="indigo" />
        <StatCard label="Total Base" value={fmtINR(summary.total_base)} icon={IndianRupee} tone="slate" />
        <StatCard label="Total Incentive" value={fmtINR(summary.total_incentive)} icon={TrendingUp} tone="emerald" />
        <StatCard label="Total Deduction" value={fmtINR(summary.total_deduction)} icon={TrendingDown} tone="rose" />
        <StatCard label="Members Paid" value={summary.count || 0} icon={UsersIcon} tone="amber" />
      </div>

      {/* Records table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="font-black text-[#1E3A5F]">Salaries — {month}</div>
          <span className="text-xs text-slate-500">{records.length} records</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm" data-testid="monthly-fixed-empty">
            No salary records for {month}. Click "Import Salary Sheet" to upload an Excel / CSV,
            or open the org chart to add a member's monthly record.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 text-left">Team Member</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-right">Base</th>
                  <th className="px-4 py-2 text-right">Incentive</th>
                  <th className="px-4 py-2 text-right">Deduction</th>
                  <th className="px-4 py-2 text-right">Net Paid</th>
                  <th className="px-4 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`salary-row-${r.id}`}>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{r.user_name || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.user_email || '—'}</td>
                    <td className="px-4 py-2.5 text-right">{fmtINR(r.base_salary)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-700">{fmtINR(r.incentive)}</td>
                    <td className="px-4 py-2.5 text-right text-rose-700">{fmtINR(r.deduction)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#0A1F44]">{fmtINR(r.net_paid)}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[220px] truncate">{r.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 text-slate-700 text-xs font-bold">
                <tr>
                  <td className="px-4 py-2" colSpan={2}>Totals</td>
                  <td className="px-4 py-2 text-right">{fmtINR(summary.total_base)}</td>
                  <td className="px-4 py-2 text-right text-emerald-700">{fmtINR(summary.total_incentive)}</td>
                  <td className="px-4 py-2 text-right text-rose-700">{fmtINR(summary.total_deduction)}</td>
                  <td className="px-4 py-2 text-right text-[#0A1F44]">{fmtINR(summary.total_net)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <ImportSalariesModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { setImportOpen(false); fetchAll(); }}
      />
    </div>
  );
}
