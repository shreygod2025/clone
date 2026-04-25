import { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Download, FileJson, FileText, Loader2, RefreshCw, Search, Eye, X } from 'lucide-react';
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
          <button
            onClick={fetchDatabases}
            disabled={loadingDbs}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
            data-testid="refresh-databases-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loadingDbs ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Important note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
          <strong>Note about passwords:</strong> User passwords are stored as one-way bcrypt hashes — they cannot be decrypted. The hash itself is exported, so when you restore to your own MongoDB, existing passwords keep working as-is.
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
