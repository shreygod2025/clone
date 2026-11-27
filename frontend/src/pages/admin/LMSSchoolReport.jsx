import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, RefreshCw, GraduationCap, Share2, Copy, Check, Trash2 } from 'lucide-react';
import { LMSReportBody } from '../../components/LMSReportBody';

const API = process.env.REACT_APP_BACKEND_URL;

const LMSSchoolReport = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [month, setMonth] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');

  // Share-link state
  const [shareBusy, setShareBusy] = useState(false);
  const [shareToken, setShareToken] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicShareUrl = shareToken
    ? `${window.location.origin}/public/lms-report/${shareToken}`
    : '';

  const fetchReport = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (month && month !== 'all') params.append('month', month);
      if (selectedClass && selectedClass !== 'all') params.append('class_id', selectedClass);
      const res = await axios.get(
        `${API}/api/schools/${schoolId}/lms-report?${params.toString()}`,
        { headers: getAuthHeaders() }
      );
      setData(res.data);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to load LMS report';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, month]);

  const openShareModal = async () => {
    setShowShareModal(true);
    if (shareToken) return;
    setShareBusy(true);
    try {
      const res = await axios.post(
        `${API}/api/schools/${schoolId}/lms-report/share`,
        {},
        { headers: getAuthHeaders() }
      );
      setShareToken(res.data.token);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not create share link');
      setShowShareModal(false);
    } finally {
      setShareBusy(false);
    }
  };

  const copyLink = async () => {
    if (!publicShareUrl) return;
    try {
      await navigator.clipboard.writeText(publicShareUrl);
      setCopied(true);
      toast.success('Public link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — select and copy manually');
    }
  };

  const revokeShare = async () => {
    if (!window.confirm('Revoke this share link? Anyone using the current URL will lose access.')) return;
    setShareBusy(true);
    try {
      await axios.delete(
        `${API}/api/schools/${schoolId}/lms-report/share`,
        { headers: getAuthHeaders() }
      );
      setShareToken(null);
      setShowShareModal(false);
      toast.success('Share link revoked');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not revoke link');
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4" data-testid="lms-report-page">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/admin/schools')}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 flex-shrink-0"
              data-testid="lms-report-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <GraduationCap className="w-3.5 h-3.5" />
                LMS Class-wise Track Sheet
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate" data-testid="lms-school-name">
                {data?.school_name || (loading ? 'Loading…' : 'School')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openShareModal}
              disabled={!data?.linked || shareBusy}
              className="text-xs px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="lms-report-share-btn"
              title="Create a public link anyone can view"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
            <button
              onClick={() => fetchReport({ silent: true })}
              disabled={refreshing}
              className="text-xs px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 font-medium"
              data-testid="lms-report-refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <LMSReportBody
          data={data}
          loading={loading}
          error={error}
          month={month}
          setMonth={setMonth}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
        />
      </div>

      {/* Share modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowShareModal(false)}
          data-testid="lms-share-modal-backdrop"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
            data-testid="lms-share-modal"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">Share LMS Report</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Anyone with this link can view {data?.school_name || 'this school'}&apos;s
                  class-wise track sheet — no login required.
                </p>
              </div>
            </div>

            {shareBusy && !shareToken ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-500 text-sm" data-testid="lms-share-loading">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>Generating link…</span>
              </div>
            ) : shareToken ? (
              <>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Public link</label>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    readOnly
                    value={publicShareUrl}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 h-10 text-xs px-3 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                    data-testid="lms-share-url-input"
                  />
                  <button
                    onClick={copyLink}
                    className={`h-10 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                      copied
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                    data-testid="lms-share-copy-btn"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-4">
                  <strong>Heads up:</strong> anyone with this link can view session data,
                  educator names, and track-sheet notes for this school. Revoke it anytime.
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={revokeShare}
                    disabled={shareBusy}
                    className="text-xs px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1.5 font-medium disabled:opacity-50"
                    data-testid="lms-share-revoke-btn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Revoke link
                  </button>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="text-xs px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    data-testid="lms-share-close-btn"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default LMSSchoolReport;
