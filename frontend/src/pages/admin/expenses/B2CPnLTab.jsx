/**
 * B2C P&L — Future Skills centre economics roll-up, surfaced inside the
 * shared Expenses page so admins can see revenue vs cost across all B2C
 * centres alongside their operational expenses.
 *
 * Data source: /api/admin/future-skills/centre-economics
 * (same endpoint AdminFutureSkills → Economics tab consumes).
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  RefreshCw, IndianRupee, TrendingUp, Users as UsersIcon,
  BarChart2, Target, Calendar, ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const CATEGORY_ORDER = ['rent', 'teacher_cost', 'capex', 'marketing', 'other'];
const CATEGORY_COLOUR = {
  rent:         '#1E3A5F',
  teacher_cost: '#DC2626',
  capex:        '#F59E0B',
  marketing:    '#10B981',
  other:        '#7C3AED',
};

export default function B2CPnLTab() {
  const { getAuthHeaders } = useAuth();
  const [month, setMonth] = useState('');    // '' = all months
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      const res = await axios.get(`${API}/admin/future-skills/centre-economics?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      setData(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load B2C P&L');
    } finally {
      setLoading(false);
    }
  }, [month, getAuthHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const summary = useMemo(
    () => data?.summary || { revenue: 0, cost: 0, profit: 0, margin_pct: 0, paying_customers: 0, cost_by_category: {} },
    [data?.summary]
  );
  const perCentre = data?.per_centre || [];

  const costCats = useMemo(() => {
    const map = summary.cost_by_category || {};
    return CATEGORY_ORDER.map((k) => ({ key: k, ...(map[k] || { label: k, amount: 0 }) }));
  }, [summary]);

  return (
    <div className="space-y-6" data-testid="b2c-pnl-tab">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Month (blank = all)
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 h-10 px-3 border border-slate-200 rounded-lg text-sm"
            data-testid="b2c-pnl-month-picker"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Link to="/admin/future-skills" data-testid="b2c-pnl-open-fs-link">
            <Button variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50">
              <ExternalLink className="w-4 h-4 mr-1.5" /> Manage in Future Skills
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Revenue
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-900">{fmtINR(summary.revenue)}</div>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-rose-700 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5" /> Cost
          </div>
          <div className="mt-1 text-2xl font-black text-rose-900">{fmtINR(summary.cost)}</div>
        </div>
        <div className={`rounded-xl border p-4 ${summary.profit >= 0 ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'}`}>
          <div className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-1 ${summary.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            <BarChart2 className="w-3.5 h-3.5" /> Profit
          </div>
          <div className={`mt-1 text-2xl font-black ${summary.profit >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
            {fmtINR(summary.profit)}
          </div>
        </div>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-700 flex items-center gap-1">
            <Target className="w-3.5 h-3.5" /> Margin
          </div>
          <div className="mt-1 text-2xl font-black text-indigo-900">{summary.margin_pct}%</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1">
            <UsersIcon className="w-3.5 h-3.5" /> Paying Customers
          </div>
          <div className="mt-1 text-2xl font-black text-slate-900">{summary.paying_customers || 0}</div>
        </div>
      </div>

      {/* Cost by category */}
      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <div className="font-black text-[#1E3A5F] mb-3">Cost by Category</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {costCats.map((c) => {
            const pct = summary.cost > 0 ? Math.round((c.amount / summary.cost) * 100) : 0;
            return (
              <div key={c.key} className="rounded-xl border border-slate-100 p-3" data-testid={`b2c-pnl-cat-${c.key}`}>
                <div className="text-xs font-black text-[#0F1E33]">{c.label}</div>
                <div className="text-lg font-black text-[#0F1E33] mt-1">{fmtINR(c.amount)}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{pct}%</div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full" style={{ width: `${pct}%`, background: CATEGORY_COLOUR[c.key] || '#1E3A5F' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-centre roll-up */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-black text-[#1E3A5F] flex items-center gap-2">
          <Target className="w-4 h-4" /> Per-centre P&amp;L
        </div>
        {loading ? (
          <LoadingSpinner text="Loading per-centre P&L…" />
        ) : perCentre.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm" data-testid="b2c-pnl-empty">
            No centre economics data for the current filter yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 text-left">Centre</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Cost</th>
                  <th className="px-4 py-2 text-right">Profit</th>
                  <th className="px-4 py-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {perCentre.map((r) => (
                  <tr key={r.center_id} className="border-t border-slate-100" data-testid={`b2c-pnl-centre-${r.center_id}`}>
                    <td className="px-4 py-3 font-bold text-[#0F1E33]">{r.center_name}</td>
                    <td className="px-4 py-3 text-right">{fmtINR(r.revenue)}</td>
                    <td className="px-4 py-3 text-right">{fmtINR(r.cost)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmtINR(r.profit)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.margin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{r.margin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
