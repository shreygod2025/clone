/**
 * Projects P&L — one row per project with total expenses; click any row
 * to expand and see the itemised expense list for that project.
 *
 * Data sources:
 *   /api/projects  → list of projects (already scoped by permissions)
 *   /api/school-expenses/project/{project_id}  → per-project expenses
 */
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  RefreshCw, IndianRupee, ChevronDown, ChevronRight, Briefcase,
  ExternalLink, Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { useAuth } from '../../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
};

const STATUS_TINT = {
  active:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  on_hold:   'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  archived:  'bg-slate-100 text-slate-600 border-slate-200',
};

export default function ProjectsPnLTab() {
  const { getAuthHeaders } = useAuth();
  const [projects, setProjects] = useState([]);
  const [totals, setTotals] = useState({});      // { [projectId]: { total, count } }
  const [expanded, setExpanded] = useState({});  // { [projectId]: [expenses] | 'loading' | 'error' }
  const [loading, setLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/projects`, { headers: getAuthHeaders() });
      const items = Array.isArray(res.data) ? res.data : [];
      setProjects(items);

      // Fan out per-project totals so the roll-up is populated immediately.
      const nextTotals = {};
      await Promise.all(items.map(async (p) => {
        try {
          const r = await axios.get(`${API}/school-expenses/project/${p.id}`, { headers: getAuthHeaders() });
          const er = await axios.get(`${API}/projects/${p.id}/earnings`, { headers: getAuthHeaders() })
            .catch(() => ({ data: { total: 0, earnings: [] } }));
          nextTotals[p.id] = { total: r.data.total || 0, count: r.data.count || 0, expenses: r.data.expenses || [],
            earned: er.data.total || 0, earnings: er.data.earnings || [] };
        } catch {
          nextTotals[p.id] = { total: 0, count: 0, expenses: [], earned: 0, earnings: [] };
        }
      }));
      setTotals(nextTotals);
    } catch (e) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const toggle = (pid) => setExpanded((prev) => ({ ...prev, [pid]: !prev[pid] }));

  const grandTotal = projects.reduce((s, p) => s + (totals[p.id]?.total || 0), 0);
  const grandCount = projects.reduce((s, p) => s + (totals[p.id]?.count || 0), 0);
  const grandEarned = projects.reduce((s, p) => s + (totals[p.id]?.earned || 0), 0);
  const grandNet = grandEarned - grandTotal;

  return (
    <div className="space-y-6" data-testid="projects-pnl-tab">
      {/* Toolbar + summary */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-1">
          <div className="rounded-xl border border-slate-100 p-4 bg-slate-50">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" /> Projects
            </div>
            <div className="mt-1 text-2xl font-black text-slate-900">{projects.length}</div>
          </div>
          <div className="rounded-xl border border-slate-100 p-4 bg-emerald-50" data-testid="projects-pnl-total-earnings">
            <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" /> Total Earnings
            </div>
            <div className="mt-1 text-2xl font-black text-emerald-900">{fmtINR(grandEarned)}</div>
          </div>
          <div className={`rounded-xl border border-slate-100 p-4 ${grandNet >= 0 ? 'bg-teal-50' : 'bg-red-50'}`} data-testid="projects-pnl-net">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" /> Net {grandNet >= 0 ? 'Profit' : 'Loss'}
            </div>
            <div className={`mt-1 text-2xl font-black ${grandNet >= 0 ? 'text-teal-800' : 'text-red-700'}`}>{fmtINR(grandNet)}</div>
          </div>
          <div className="rounded-xl border border-slate-100 p-4 bg-rose-50">
            <div className="text-[11px] font-bold uppercase tracking-widest text-rose-700 flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" /> Total Spend
            </div>
            <div className="mt-1 text-2xl font-black text-rose-900">{fmtINR(grandTotal)}</div>
          </div>
          <div className="rounded-xl border border-slate-100 p-4 bg-indigo-50">
            <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Entries
            </div>
            <div className="mt-1 text-2xl font-black text-indigo-900">{grandCount}</div>
          </div>
        </div>
        <Button variant="outline" onClick={fetchProjects} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Projects table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-black text-[#1E3A5F]">
          Project-wise P&amp;L (earnings excl. GST − expenses)
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm" data-testid="projects-pnl-empty">
            No projects yet. Create one under <Link to="/admin/projects" className="text-blue-600 underline">Projects</Link>.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {projects.map((p) => {
              const t = totals[p.id] || { total: 0, count: 0, expenses: [] };
              const isOpen = !!expanded[p.id];
              const tint = STATUS_TINT[p.status] || STATUS_TINT.active;
              return (
                <div key={p.id} data-testid={`project-row-${p.id}`}>
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left"
                    data-testid={`project-toggle-${p.id}`}
                  >
                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                    <span
                      className="w-2 h-8 rounded"
                      style={{ background: p.color || '#3B82F6' }}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-bold text-[#0F1E33]">{p.name}</div>
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${tint}`}>
                          {p.status?.replace('_', ' ') || 'active'}
                        </span>
                        {p.lead_name && (
                          <span className="text-[11px] text-slate-500">Lead: {p.lead_name}</span>
                        )}
                      </div>
                      {p.description && (
                        <div className="text-xs text-slate-500 truncate">{p.description}</div>
                      )}
                    </div>
                    <div className="text-right min-w-[90px]" data-testid={`project-earned-${p.id}`}>
                      <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-bold">Earned</div>
                      <div className="text-sm font-black text-emerald-800">{fmtINR(t.earned)}</div>
                    </div>
                    <div className="text-right min-w-[90px]">
                      <div className="text-[10px] uppercase tracking-wide text-rose-700 font-bold">Spent · {t.count}</div>
                      <div className="text-sm font-black text-rose-800">{fmtINR(t.total)}</div>
                    </div>
                    <div className="text-right min-w-[100px]" data-testid={`project-net-${p.id}`}>
                      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Net</div>
                      <div className={`text-lg font-black ${(t.earned || 0) - t.total >= 0 ? 'text-teal-700' : 'text-red-600'}`}>{fmtINR((t.earned || 0) - t.total)}</div>
                    </div>
                    <Link
                      to={`/admin/projects/${p.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-2 text-slate-400 hover:text-slate-700"
                      title="Open project"
                      data-testid={`project-open-${p.id}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </button>

                  {isOpen && (
                    <div className="bg-slate-50 px-4 py-3 space-y-3" data-testid={`project-expenses-${p.id}`}>
                      <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Earnings</div>
                      {(t.earnings || []).length === 0 ? (
                        <div className="text-sm text-slate-500 italic">No earnings recorded for this project yet.</div>
                      ) : (
                        <table className="w-full text-sm bg-white rounded-lg overflow-hidden" data-testid={`project-earnings-list-${p.id}`}>
                          <thead className="bg-emerald-50 text-emerald-800 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="px-3 py-2 text-left">Date</th>
                              <th className="px-3 py-2 text-left">Client / Source</th>
                              <th className="px-3 py-2 text-left">Invoice</th>
                              <th className="px-3 py-2 text-right">Base</th>
                              <th className="px-3 py-2 text-right">Incl. GST</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.earnings.map((e) => (
                              <tr key={e.id} className="border-t border-slate-100">
                                <td className="px-3 py-2 text-xs">{fmtDate(e.earning_date)}</td>
                                <td className="px-3 py-2 text-xs font-semibold">{e.source || '—'}{e.description ? <span className="font-normal text-slate-500"> · {e.description}</span> : null}</td>
                                <td className="px-3 py-2 text-xs">{e.invoice_number || '—'}{e.invoice_url && <a href={e.invoice_url} target="_blank" rel="noreferrer" className="ml-1 text-blue-600 underline">file</a>}</td>
                                <td className="px-3 py-2 text-right font-bold text-emerald-800">{fmtINR(e.amount)}</td>
                                <td className="px-3 py-2 text-right text-slate-600">{fmtINR(e.total_amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <div className="text-[11px] font-bold uppercase tracking-widest text-rose-700">Expenses</div>
                      {t.expenses.length === 0 ? (
                        <div className="text-sm text-slate-500 italic py-2">
                          No expenses logged against this project yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
                            <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                              <tr>
                                <th className="px-3 py-2 text-left">Date</th>
                                <th className="px-3 py-2 text-left">School / Vendor</th>
                                <th className="px-3 py-2 text-left">Category</th>
                                <th className="px-3 py-2 text-left">Description</th>
                                <th className="px-3 py-2 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {t.expenses.map((e) => (
                                <tr key={e.id} className="border-t border-slate-100">
                                  <td className="px-3 py-2 text-xs text-slate-700">{fmtDate(e.expense_date)}</td>
                                  <td className="px-3 py-2 text-xs font-semibold text-slate-800">
                                    {e.school_name || e.vendor_name || '—'}
                                  </td>
                                  <td className="px-3 py-2 text-xs">
                                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                                      {e.category_name || e.category || '—'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-slate-600 max-w-[300px] truncate">
                                    {e.description || '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-[#0F1E33]">
                                    {fmtINR(e.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
