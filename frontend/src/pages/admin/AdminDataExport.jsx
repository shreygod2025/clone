import { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Download, FileJson, FileText, Loader2, RefreshCw, Search, Eye, X, ServerCog, Globe, ShieldAlert, Copy, CheckCircle2 } from 'lucide-react';
import { AdminLayout } from './AdminDashboard';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const formatBytes = (mb) => {
  if (!mb) return '–';
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
};

const AdminDataExport = () => {
  const { getAuthHeaders } = useAuth();
  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState('');
  const [collections, setCollections] = useState([]);
  const [loadingDbs, setLoadingDbs] = useState(false);
  const [loadingColls, setLoadingColls] = useState(false);
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(null); // "{coll}-{format}"
  const [previewing, setPreviewing] = useState(null); // collection name
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => { fetchDatabases(); }, []);

  const fetchDatabases = async () => {
    setLoadingDbs(true);
    try {
      const res = await axios.get(`${API}/api/admin/data-export/databases`, { headers: getAuthHeaders() });
      const dbs = res.data?.databases || [];
      setDatabases(dbs);
      const primary = dbs.find(d => d.is_primary) || dbs[0];
      if (primary && !selectedDb) {
        setSelectedDb(primary.name);
        fetchCollections(primary.name);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load databases');
    } finally {
      setLoadingDbs(false);
    }
  };

  const fetchCollections = async (dbName) => {
    setLoadingColls(true);
    setCollections([]);
    try {
      const res = await axios.get(`${API}/api/admin/data-export/${dbName}/collections`, { headers: getAuthHeaders() });
      setCollections(res.data?.collections || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load collections');
    } finally {
      setLoadingColls(false);
    }
  };

  const handleSelectDb = (name) => {
    setSelectedDb(name);
    fetchCollections(name);
  };

  const handleDownload = async (coll, format) => {
    if (!selectedDb || !coll) return;
    const key = `${coll}-${format}`;
    setDownloading(key);
    try {
      const url = `${API}/api/admin/data-export/${selectedDb}/${coll}/${format}`;
      const headers = getAuthHeaders();
      const res = await axios.get(url, { headers, responseType: 'blob' });
      const blob = new Blob([res.data], { type: format === 'csv' ? 'text/csv' : 'application/x-ndjson' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${selectedDb}__${coll}.${format === 'csv' ? 'csv' : 'jsonl'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${coll} exported as ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || `Failed to export ${coll}`);
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = async (coll) => {
    setPreviewing(coll);
    setPreviewData(null);
    try {
      const res = await axios.get(
        `${API}/api/admin/data-export/${selectedDb}/${coll}/preview?limit=10`,
        { headers: getAuthHeaders() }
      );
      setPreviewData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load preview');
      setPreviewing(null);
    }
  };

  const filteredCollections = collections.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── External MongoDB Dump (e.g. legacy eventmate-19 cluster) ────────────
  const [extOpen, setExtOpen] = useState(false);
  const [extUri, setExtUri] = useState('');
  const [extDbName, setExtDbName] = useState('');
  const [extInspecting, setExtInspecting] = useState(false);
  const [extDumping, setExtDumping] = useState(false);
  const [extZipping, setExtZipping] = useState(false);
  const [extInspectResult, setExtInspectResult] = useState(null);
  const [outboundIp, setOutboundIp] = useState('');
  const [ipCopied, setIpCopied] = useState(false);
  const [bsonDownloading, setBsonDownloading] = useState(null); // "<db>.<coll>"
  const [progressJob, setProgressJob] = useState(null); // {job_id, status, total, completed, current_collection, message, ...}

  const fetchOutboundIp = async () => {
    try {
      const r = await axios.get(`${API}/api/admin/external-mongo/outbound-ip`, { headers: getAuthHeaders() });
      setOutboundIp(r.data?.ip || '');
    } catch {
      setOutboundIp('');
    }
  };

  useEffect(() => { if (extOpen && !outboundIp) fetchOutboundIp(); }, [extOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInspectExternal = async () => {
    if (!extUri.trim()) { toast.error('Paste a MongoDB URI first'); return; }
    setExtInspecting(true);
    setExtInspectResult(null);
    try {
      const r = await axios.post(
        `${API}/api/admin/external-mongo/inspect`,
        { uri: extUri.trim(), db_name: extDbName.trim() || null, timeout_ms: 20000 },
        { headers: getAuthHeaders(), timeout: 30000 },
      );
      setExtInspectResult(r.data);
      const totalDocs = (r.data?.databases || []).reduce((s, d) => s + (d.total_documents || 0), 0);
      toast.success(`Connected · ${(r.data?.databases || []).length} DB(s) · ${totalDocs.toLocaleString()} documents`);
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Inspection failed';
      toast.error(msg.length > 200 ? msg.slice(0, 200) + '…' : msg);
    } finally {
      setExtInspecting(false);
    }
  };

  const handleExternalArchiveDump = async () => {
    if (!extUri.trim()) { toast.error('Paste a MongoDB URI first'); return; }
    setExtDumping(true);
    try {
      const r = await axios.post(
        `${API}/api/admin/external-mongo/dump`,
        { uri: extUri.trim(), db_name: extDbName.trim() || null, timeout_ms: 20000 },
        { headers: getAuthHeaders(), responseType: 'blob', timeout: 600000 },
      );
      const blob = new Blob([r.data], { type: 'application/gzip' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      const safeDb = (extDbName.trim() || 'all-dbs').replace(/[^A-Za-z0-9_-]+/g, '_');
      link.download = `mongodump_${safeDb}_${Date.now()}.archive.gz`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Archive downloaded · restore with mongorestore --archive=…');
    } catch (e) {
      // blob errors come back as Blob → parse them
      if (e.response?.data instanceof Blob) {
        try {
          const txt = await e.response.data.text();
          const parsed = JSON.parse(txt);
          toast.error(parsed.detail || 'Dump failed');
        } catch {
          toast.error('Dump failed');
        }
      } else {
        toast.error(e.response?.data?.detail || e.message || 'Dump failed');
      }
    } finally {
      setExtDumping(false);
    }
  };

  const handleExternalJsonlZip = async () => {
    if (!extUri.trim()) { toast.error('Paste a MongoDB URI first'); return; }
    setExtZipping(true);
    try {
      const r = await axios.post(
        `${API}/api/admin/external-mongo/jsonl-zip`,
        { uri: extUri.trim(), db_name: extDbName.trim() || null, timeout_ms: 20000 },
        { headers: getAuthHeaders(), responseType: 'blob', timeout: 600000 },
      );
      const blob = new Blob([r.data], { type: 'application/zip' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `external_export_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('JSONL zip downloaded');
    } catch (e) {
      if (e.response?.data instanceof Blob) {
        try {
          const txt = await e.response.data.text();
          const parsed = JSON.parse(txt);
          toast.error(parsed.detail || 'Export failed');
        } catch { toast.error('Export failed'); }
      } else {
        toast.error(e.response?.data?.detail || e.message || 'Export failed');
      }
    } finally {
      setExtZipping(false);
    }
  };

  const copyIp = () => {
    if (!outboundIp) return;
    navigator.clipboard.writeText(outboundIp).then(() => {
      setIpCopied(true);
      setTimeout(() => setIpCopied(false), 1500);
    });
  };

  // Per-collection BSON download (mongodump-format that mongorestore consumes)
  const handleBsonCollection = async (dbName, coll) => {
    if (!extUri.trim()) { toast.error('Paste a MongoDB URI first'); return; }
    const key = `${dbName}.${coll}`;
    setBsonDownloading(key);
    try {
      const r = await axios.post(
        `${API}/api/admin/external-mongo/collection-bson`,
        { uri: extUri.trim(), db_name: dbName, collection: coll, timeout_ms: 20000 },
        { headers: getAuthHeaders(), responseType: 'blob', timeout: 600000 },
      );
      const blob = new Blob([r.data], { type: 'application/zip' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${dbName}__${coll}.bson.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${coll} BSON exported`);
    } catch (e) {
      if (e.response?.data instanceof Blob) {
        try {
          const txt = await e.response.data.text();
          const parsed = JSON.parse(txt);
          toast.error(parsed.detail || 'BSON export failed');
        } catch { toast.error('BSON export failed'); }
      } else {
        toast.error(e.response?.data?.detail || e.message || 'BSON export failed');
      }
    } finally {
      setBsonDownloading(null);
    }
  };

  // Live-progress JSONL ZIP — start job, poll, download
  const handleStartProgressJob = async () => {
    if (!extUri.trim()) { toast.error('Paste a MongoDB URI first'); return; }
    setProgressJob({ status: 'starting', total: 0, completed: 0, message: 'Starting…' });
    try {
      const start = await axios.post(
        `${API}/api/admin/external-mongo/start-zip-job`,
        { uri: extUri.trim(), db_name: extDbName.trim() || null, timeout_ms: 20000 },
        { headers: getAuthHeaders() },
      );
      const jobId = start.data?.job_id;
      if (!jobId) throw new Error('No job_id returned');
      setProgressJob(prev => ({ ...prev, job_id: jobId, status: 'queued' }));

      // Poll every 700ms
      let stop = false;
      const poll = async () => {
        if (stop) return;
        try {
          const r = await axios.get(`${API}/api/admin/external-mongo/job/${jobId}`, { headers: getAuthHeaders() });
          setProgressJob(prev => prev?.job_id === jobId ? { ...prev, ...r.data } : prev);
          if (r.data.status === 'ready' || r.data.status === 'error') {
            stop = true;
            if (r.data.status === 'error') {
              toast.error(r.data.error || r.data.message || 'Export failed');
            } else {
              toast.success('Export ready — click Download');
            }
            return;
          }
        } catch (e) {
          stop = true;
          toast.error(e.response?.data?.detail || 'Lost progress connection');
          return;
        }
        setTimeout(poll, 700);
      };
      poll();
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Could not start job');
      setProgressJob(null);
    }
  };

  const handleDownloadProgressJob = async () => {
    if (!progressJob?.job_id) return;
    try {
      const r = await axios.get(
        `${API}/api/admin/external-mongo/job/${progressJob.job_id}/download`,
        { headers: getAuthHeaders(), responseType: 'blob', timeout: 600000 },
      );
      const blob = new Blob([r.data], { type: 'application/zip' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `eventmate19_complete_export_${progressJob.job_id}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Downloaded');
      setProgressJob(prev => prev ? { ...prev, status: 'downloaded' } : prev);
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Download failed');
    }
  };

  return (
    <AdminLayout title="Data Export">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A5F] flex items-center gap-2">
              <Database className="w-7 h-7 text-[#D63031]" /> Data Export
            </h1>
            <p className="text-sm text-slate-500 mt-1">Browse every MongoDB database & collection — download as CSV or JSON Lines.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setDownloading('all-jsonl');
                try {
                  const url = `${API}/api/admin/data-export/all-databases.zip?fmt=both`;
                  const res = await axios.get(url, { headers: getAuthHeaders(), responseType: 'blob', timeout: 600000 });
                  const blob = new Blob([res.data], { type: 'application/zip' });
                  const link = document.createElement('a');
                  link.href = window.URL.createObjectURL(blob);
                  link.download = `oll_full_export_${Date.now()}.zip`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  toast.success('Complete export downloaded — every database, every collection');
                } catch (e) {
                  toast.error(e.response?.data?.detail || 'Failed to export everything');
                } finally {
                  setDownloading(null);
                }
              }}
              disabled={downloading === 'all-jsonl'}
              className="px-3 py-2 rounded-lg bg-[#D63031] text-white text-sm font-bold hover:bg-[#b52828] flex items-center gap-2 disabled:opacity-60"
              data-testid="export-everything-btn"
              title="Bundle every collection across every database into one zip file (CSV + JSONL)"
            >
              {downloading === 'all-jsonl' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download Everything (ZIP)
            </button>
            <button
              onClick={fetchDatabases}
              disabled={loadingDbs}
              className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
              data-testid="refresh-databases-btn"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDbs ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Important note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
          <strong>Note about passwords:</strong> User passwords are stored as one-way bcrypt hashes — they cannot be decrypted. The hash itself is exported, so when you restore to your own MongoDB, existing passwords keep working as-is.
        </div>

        {/* External MongoDB Dump (e.g. legacy eventmate-19 cluster) */}
        <div className="bg-white rounded-2xl border border-slate-100">
          <button
            onClick={() => setExtOpen(o => !o)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            data-testid="external-mongo-toggle"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white">
                <ServerCog className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-[#1E3A5F] text-sm">Dump from External MongoDB</p>
                <p className="text-xs text-slate-500">Pull data out of a different cluster (e.g. legacy eventmate-19 / multi-funnel-oll)</p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-md bg-violet-50 text-violet-700 border border-violet-200 font-semibold">
              {extOpen ? 'Hide' : 'Open'}
            </span>
          </button>

          {extOpen && (
            <div className="border-t border-slate-100 p-4 space-y-4">
              {/* Allowlist warning */}
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 flex gap-2">
                <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="space-y-1.5">
                  <p>
                    <strong>Atlas IP allowlist:</strong> Most MongoDB Atlas clusters reject all IPs by default.
                    Before clicking <em>Inspect</em> or <em>Dump</em>, allowlist this server's outbound IP in
                    <span className="px-1 mx-0.5 rounded bg-white/70 font-mono">Atlas → Network Access → Add IP</span>
                    or temporarily set <span className="px-1 mx-0.5 rounded bg-white/70 font-mono">0.0.0.0/0</span>.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-700 font-semibold">This server's IP:</span>
                    {outboundIp ? (
                      <>
                        <code className="px-2 py-0.5 rounded bg-white border border-rose-200 font-mono text-rose-900" data-testid="outbound-ip-value">
                          {outboundIp}
                        </code>
                        <button
                          onClick={copyIp}
                          className="text-xs px-2 py-0.5 rounded border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-semibold flex items-center gap-1"
                          data-testid="copy-outbound-ip-btn"
                        >
                          {ipCopied ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                          {ipCopied ? 'Copied' : 'Copy'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={fetchOutboundIp}
                        className="text-xs px-2 py-0.5 rounded border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-semibold"
                        data-testid="detect-outbound-ip-btn"
                      >
                        Detect IP
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">MongoDB URI <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    placeholder="mongodb+srv://user:pass@cluster.xxxx.mongodb.net/?appName=…"
                    value={extUri}
                    onChange={e => setExtUri(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono"
                    spellCheck={false}
                    autoComplete="off"
                    data-testid="external-uri-input"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">URI is held in memory only for this request — never logged, never stored.</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Database (optional)</label>
                  <input
                    type="text"
                    placeholder="eventmate-19-test_database"
                    value={extDbName}
                    onChange={e => setExtDbName(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono"
                    spellCheck={false}
                    autoComplete="off"
                    data-testid="external-dbname-input"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Leave blank to dump every visible database.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleInspectExternal}
                  disabled={extInspecting || !extUri.trim()}
                  className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
                  data-testid="external-inspect-btn"
                >
                  {extInspecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  Inspect (test connection)
                </button>
                <button
                  onClick={handleExternalArchiveDump}
                  disabled={extDumping || !extUri.trim()}
                  className="px-3 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 flex items-center gap-2 disabled:opacity-60"
                  data-testid="external-dump-btn"
                  title="Run mongodump --gzip --archive — restore with `mongorestore --archive=…`"
                >
                  {extDumping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Dump as .archive.gz (mongodump)
                </button>
                <button
                  onClick={handleStartProgressJob}
                  disabled={!extUri.trim() || (progressJob && ['queued', 'connecting', 'running'].includes(progressJob.status))}
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60"
                  data-testid="external-progress-zip-btn"
                  title="Export every collection as JSONL inside a ZIP — with live X of Y progress"
                >
                  {progressJob && ['queued', 'connecting', 'running'].includes(progressJob.status)
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <FileJson className="w-4 h-4" />}
                  Export Entire Database (with progress)
                </button>
                <button
                  onClick={handleExternalJsonlZip}
                  disabled={extZipping || !extUri.trim()}
                  className="px-3 py-2 rounded-lg bg-fuchsia-600 text-white text-sm font-bold hover:bg-fuchsia-700 flex items-center gap-2 disabled:opacity-60"
                  data-testid="external-jsonl-zip-btn"
                  title="One-shot JSONL ZIP — no progress (faster for tiny DBs)"
                >
                  {extZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
                  Quick JSONL ZIP (no progress)
                </button>
              </div>

              {/* Progress card */}
              {progressJob && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 space-y-2 text-xs" data-testid="progress-job-card">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-indigo-900">
                      Job <span className="font-mono">{progressJob.job_id}</span> — <span className="capitalize">{progressJob.status}</span>
                    </p>
                    {progressJob.status === 'ready' && (
                      <button
                        onClick={handleDownloadProgressJob}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5"
                        data-testid="progress-job-download-btn"
                      >
                        <Download className="w-3.5 h-3.5" /> Download {progressJob.size_mb ? `(${progressJob.size_mb} MB)` : ''}
                      </button>
                    )}
                    {(progressJob.status === 'downloaded' || progressJob.status === 'error') && (
                      <button
                        onClick={() => setProgressJob(null)}
                        className="px-2 py-1 rounded-md bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>

                  {progressJob.total > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-800 font-semibold">
                          {progressJob.message || `Exporting ${progressJob.completed} of ${progressJob.total}…`}
                        </span>
                        <span className="font-mono text-indigo-600">
                          {progressJob.completed}/{progressJob.total}
                        </span>
                      </div>
                      <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-300"
                          style={{ width: `${Math.min(100, (progressJob.completed / Math.max(1, progressJob.total)) * 100)}%` }}
                        />
                      </div>
                      {progressJob.current_collection && progressJob.status === 'running' && (
                        <p className="text-indigo-700 font-mono text-[11px]">
                          → {progressJob.current_collection}
                        </p>
                      )}
                      {typeof progressJob.total_docs === 'number' && progressJob.total_docs > 0 && (
                        <p className="text-indigo-700 text-[11px]">
                          {progressJob.total_docs.toLocaleString()} documents written so far
                        </p>
                      )}
                    </div>
                  )}
                  {progressJob.status === 'error' && (
                    <p className="text-rose-700 font-semibold">{progressJob.error || progressJob.message}</p>
                  )}
                </div>
              )}

              {extInspectResult && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3.5 space-y-2 text-xs">
                  <p className="font-bold text-violet-900">
                    Connected to <span className="font-mono">{extInspectResult.connected_to}</span>
                  </p>
                  {(extInspectResult.databases || []).map(db => (
                    <div key={db.name} className="bg-white border border-violet-100 rounded-lg p-2.5" data-testid={`ext-db-${db.name}`}>
                      <p className="font-bold text-[#1E3A5F]">
                        {db.name}
                        {db.total_documents != null && (
                          <span className="ml-2 text-slate-500 font-medium">· {db.total_documents.toLocaleString()} documents</span>
                        )}
                      </p>
                      {db.error ? (
                        <p className="text-rose-600 mt-1">{db.error}</p>
                      ) : (
                        <div className="mt-2 space-y-1">
                          {(db.collections || []).map(c => {
                            const key = `${db.name}.${c.name}`;
                            return (
                              <div
                                key={c.name}
                                className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-violet-50/60"
                                data-testid={`ext-coll-row-${db.name}-${c.name}`}
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="font-mono text-[11px] text-slate-700">{c.name}</span>
                                  <span className="ml-2 text-[10px] text-slate-500">
                                    {c.count >= 0 ? `${c.count.toLocaleString()} docs` : '— count unavailable'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleBsonCollection(db.name, c.name)}
                                  disabled={bsonDownloading === key}
                                  className="text-[10px] px-2 py-0.5 rounded border border-violet-300 bg-white text-violet-700 hover:bg-violet-100 font-bold flex items-center gap-1 disabled:opacity-50"
                                  data-testid={`bson-${db.name}-${c.name}`}
                                  title="Download this collection as .bson + .metadata.json (mongorestore-ready)"
                                >
                                  {bsonDownloading === key
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <Download className="w-3 h-3" />}
                                  BSON
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* CLI cheatsheet */}
              <details className="bg-slate-900 rounded-xl text-xs text-slate-300 overflow-hidden">
                <summary className="cursor-pointer p-3 font-semibold text-white bg-slate-800/60 hover:bg-slate-800">
                  Or run mongodump from your own machine — copy-paste cheatsheet
                </summary>
                <pre className="p-3 overflow-x-auto leading-relaxed whitespace-pre">{`# 1) Install MongoDB Database Tools (one-time)
#    macOS:    brew install mongodb-database-tools
#    Ubuntu:   sudo apt-get install mongodb-database-tools
#    Windows:  https://www.mongodb.com/try/download/database-tools

# 2) Dump a single DB to a single archive (smallest, easiest to share)
mongodump \\
  --uri="mongodb+srv://USER:PASS@HOST/?appName=multi-funnel-oll" \\
  --db="eventmate-19-test_database" \\
  --gzip --archive=eventmate19.archive.gz

# 3) Restore into your local MongoDB
mongorestore \\
  --uri="mongodb://localhost:27017" \\
  --gzip --archive=eventmate19.archive.gz

# 4) (Alt) Dump ALL databases on the cluster as a folder tree
mongodump \\
  --uri="mongodb+srv://USER:PASS@HOST/" \\
  --gzip --out=./eventmate_all_dbs

# 5) (Alt) Restore the folder tree
mongorestore \\
  --uri="mongodb://localhost:27017" \\
  --gzip ./eventmate_all_dbs`}</pre>
              </details>
            </div>
          )}
        </div>

        {/* Database picker */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Databases</p>
          {loadingDbs ? (
            <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : databases.length === 0 ? (
            <p className="text-sm text-slate-400">No databases visible. Your MongoDB user may lack `listDatabases` permission.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {databases.map(db => (
                <button
                  key={db.name}
                  onClick={() => handleSelectDb(db.name)}
                  data-testid={`db-pick-${db.name}`}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    selectedDb === db.name
                      ? 'border-[#D63031] bg-red-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-[#1E3A5F] truncate">{db.name}</p>
                    {db.is_primary && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-bold">PRIMARY</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {db.collections} collections · {db.objects?.toLocaleString() || 0} docs · {formatBytes(db.size_mb)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Collections list */}
        <div className="bg-white rounded-2xl border border-slate-100">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Collections in <span className="text-[#1E3A5F] normal-case">{selectedDb || '—'}</span></p>
            <div className="ml-auto relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search collections…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-blue-300"
                data-testid="search-collections-input"
              />
            </div>
          </div>
          {loadingColls ? (
            <div className="p-8 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline-block mr-2" /> Loading collections…</div>
          ) : filteredCollections.length === 0 ? (
            <p className="p-8 text-sm text-slate-400 text-center">No collections to show.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredCollections.map(c => (
                <div
                  key={c.name}
                  className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 hover:bg-slate-50"
                  data-testid={`collection-row-${c.name}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1E3A5F] text-sm truncate">{c.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{c.count >= 0 ? `${c.count.toLocaleString()} documents` : '–'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handlePreview(c.name)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-semibold flex items-center gap-1.5"
                      data-testid={`preview-${c.name}`}
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                    <button
                      onClick={() => handleDownload(c.name, 'csv')}
                      disabled={downloading === `${c.name}-csv`}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold flex items-center gap-1.5 disabled:opacity-60"
                      data-testid={`csv-${c.name}`}
                    >
                      {downloading === `${c.name}-csv` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} CSV
                    </button>
                    <button
                      onClick={() => handleDownload(c.name, 'json')}
                      disabled={downloading === `${c.name}-json`}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-[#1E3A5F] text-white hover:bg-[#0F1E33] font-semibold flex items-center gap-1.5 disabled:opacity-60"
                      data-testid={`json-${c.name}`}
                    >
                      {downloading === `${c.name}-json` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileJson className="w-3.5 h-3.5" />} JSON
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview modal */}
        {previewing && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setPreviewing(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="text-base font-bold text-[#1E3A5F]">{previewing}</h3>
                  <p className="text-xs text-slate-500">{previewData ? `Showing ${previewData.rows?.length || 0} of ${previewData.total?.toLocaleString() || 0} documents` : 'Loading…'}</p>
                </div>
                <button onClick={() => setPreviewing(null)} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {!previewData ? (
                  <div className="text-center py-10 text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline-block mr-2" /> Fetching sample…</div>
                ) : (
                  <pre className="text-xs bg-slate-900 text-green-300 p-4 rounded-xl overflow-x-auto leading-relaxed">{JSON.stringify(previewData.rows, null, 2)}</pre>
                )}
              </div>
              <div className="p-4 border-t flex justify-end gap-2 bg-slate-50">
                <button onClick={() => setPreviewing(null)} className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-100">Close</button>
                <button onClick={() => handleDownload(previewing, 'csv')} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 flex items-center gap-2"><FileText className="w-4 h-4" /> Export CSV</button>
                <button onClick={() => handleDownload(previewing, 'json')} className="px-4 py-2 rounded-lg bg-[#1E3A5F] text-white text-sm font-bold hover:bg-[#0F1E33] flex items-center gap-2"><FileJson className="w-4 h-4" /> Export JSON</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDataExport;
