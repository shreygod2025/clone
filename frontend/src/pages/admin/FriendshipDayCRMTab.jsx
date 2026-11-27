/**
 * Friendship Day Workshop CRM Tab — admin view inside Student CRM.
 * Reads /api/admin/friendship-day/registrations + /summary,
 * lets admins update payment_status and export CSV.
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Search, Download, RefreshCw, Phone, Mail, MapPin, Users, IndianRupee,
  CheckCircle2, Clock, Filter, Loader2, Heart, XCircle,
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_TABS = [
  { v: '',        l: 'All',      c: 'bg-slate-500' },
  { v: 'pending', l: 'Pending',  c: 'bg-amber-500' },
  { v: 'paid',    l: 'Paid',     c: 'bg-emerald-500' },
  { v: 'failed',  l: 'Failed',   c: 'bg-rose-500' },
];

const WORKSHOP_FILTERS = [
  { v: '',         l: 'All workshops' },
  { v: 'bracelet', l: '3D Bracelet' },
  { v: 'card',     l: 'Digital Card' },
  { v: 'combo',    l: 'Mega Combo' },
];

const CENTER_FILTERS = [
  { v: '',          l: 'All centers' },
  { v: 'kandivali', l: 'Kandivali' },
  { v: 'mira_road', l: 'Mira Road' },
];

const WORKSHOP_LABEL = { bracelet: '3D Bracelet', card: 'Digital Card', combo: 'Mega Combo' };
const CENTER_LABEL = { kandivali: 'Kandivali', mira_road: 'Mira Road' };

const FriendshipDayCRMTab = ({ getAuthHeaders }) => {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, revenue: 0, by_workshop: [], by_center: [] });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [center, setCenter] = useState('');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status)         params.set('payment_status', status);
      if (workshop)       params.set('workshop', workshop);
      if (center)         params.set('center', center);
      if (search.trim())  params.set('q', search.trim());
      const [regRes, sumRes] = await Promise.all([
        axios.get(`${API}/admin/friendship-day/registrations?${params}`, { headers: getAuthHeaders() }),
        axios.get(`${API}/admin/friendship-day/summary`, { headers: getAuthHeaders() }),
      ]);
      setRows(regRes.data.registrations || []);
      setSummary(sumRes.data || summary);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load Friendship Day data');
    } finally {
      setLoading(false);
    }
  }, [status, workshop, center, search, getAuthHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(
        `${API}/admin/friendship-day/registrations/${id}`,
        { payment_status: newStatus },
        { headers: getAuthHeaders() },
      );
      toast.success('Status updated');
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update');
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (status)         params.set('payment_status', status);
      if (workshop)       params.set('workshop', workshop);
      if (center)         params.set('center', center);
      if (search.trim())  params.set('q', search.trim());
      const res = await axios.get(`${API}/admin/friendship-day/registrations.csv?${params}`, {
        headers: getAuthHeaders(), responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `friendship-day-${status || 'all'}-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (e) {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div data-testid="friendship-day-crm-tab">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard icon={Users}        label="Total"    value={summary.total || 0}    color="bg-slate-500" />
        <StatCard icon={Clock}        label="Pending"  value={summary.pending || 0}  color="bg-amber-500" />
        <StatCard icon={CheckCircle2} label="Paid"     value={summary.paid || 0}     color="bg-emerald-500" />
        <StatCard icon={IndianRupee}  label="Revenue ₹"
          value={Number(summary.revenue || 0).toLocaleString('en-IN')} color="bg-blue-600" />
      </div>

      {/* Split by workshop + center */}
      <div className="grid md:grid-cols-2 gap-3 mb-5">
        <BreakdownCard title="By Workshop" items={summary.by_workshop || []}
          getLabel={x => x.name || WORKSHOP_LABEL[x.workshop] || x.workshop} icon={Heart} />
        <BreakdownCard title="By Center" items={summary.by_center || []}
          getLabel={x => x.name || CENTER_LABEL[x.center] || x.center} icon={MapPin} />
      </div>

      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1" data-testid="fd-crm-status-tabs">
          {STATUS_TABS.map(t => (
            <button key={t.v || 'all'} onClick={() => setStatus(t.v)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${status === t.v ? `${t.c} text-white` : 'text-slate-600 hover:bg-white'}`}
              data-testid={`fd-crm-status-tab-${t.v || 'all'}`}>
              {t.l}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input placeholder="Search name, email, phone…" value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm"
            data-testid="fd-crm-search" />
        </div>

        <select value={workshop} onChange={e => setWorkshop(e.target.value)}
          className="h-9 text-sm border border-slate-200 rounded-lg px-2 bg-white"
          data-testid="fd-crm-workshop-filter">
          {WORKSHOP_FILTERS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <select value={center} onChange={e => setCenter(e.target.value)}
          className="h-9 text-sm border border-slate-200 rounded-lg px-2 bg-white"
          data-testid="fd-crm-center-filter">
          {CENTER_FILTERS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>

        <Button variant="outline" size="sm" onClick={fetchAll} data-testid="fd-crm-refresh">
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={exportCSV} disabled={exporting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="fd-crm-export-csv">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
          Export CSV
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
          <Filter className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No registrations match these filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg" data-testid="fd-crm-table">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th>Status</Th>
                <Th>Child / Parent</Th>
                <Th>Contact</Th>
                <Th>Age</Th>
                <Th>Workshop</Th>
                <Th>Center</Th>
                <Th className="text-right">Amount</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => {
                const isPaid = r.payment_status === 'paid';
                const isFailed = r.payment_status === 'failed';
                return (
                  <tr key={r.id} className="hover:bg-slate-50" data-testid={`fd-crm-row-${r.id}`}>
                    <Td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isPaid ? 'bg-emerald-100 text-emerald-700'
                        : isFailed ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                      }`} data-testid={`fd-crm-status-${r.id}`}>
                        {isPaid ? <><CheckCircle2 className="w-3 h-3" /> Paid</>
                         : isFailed ? <><XCircle className="w-3 h-3" /> Failed</>
                         : <><Clock className="w-3 h-3" /> Pending</>}
                      </span>
                    </Td>
                    <Td>
                      <div className="font-medium text-slate-800">{r.full_name}</div>
                      {r.address && <div className="text-[11px] text-slate-500 line-clamp-1 max-w-[220px]">{r.address}</div>}
                    </Td>
                    <Td>
                      <a href={`tel:${r.phone}`} className="text-blue-700 hover:underline font-semibold inline-flex items-center gap-1.5 text-xs">
                        <Phone className="w-3 h-3" /> {r.phone}
                      </a>
                      {r.email && (
                        <div className="text-[11px] text-slate-500 inline-flex items-center gap-1 mt-0.5">
                          <Mail className="w-2.5 h-2.5" /> {r.email}
                        </div>
                      )}
                    </Td>
                    <Td>{r.age}</Td>
                    <Td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-100">
                        {WORKSHOP_LABEL[r.workshop] || r.workshop_name || r.workshop}
                      </span>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-slate-700 text-xs">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {CENTER_LABEL[r.center] || r.center_name || r.center}
                      </span>
                    </Td>
                    <Td className="text-right font-bold text-slate-900">
                      ₹{Number(r.amount || 0).toLocaleString('en-IN')}
                    </Td>
                    <Td className="text-xs text-slate-500 whitespace-nowrap">{(r.created_at || '').slice(0,10)}</Td>
                    <Td className="text-right">
                      <select
                        value={r.payment_status}
                        onChange={e => updateStatus(r.id, e.target.value)}
                        className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white"
                        data-testid={`fd-crm-status-select-${r.id}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-lg ${color} text-white flex items-center justify-center`}><Icon className="w-4 h-4" /></div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
        <div className="text-lg font-bold text-slate-800 leading-none mt-0.5">{value}</div>
      </div>
    </div>
  </div>
);

const BreakdownCard = ({ title, items, getLabel, icon: Icon }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
      <Icon className="w-3 h-3" /> {title}
    </div>
    {items.length === 0 ? (
      <div className="text-xs text-slate-400 italic">No data yet</div>
    ) : (
      <div className="space-y-1.5">
        {items.map((x, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-slate-700">{getLabel(x)}</span>
            <span className="font-bold text-slate-900">{x.count}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

const Th = ({ children, className = '' }) => (
  <th className={`px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider ${className}`}>{children}</th>
);
const Td = ({ children, className = '' }) => <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;

export default FriendshipDayCRMTab;
