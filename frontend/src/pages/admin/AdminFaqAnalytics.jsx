/**
 * AdminFaqAnalytics — /admin/faq-analytics
 *
 * AI Resolutions dashboard. Shows one row per unique normalised question
 * (so follow-ups in the same session + near-duplicates collapse) with:
 *   - Sort: most asked / least asked / latest / oldest / most liked /
 *     most disliked.
 *   - Inline AI reply with "See full reply" expand (DOMPurify-sanitised).
 *   - 👍 → saves the AI's reply as a canonical answer (next time the same
 *          question is asked, we skip the LLM and return it instantly).
 *   - 👎 → opens an inline textarea; admin types the correct answer and
 *          saves — same short-circuit, but tagged as "corrected" so the
 *          dashboard knows it was hand-trained.
 *
 * Data source: GET /api/admin/faq-chat/analytics
 * Writes:      POST /api/admin/faq-chat/canonical-answer
 *              DELETE /api/admin/faq-chat/canonical-answer?question=…
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import {
  Sparkles, ThumbsUp, ThumbsDown, Users, MessageSquare, RefreshCw, ExternalLink,
  Clock, ChevronDown, ChevronUp, CheckCircle, Edit3, Loader2, Trash2,
} from 'lucide-react';
import { AdminLayout } from './AdminDashboard';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { mdToHtml } from '../../utils/richContent';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminFaqAnalytics = () => {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [sort, setSort] = useState('count_desc');
  const [expandedKey, setExpandedKey] = useState('');
  const [correctingKey, setCorrectingKey] = useState('');
  const [correctionText, setCorrectionText] = useState('');
  const [savingKey, setSavingKey] = useState('');

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
    const costPerQuery = typeof data.inr_per_query === 'number' ? data.inr_per_query : 0;
    const freeHits = (data.cache_hits || 0) + (data.pre_canned_hits || 0);
    return [
      { label: 'Total queries', value: data.total_queries || 0, suffix: freeHits > 0 ? `${freeHits} free (${data.free_hit_rate || 0}%)` : '', icon: MessageSquare, tint: 'bg-blue-50 text-blue-600' },
      { label: 'Unique visitors', value: data.unique_visitors || 0, icon: Users, tint: 'bg-emerald-50 text-emerald-600' },
      { label: 'Admin feedback', value: `${tu} 👍 · ${td} 👎`, icon: ThumbsUp, tint: 'bg-purple-50 text-purple-600' },
      { label: 'Est. cost (₹)', value: `₹${data.total_cost_inr || 0}`, suffix: costPerQuery ? `@ ₹${costPerQuery}/query` : '', icon: Sparkles, tint: 'bg-amber-50 text-amber-600' },
    ];
  }, [data]);

  const saveCanonical = async (q, answer, verdict) => {
    const key = q.normalised || q.sample_question;
    setSavingKey(key);
    try {
      await axios.post(`${API}/admin/faq-chat/canonical-answer`, {
        question: q.sample_question,
        answer,
        verdict,
        log_id: q.latest_log_id || '',
      }, { headers: getAuthHeaders() });
      toast.success(verdict === 'corrected' ? 'Trained with your corrected answer' : 'Approved — this reply is now canonical');
      setCorrectingKey('');
      setCorrectionText('');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not save answer');
    } finally {
      setSavingKey('');
    }
  };

  const revertCanonical = async (q) => {
    if (!window.confirm('Remove the trained override? Future visitors will get a freshly-generated AI answer.')) return;
    try {
      await axios.delete(`${API}/admin/faq-chat/canonical-answer`, {
        params: { question: q.sample_question },
        headers: getAuthHeaders(),
      });
      toast.success('Trained override removed');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not remove override');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-5" data-testid="admin-faq-analytics">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-[#D63031]">AI Resolutions</div>
            <h2 className="text-lg font-black text-[#0A1F44] mt-1">What visitors are asking OLLBot</h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Every question hitting <code>/faq</code> is grouped by similarity. Expand a row to
              see the AI's reply, thumbs-up to make it the canonical answer, or thumbs-down to
              retrain with the correct response.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={days} onChange={(e) => setDays(parseInt(e.target.value))} className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white" data-testid="admin-faq-analytics-days">
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white" data-testid="admin-faq-analytics-sort">
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
            <a href="/admin/faq-settings" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0A1F44] bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-2">
              Edit chatbot <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k, i) => {
            const Icon = k.icon;
            return (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${k.tint} flex items-center justify-center`}><Icon className="w-4 h-4" /></div>
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

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
            <div className="font-bold text-sm text-[#0A1F44]">Grouped questions · click a row to see the AI reply</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Follow-ups in the same session + near-duplicates ("What's RoboSumo?" vs "what is robosumo") collapse into one row.
            </div>
          </div>
          {loading && !data ? (
            <div className="p-10 text-center text-slate-400 text-sm">Loading analytics…</div>
          ) : !data?.top_queries?.length ? (
            <div className="p-10 text-center text-slate-400 text-sm">No chatbot queries yet in this window.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.top_queries.map((q, i) => {
                const key = q.normalised || q.sample_question || `q-${i}`;
                const isOpen = expandedKey === key;
                const isCorrecting = correctingKey === key;
                const trained = !!q.canonical_answer;
                const trainedVerdict = q.canonical_verdict;
                const displayedAnswer = trained ? q.canonical_answer : (q.latest_answer || q.latest_answer_preview || '');
                const previewLines = (displayedAnswer || '').split('\n').slice(0, 2).join(' ').slice(0, 180);
                return (
                  <div key={key} className="hover:bg-slate-50/60" data-testid={`admin-faq-row-${i}`}>
                    <div
                      className="px-4 py-3 flex items-start gap-3 cursor-pointer"
                      onClick={() => setExpandedKey(isOpen ? '' : key)}
                    >
                      <div className="text-xs text-slate-400 w-6 pt-0.5">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#0A1F44] break-words">
                          {q.sample_question}
                          {trained && (
                            <span className={`ml-2 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${trainedVerdict === 'corrected' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              <CheckCircle className="w-3 h-3" />
                              {trainedVerdict === 'corrected' ? 'Trained · corrected' : 'Approved'}
                            </span>
                          )}
                        </div>
                        {!isOpen && (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] mr-1.5">AI reply</span>
                            {previewLines || <span className="italic">No answer logged</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 whitespace-nowrap pt-0.5">
                        <div className="text-right">
                          <div className="font-black text-[#0A1F44] text-base leading-tight">{q.count}</div>
                          <div className="text-[9px] uppercase tracking-widest text-slate-400">asked</div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <div className="font-semibold text-slate-700">{q.unique_visitors}</div>
                          <div className="text-[9px] uppercase tracking-widest text-slate-400">visitors</div>
                        </div>
                        <div className="text-right hidden md:block">
                          <span className="text-emerald-600 font-semibold">{q.thumbs_up}</span>
                          <span className="text-slate-300 mx-0.5">/</span>
                          <span className="text-red-600 font-semibold">{q.thumbs_down}</span>
                        </div>
                        <div className="text-right hidden lg:flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {q.last_asked ? new Date(q.last_asked).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="px-4 pb-4 pl-14 bg-slate-50/40 border-t border-slate-100">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-3 mb-1">
                          {trained ? `Admin-trained answer · ${trainedVerdict}` : 'Latest AI reply'}
                        </div>
                        <div
                          className="prose prose-sm max-w-none text-slate-700 bg-white rounded-xl border border-slate-200 p-4 text-sm leading-relaxed"
                          data-testid={`admin-faq-answer-${i}`}
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(mdToHtml(displayedAnswer || '_No answer logged yet._')) }}
                        />

                        {!isCorrecting && (
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              disabled={savingKey === key}
                              onClick={() => saveCanonical(q, displayedAnswer, 'approved')}
                              className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-full px-3 py-1.5 disabled:opacity-50"
                              data-testid={`admin-faq-thumbs-up-${i}`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" /> Thumbs-up · save as canonical
                            </button>
                            <button
                              type="button"
                              onClick={() => { setCorrectingKey(key); setCorrectionText(displayedAnswer || ''); }}
                              className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 rounded-full px-3 py-1.5"
                              data-testid={`admin-faq-thumbs-down-${i}`}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" /> Thumbs-down · train with correct answer
                            </button>
                            {trained && (
                              <button
                                type="button"
                                onClick={() => revertCanonical(q)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-full px-3 py-1.5"
                                data-testid={`admin-faq-revert-${i}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove override
                              </button>
                            )}
                            <div className="text-[11px] text-slate-400 ml-auto">
                              {q.session_count || 0} session{(q.session_count || 0) === 1 ? '' : 's'} · source: <span className="font-semibold">{q.latest_source || 'llm'}</span>
                            </div>
                          </div>
                        )}

                        {isCorrecting && (
                          <div className="mt-3">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                              <Edit3 className="inline w-3 h-3 mr-1" /> Correct answer (markdown supported)
                            </label>
                            <textarea
                              className="w-full min-h-[140px] p-3 rounded-xl border border-slate-200 focus:border-[#D63031] focus:outline-none text-sm font-mono"
                              value={correctionText}
                              onChange={(e) => setCorrectionText(e.target.value)}
                              placeholder="Type the correct answer. This replaces the AI reply for this question going forward."
                              data-testid={`admin-faq-correction-${i}`}
                            />
                            <div className="mt-2 flex items-center gap-2">
                              <Button
                                size="sm"
                                className="btn-primary"
                                disabled={savingKey === key || !correctionText.trim()}
                                onClick={() => saveCanonical(q, correctionText.trim(), 'corrected')}
                                data-testid={`admin-faq-correction-save-${i}`}
                              >
                                {savingKey === key ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                                Save &amp; train
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setCorrectingKey(''); setCorrectionText(''); }}>
                                Cancel
                              </Button>
                            </div>
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
    </AdminLayout>
  );
};

export default AdminFaqAnalytics;
