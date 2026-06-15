/**
 * GmailBotPanel — connect Gmail accounts (info@oll.co, skills@oll.co, …) so
 * the hourly inbox bot can read mail, classify it with AI, and auto-create
 * support tickets for genuine customer queries.
 *
 * Lives inside AdminSettings as the "Gmail Bot" tab.
 */
import { useEffect, useState } from 'react';
import { Mail, Plus, RefreshCw, Trash2, Loader2, CheckCircle2, AlertTriangle, ExternalLink, Inbox } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatDate = (iso) => {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const GmailBotPanel = ({ getAuthHeaders }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState({});       // { [accId]: true }
  const [syncingAll, setSyncingAll] = useState(false);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/gmail/accounts`, { headers: getAuthHeaders() });
      setAccounts(res.data || []);
    } catch (e) {
      toast.error('Could not load Gmail accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    // If we just came back from the OAuth callback, show a toast and clean the URL.
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected')) {
      toast.success(`Connected ${params.get('gmail_connected')}`);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('gmail_error')) {
      toast.error(`Gmail connect failed: ${params.get('gmail_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const res = await axios.get(`${API}/gmail/auth-url`, { headers: getAuthHeaders() });
      window.location.href = res.data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not start Google OAuth');
      setConnecting(false);
    }
  };

  const handleSync = async (acc) => {
    try {
      setSyncing(s => ({ ...s, [acc.id]: true }));
      const res = await axios.post(`${API}/gmail/sync-now/${acc.id}`, {}, { headers: getAuthHeaders() });
      const data = res.data || {};
      if (data.error) {
        toast.error(`Sync error: ${data.error}`);
      } else {
        toast.success(`Synced ${acc.email}: ${data.created || 0} new tickets, ${data.skipped || 0} skipped`);
      }
      await loadAccounts();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncing(s => ({ ...s, [acc.id]: false }));
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      const res = await axios.post(`${API}/gmail/sync-now`, {}, { headers: getAuthHeaders() });
      const total = (res.data?.results || []).reduce((sum, r) => sum + (r.created || 0), 0);
      toast.success(`Sync complete · ${total} new tickets across ${res.data?.accounts || 0} accounts`);
      await loadAccounts();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleDisconnect = async (acc) => {
    if (!window.confirm(`Disconnect ${acc.email}? Tickets already created will be kept.`)) return;
    try {
      await axios.delete(`${API}/gmail/accounts/${acc.id}`, { headers: getAuthHeaders() });
      toast.success('Disconnected');
      loadAccounts();
    } catch (e) {
      toast.error('Disconnect failed');
    }
  };

  return (
    <div className="space-y-6" data-testid="gmail-bot-panel">
      <div className="bg-gradient-to-br from-[#FFF6E8] to-[#FFE9B8] border border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <Inbox className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">How the Gmail Bot works</h3>
            <p className="text-sm text-slate-700 mt-1">
              Connect a Gmail account (e.g. <code>info@oll.co</code>, <code>skills@oll.co</code>). Every hour the bot pulls
              all <strong>unread</strong> messages from the inbox, asks GPT to decide which are real customer queries
              (skipping OTPs, payment receipts, marketing &amp; no-reply senders), and creates a support ticket for each.
              Tickets are auto-linked to existing students by matching email or phone against your bookings &amp; Cashfree
              payment records.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleConnect}
          disabled={connecting}
          className="bg-[#1E3A5F] text-white hover:bg-[#162a44]"
          data-testid="gmail-connect-btn"
        >
          {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Connect Gmail account
        </Button>

        <Button
          onClick={handleSyncAll}
          disabled={syncingAll || accounts.length === 0}
          variant="outline"
          data-testid="gmail-sync-all-btn"
        >
          {syncingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Sync all now
        </Button>
        <span className="text-xs text-slate-500">Auto-runs every 60 minutes</span>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : accounts.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-10 text-center">
          <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No Gmail accounts connected yet</p>
          <p className="text-sm text-slate-500 mt-1">Click &quot;Connect Gmail account&quot; above to authorize the bot.</p>
        </div>
      ) : (
        <div className="grid gap-3" data-testid="gmail-accounts-list">
          {accounts.map(acc => (
            <div
              key={acc.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-4 hover:shadow-sm transition"
              data-testid={`gmail-account-${acc.email}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    {acc.email}
                    {acc.active !== false && (
                      <span className="text-[10px] font-bold tracking-wide uppercase text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    Connected by {acc.connected_by || '—'} · {formatDate(acc.connected_at)}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-600 flex items-center gap-2 min-w-[200px]">
                {acc.last_sync_error ? (
                  <span className="flex items-center gap-1 text-red-600" title={acc.last_sync_error}>
                    <AlertTriangle className="w-3.5 h-3.5" /> Last sync failed
                  </span>
                ) : acc.last_sync_at ? (
                  <span className="flex items-center gap-1 text-green-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Last sync {formatDate(acc.last_sync_at)} · {acc.last_sync_count || 0} new
                  </span>
                ) : (
                  <span className="text-slate-400">Never synced</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSync(acc)}
                  disabled={!!syncing[acc.id]}
                  data-testid={`gmail-sync-${acc.email}`}
                >
                  {syncing[acc.id] ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                  Sync now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDisconnect(acc)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid={`gmail-disconnect-${acc.email}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-slate-500 flex items-center gap-1 pt-2">
        <ExternalLink className="w-3 h-3" />
        Tickets created by the bot show up in
        <a href="/admin/support" className="text-[#1E3A5F] hover:underline ml-0.5">Support → Tickets</a>
        with source <code>gmail_bot</code>.
      </div>
    </div>
  );
};

export default GmailBotPanel;
