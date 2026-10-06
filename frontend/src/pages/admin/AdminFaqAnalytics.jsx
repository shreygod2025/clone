/**
 * AdminFaqAnalytics — /admin/faq-analytics
 *
 * AI Resolutions dashboard — one row per unique visitor question (normalised),
 * sorted by frequency. Lets support team see what users keep asking so they
 * can either tune the chatbot's knowledge base or improve the live product.
 *
 * Data source: GET /api/admin/faq-chat/analytics
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Sparkles, ThumbsUp, ThumbsDown, Users, MessageSquare, RefreshCw, ExternalLink,
  Clock,
} from 'lucide-react';
import { AdminLayout } from './AdminDashboard';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminFaqAnalytics = () => {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [sort, setSort] = useState('count_desc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/faq-chat/analytics`, {
        params: { days, sort },
        headers: getAuthHeaders(),
      });
      setData(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [days, sort, getAuthHeaders]);

  useEffect(() => { load(); }, [load]);

  const kpis = useMemo(() => {
    if (!data) return [];
    const td = data.thumbs_down || 0;
    const tu = data.thumbs_up || 0;
    const feedbackRate = (td + tu) > 0 ? Math.round((td / (td + tu)) * 100) : 0;
    const costPerQuery = typeof data.inr_per_query === 'number' ? data.inr_per_query : 0;
    const freeHits = (data.cache_hits || 0) + (data.pre_canned_hits || 0);
    return [
      {
        label: 'Total queries', value: data.total_queries || 0,
        suffix: freeHits > 0 ? `${freeHits} free (${data.free_hit_rate || 0}%)` : '',
        icon: MessageSquare, tint: 'bg-blue-50 text-blue-600',
      },
      { label: 'Unique visitors', value: data.unique_visitors || 0, icon: Users, tint: 'bg-emerald-50 text-emerald-600' },
      { label: 'Thumbs up / down', value: `${tu} / ${td}`, suffix: td + tu > 0 ? `${feedbackRate}% ↓` : '', icon: ThumbsUp, tint: 'bg-amber-50 text-amber-600' },
      {
        label: 'Est. AI cost (INR)',
        value: `₹${(data.total_cost_inr || 0).toLocaleString('en-IN')}`,
        suffix: `${data.billed_queries || 0} billed · ₹${costPerQuery.toFixed(2)}/query`,
        icon: Sparkles,
        tint: 'bg-red-50 text-red-600',
      },
    ];
  }, [data]);

  return (
    <AdminLayout title="AI Resolutions · OLLBot">
      <div className="space-y-6" data-testid="admin-faq-analytics">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#D63031]">
              <Sparkles className="w-3.5 h-3.5" /> AI Resolutions
            </div>
            <h2 className="text-lg font-black text-[#0A1F44] mt-1">What visitors are asking OLLBot</h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Every question hitting <code>/faq</code> is logged and deduped. Use this
              to tune the chatbot knowledge base at Admin → Settings → FAQ Chatbot.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white"
              data-testid="admin-faq-analytics-days"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white"
              data-testid="admin-faq-analytics-sort"
            >
              <option value="count_desc">Most asked first</option>
              <option value="count_asc">Least asked first</option>
              <option value="latest">Latest first</option>
              <option value="oldest">Earliest first</option>
              <option value="most_liked">Most liked (👍)</option>
              <option value="most_disliked">Most disliked (👎)</option>
            </select>
            <Button variant="outline" onClick={load} disabled={loading} data-testid="admin-faq-analytics-reload">
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <a
              href="/admin/faq-settings"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0A1F44] bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-2"
            >
              Edit chatbot <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k, i) => {
            const Icon = k.icon;
            return (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${k.tint} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{k.label}</div>
                </div>
                <div className="text-2xl font-black text-[#0A1F44]">
                  {k.value}
                  {k.suffix && <span className="text-sm font-semibold text-slate-500 ml-1">· {k.suffix}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Top queries table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
            <div className="font-bold text-sm text-[#0A1F44]">Top asked (grouped by similarity)</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Questions are normalised (lowercase, punctuation stripped) before grouping — so "What's RoboSumo?" and "what is robosumo" count as one.
            </div>
          </div>
          {loading && !data ? (
            <div className="p-10 text-center text-slate-400 text-sm">Loading analytics…</div>
          ) : !data?.top_queries?.length ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              No chatbot queries yet in this window.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="admin-faq-analytics-table">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">#</th>
                    <th className="text-left px-4 py-2 font-semibold">Question</th>
                    <th className="text-right px-4 py-2 font-semibold">Asked</th>
                    <th className="text-right px-4 py-2 font-semibold">Visitors</th>
                    <th className="text-right px-4 py-2 font-semibold">👍 / 👎</th>
                    <th className="text-right px-4 py-2 font-semibold">Last asked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.top_queries.map((q, i) => (
                    <tr key={q.normalised || i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 text-slate-800 max-w-[500px] break-words">
                        {q.sample_question}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#0A1F44]">{q.count}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{q.unique_visitors}</td>
                      <td className="px-4 py-3 text-right text-xs">
                        <span className="text-emerald-600 font-semibold">{q.thumbs_up}</span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="text-red-600 font-semibold">{q.thumbs_down}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 text-xs whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {q.last_asked ? new Date(q.last_asked).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFaqAnalytics;
