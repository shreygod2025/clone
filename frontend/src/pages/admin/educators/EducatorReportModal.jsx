/**
 * EducatorReportModal — monthly performance report for an Active educator.
 *
 * Pulls /api/admin/educators/{id}/report — combines CheckIn attendance,
 * sessions and invoice data.  Admin can pick a month or "All time", see
 * hours/days/on-time/late/absent, OLL T-shirt count, earnings & invoices,
 * plus a daily breakdown.  CSV download + "Email to educator" actions.
 */
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { useAuth } from '../../../context/AuthContext';
import {
  Loader2, Download, Mail, Clock, Calendar, CheckCircle2, AlertTriangle,
  ShirtIcon, Wallet, TrendingUp, X, FileText,
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/** Build the last N (month, label) options plus "all". Uses IST for month keys. */
const buildMonthOptions = (count = 12) => {
  const options = [{ value: 'all', label: 'All time' }];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    options.push({
      value: `${y}-${m}`,
      label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    });
  }
  return options;
};

const Stat = ({ icon: Icon, label, value, sub, tone = 'slate' }) => {
  const toneMap = {
    slate:   'bg-slate-50 text-slate-800',
    emerald: 'bg-emerald-50 text-emerald-800',
    amber:   'bg-amber-50 text-amber-800',
    rose:    'bg-rose-50 text-rose-800',
    sky:     'bg-sky-50 text-sky-800',
    violet:  'bg-violet-50 text-violet-800',
  };
  return (
    <div className={`rounded-xl p-3 border border-slate-200 ${toneMap[tone]}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold opacity-70">
        {Icon ? <Icon className="w-3 h-3" /> : null}
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tabular-nums leading-none">{value ?? 0}</div>
      {sub ? <div className="mt-1 text-[11px] opacity-70">{sub}</div> : null}
    </div>
  );
};

export default function EducatorReportModal({ educator, onClose }) {
  const { getAuthHeaders } = useAuth();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const monthOptions = useMemo(() => buildMonthOptions(12), []);

  useEffect(() => {
    if (!educator) return;
    let cancelled = false;
    setLoading(true);
    axios.get(`${API}/admin/educators/${educator.id}/report`, {
      params: { month },
      headers: getAuthHeaders(),
    }).then((res) => {
      if (!cancelled) setData(res.data);
    }).catch((err) => {
      if (!cancelled) toast.error(err.response?.data?.detail || 'Failed to load report');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [educator, month, getAuthHeaders]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await axios.get(`${API}/admin/educators/${educator.id}/report.pdf`, {
        params: { month }, headers: getAuthHeaders(), responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `educator-report-${educator.email || educator.id}-${month}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Download failed');
    } finally { setDownloading(false); }
  };

  const emailReport = async () => {
    if (!window.confirm(`Email this monthly report to ${educator.email}?`)) return;
    setEmailing(true);
    try {
      await axios.post(`${API}/admin/educators/${educator.id}/report/email`, null, {
        params: { month }, headers: getAuthHeaders(),
      });
      toast.success(`Report sent to ${educator.email}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Email failed');
    } finally { setEmailing(false); }
  };

  if (!educator) return null;
  const s = data?.sessions || {};
  const attire = data?.attire || {};
  const earnings = data?.earnings || {};
  const days = data?.days_breakdown || [];
  const totalAttire = (attire.oll_tshirt || 0) + (attire.other || 0) + (attire.not_recorded || 0);
  const tshirtPct = totalAttire ? Math.round((attire.oll_tshirt / totalAttire) * 100) : 0;
  const checkinLinked = !!data?.educator?.checkin_id;

  return (
    <Dialog open={!!educator} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0" data-testid="educator-report-modal">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
          <DialogTitle className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-slate-500">Performance Report</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {educator.full_name || educator.name || educator.email}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{educator.email}</div>
              {/* CheckIn link status pill */}
              {data && (
                <div className="mt-2" data-testid="checkin-link-status">
                  {checkinLinked ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold uppercase tracking-widest">
                      <CheckCircle2 className="w-3 h-3" />
                      Linked to CheckIn
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold uppercase tracking-widest">
                      <AlertTriangle className="w-3 h-3" />
                      Not linked to CheckIn
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                data-testid="report-month-select"
              >
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPdf}
                disabled={downloading || loading}
                data-testid="report-download-pdf"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="ml-1">Download PDF</span>
              </Button>
              <Button
                size="sm"
                onClick={emailReport}
                disabled={emailing || loading || !checkinLinked}
                className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                data-testid="report-email-btn"
                title={checkinLinked ? '' : 'Educator is not linked to a CheckIn account'}
              >
                {emailing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                <span className="ml-1">Email to educator</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {loading && !data ? (
            <div className="flex items-center justify-center py-20 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Building report…
            </div>
          ) : !data ? (
            <div className="py-20 text-center text-slate-500">No data</div>
          ) : (
            <>
              {/* ── KPI grid ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Stat icon={Clock}          label="Hours Teaching"  value={s.hours}                sub={`${s.completed} completed`} tone="sky" />
                <Stat icon={Calendar}       label="Days Occupied"   value={s.unique_days}          sub={`${s.total} sessions`}       tone="violet" />
                <Stat icon={CheckCircle2}   label="On-time"         value={s.on_time}                                                tone="emerald" />
                <Stat icon={AlertTriangle}  label="Late"            value={s.late}                 sub={`${s.absent} absent`}        tone="amber" />
                <Stat icon={ShirtIcon}      label="OLL T-shirt Days" value={`${attire.oll_tshirt} · ${tshirtPct}%`}
                       sub={`${attire.other} other · ${attire.not_recorded} n/a`} tone="rose" />
                <Stat icon={Wallet}         label="Earnings (INR)"
                       value={earnings.available ? `₹${(earnings.amount || 0).toLocaleString('en-IN')}` : '—'}
                       sub={earnings.available ? `${earnings.invoices?.length || 0} invoice(s)` : (earnings.note || 'Not linked')}
                       tone={earnings.available ? 'emerald' : 'slate'} />
                <Stat icon={TrendingUp} label="Absent" value={s.absent} tone="rose" />
                <Stat icon={FileText}   label="Total sessions" value={s.total} tone="slate" />
              </div>

              {/* ── Day-wise breakdown ── */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-6">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-widest font-bold text-slate-600">Day-wise breakdown</div>
                  <div className="text-[10px] text-slate-500">{days.length} days</div>
                </div>
                {days.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                    No sessions in this period.
                    {!checkinLinked && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        This educator's email is not linked to a CheckIn account — attendance & earnings can't be loaded until they're added there.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0 text-[10px] uppercase tracking-widest text-slate-500">
                        <tr>
                          <th className="text-left px-3 py-2 font-bold">Date</th>
                          <th className="text-right px-3 py-2 font-bold">Sessions</th>
                          <th className="text-right px-3 py-2 font-bold">Hours</th>
                          <th className="text-right px-3 py-2 font-bold">On-time</th>
                          <th className="text-right px-3 py-2 font-bold">Late</th>
                          <th className="text-right px-3 py-2 font-bold">Absent</th>
                          <th className="text-left px-3 py-2 font-bold">Attire</th>
                        </tr>
                      </thead>
                      <tbody>
                        {days.map((d) => (
                          <tr key={d.date} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-semibold text-slate-800 tabular-nums">{d.date}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{d.sessions}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{d.hours.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{d.on_time}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-amber-700">{d.late}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-rose-700">{d.absent}</td>
                            <td className="px-3 py-2 text-slate-600 text-[11px]">{d.attire || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Invoices / earnings ── */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-widest font-bold text-slate-600">Earnings · Invoices</div>
                  <div className="text-[10px] text-slate-500">{earnings.invoices?.length || 0} invoice(s)</div>
                </div>
                {!earnings.available ? (
                  <div className="p-6 text-center text-sm text-slate-500">
                    {earnings.note || 'Earnings data unavailable.'}
                  </div>
                ) : (earnings.invoices || []).length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">No invoices in this period.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold">Invoice</th>
                        <th className="text-left px-3 py-2 font-bold">Month</th>
                        <th className="text-left px-3 py-2 font-bold">Status</th>
                        <th className="text-right px-3 py-2 font-bold">Base</th>
                        <th className="text-right px-3 py-2 font-bold">Travel</th>
                        <th className="text-right px-3 py-2 font-bold">TDS</th>
                        <th className="text-right px-3 py-2 font-bold">Adjustments</th>
                        <th className="text-right px-3 py-2 font-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.invoices.map((inv) => (
                        <tr key={inv.invoice_number} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">{inv.invoice_number}</td>
                          <td className="px-3 py-2 text-slate-700">{inv.month}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : inv.status === 'issued' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700'}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">₹{(inv.calculated || 0).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right tabular-nums">₹{(inv.travel_allowance || 0).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-rose-700">₹{(inv.tds || 0).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right tabular-nums">₹{(inv.adjustments || 0).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-800">₹{(inv.amount || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
