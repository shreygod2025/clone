import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { LMSReportBody } from '../components/LMSReportBody';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Public (unauthenticated) view of a school's LMS report. Anyone with a valid
 * share token can view — the token is embedded in the URL and validated by
 * the backend on every request.
 */
const PublicLMSReport = () => {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [month, setMonth] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');

  const fetchReport = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (month && month !== 'all') params.append('month', month);
      if (selectedClass && selectedClass !== 'all') params.append('class_id', selectedClass);
      const res = await axios.get(
        `${API}/api/public/lms-report/${token}?${params.toString()}`
      );
      setData(res.data);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'This share link is invalid or has been revoked.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, month]);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="public-lms-report-page">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                LMS Class-wise Track Sheet
              </div>
              <h1 className="text-sm md:text-base font-bold text-slate-900 truncate" data-testid="public-lms-school-name">
                {data?.school_name || (loading ? 'Loading…' : 'School Report')}
              </h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Shared securely by OLL
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {error && !loading ? (
          <div
            className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto mt-16"
            data-testid="public-lms-report-error"
          >
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-red-800 mb-1">Link unavailable</h2>
            <p className="text-sm text-red-700">{error}</p>
            <p className="text-xs text-red-600/80 mt-4">
              Please ask the OLL team to send you a fresh link.
            </p>
          </div>
        ) : (
          <LMSReportBody
            data={data}
            loading={loading}
            error={error}
            month={month}
            setMonth={setMonth}
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
          />
        )}
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 text-center text-xs text-slate-400">
        Powered by <a href="https://oll.co" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">OLL — Skills for All</a>
      </div>
    </div>
  );
};

export default PublicLMSReport;
