import { useState, useEffect } from 'react';
import {
  RefreshCw, Users, BookOpen, Award, Calendar,
  ChevronDown, ChevronUp, User as UserIcon, Star, Zap, AlertCircle,
} from 'lucide-react';
import LoadingSpinner from './common/LoadingSpinner';

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
};

const fmtTime = (d) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return ''; }
};

const pctTone = (p) => {
  const v = Number(p) || 0;
  if (v >= 80) return 'bg-emerald-100 text-emerald-800';
  if (v >= 50) return 'bg-blue-100 text-blue-800';
  if (v >= 20) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
};

const monthLabel = (m) => {
  if (!m) return 'All';
  const [y, mm] = m.split('-');
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const SumTile = ({ icon, label, value, tone, testid }) => (
  <div className={`rounded-xl bg-gradient-to-br ${tone} text-white p-3 shadow-sm`} data-testid={testid}>
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-90">
      {icon}
      {label}
    </div>
    <div className="text-2xl font-bold mt-1">{value ?? 0}</div>
  </div>
);

const ClassChip = ({ children, active, onClick, testid }) => (
  <button
    onClick={onClick}
    className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors ${
      active
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
    }`}
    data-testid={testid}
  >
    {children}
  </button>
);

const Tag = ({ label, tone = 'slate' }) => {
  const map = {
    slate: 'bg-slate-100 text-slate-600',
    red: 'bg-red-100 text-red-700',
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${map[tone]} capitalize`}>{label}</span>;
};

const ClassBlock = ({ cls, expanded, onToggle }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid={`class-block-${cls.class_id}`}>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {(cls.class_name || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 truncate">{cls.class_name}</div>
          <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
            <span>{cls.student_count ?? 0} students</span>
            <span>·</span>
            <span>{cls.session_count} sessions</span>
            {cls.avg_xp !== null && cls.avg_xp !== undefined && (
              <>
                <span>·</span>
                <span>Avg XP {Math.round(cls.avg_xp)}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
          <Award className="w-3 h-3" />
          {cls.total_xp?.toLocaleString?.() || 0} XP
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>
    </button>

    {expanded && (
      <div className="border-t border-slate-100">
        {cls.sessions.length === 0 ? (
          <div className="text-xs text-center text-slate-400 py-6">No sessions recorded for this filter.</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wide">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Date</th>
                    <th className="text-left px-3 py-2 font-medium">Topic / Activity</th>
                    <th className="text-left px-3 py-2 font-medium">Educator</th>
                    <th className="text-center px-3 py-2 font-medium">% Complete</th>
                    <th className="text-left px-3 py-2 font-medium">Teacher feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cls.sessions.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/60" data-testid={`session-row-${s.id}`}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{fmtDate(s.date)}</div>
                        {fmtTime(s.date) && <div className="text-[10px] text-slate-400">{fmtTime(s.date)}</div>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">{s.topic || '—'}</div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-1 mt-0.5">
                          {s.project_name && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{s.project_name}</span>}
                          {s.session_type && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded capitalize">{s.session_type}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-slate-700">{s.educator_name || '—'}</div>
                        {s.is_oll_teacher && <div className="text-[10px] text-emerald-600 font-medium">OLL teacher</div>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${pctTone(s.percentage)}`}>
                          {Number(s.percentage || 0).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[280px]">
                        {s.notes && <div className="text-slate-700 text-xs">{s.notes}</div>}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.student_engagement && <Tag label={`Engagement: ${s.student_engagement}`} />}
                          {s.session_pace && <Tag label={`Pace: ${s.session_pace}`} />}
                          {s.project_difficulty && <Tag label={`Difficulty: ${s.project_difficulty}`} />}
                          {s.kit_issues && s.kit_issues !== 'none' && <Tag label={`Kit: ${s.kit_issues}`} tone="red" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {cls.sessions.map(s => (
                <div key={s.id} className="px-3 py-3" data-testid={`session-card-${s.id}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500">{fmtDate(s.date)}{fmtTime(s.date) ? ` · ${fmtTime(s.date)}` : ''}</div>
                      <div className="font-medium text-slate-800 mt-0.5">{s.topic || '—'}</div>
                      <div className="text-[11px] text-slate-500">{s.educator_name || '—'}</div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${pctTone(s.percentage)}`}>
                      {Number(s.percentage || 0).toFixed(0)}%
                    </span>
                  </div>
                  {s.notes && <div className="mt-2 text-xs text-slate-700">{s.notes}</div>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.student_engagement && <Tag label={`Engagement: ${s.student_engagement}`} />}
                    {s.session_pace && <Tag label={`Pace: ${s.session_pace}`} />}
                    {s.project_difficulty && <Tag label={`Difficulty: ${s.project_difficulty}`} />}
                    {s.kit_issues && s.kit_issues !== 'none' && <Tag label={`Kit: ${s.kit_issues}`} tone="red" />}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )}
  </div>
);

/**
 * LMSReportBody — pure display body used by both the authenticated admin page
 * and the public share-token page. It renders summary tiles, teacher list,
 * filters, and per-class blocks. All fetching / state is owned by the parent.
 */
export const LMSReportBody = ({
  data,
  loading,
  error,
  month,
  setMonth,
  selectedClass,
  setSelectedClass,
}) => {
  const [expandedClasses, setExpandedClasses] = useState(new Set());
  const [showTeachers, setShowTeachers] = useState(true);

  useEffect(() => {
    if (data?.classes) {
      setExpandedClasses(new Set(data.classes.map(c => c.class_id)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.school_name]); // reset when a fresh report loads

  const toggleClass = (cid) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid); else next.add(cid);
      return next;
    });
  };

  const visibleClasses = (data?.classes || []).filter(c =>
    selectedClass === 'all' ? true : c.class_id === selectedClass
  );

  return (
    <div className="space-y-4">
      {data && data.linked === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800 flex items-start gap-3" data-testid="lms-not-linked">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Not linked to the LMS</div>
            <div className="text-sm mt-1">{data.note}</div>
          </div>
        </div>
      )}

      {data?.linked && data.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SumTile icon={<BookOpen className="w-4 h-4" />} label="Classes" value={data.summary.total_classes} tone="from-blue-500 to-blue-600" testid="sum-classes" />
          <SumTile icon={<Users className="w-4 h-4" />} label="Students" value={data.summary.total_students} tone="from-purple-500 to-purple-600" testid="sum-students" />
          <SumTile icon={<UserIcon className="w-4 h-4" />} label="Teachers" value={data.summary.total_teachers} tone="from-emerald-500 to-emerald-600" testid="sum-teachers" />
          <SumTile icon={<Zap className="w-4 h-4" />} label="Total XP" value={data.summary.total_xp?.toLocaleString?.() || 0} tone="from-amber-500 to-orange-500" testid="sum-xp" />
        </div>
      )}

      {data?.linked && (data.teachers || []).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="lms-teachers-panel">
          <button
            onClick={() => setShowTeachers(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-slate-800">Teachers</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {(data.teachers || []).length}
              </span>
            </div>
            {showTeachers ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showTeachers && (
            <div className="border-t border-slate-100 divide-y divide-slate-100">
              {data.teachers.map((t, i) => (
                <div key={t.id || i} className="px-4 py-2 flex items-center gap-3" data-testid={`lms-teacher-${t.id || i}`}>
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    {(t.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{t.name || '—'}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {t.username && <span>@{t.username}</span>}
                      {t.class_name && <span> · {t.class_name}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {data?.linked && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-600">Month:</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-8 text-sm border border-slate-200 rounded-lg px-2"
              data-testid="lms-report-month-select"
            >
              <option value="all">All months</option>
              {(data.filters?.available_months || []).map(m => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 flex flex-wrap gap-1.5">
            <ClassChip active={selectedClass === 'all'} onClick={() => setSelectedClass('all')} testid="class-chip-all">
              All classes ({data.classes?.length || 0})
            </ClassChip>
            {(data.classes || []).map(c => (
              <ClassChip
                key={c.class_id}
                active={selectedClass === c.class_id}
                onClick={() => setSelectedClass(selectedClass === c.class_id ? 'all' : c.class_id)}
                testid={`class-chip-${c.class_id}`}
              >
                {c.class_name}
                <span className="ml-1 text-[10px] opacity-70">({c.session_count})</span>
              </ClassChip>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading LMS data…" />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700" data-testid="lms-report-error">{error}</div>
      ) : data?.linked && visibleClasses.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500" data-testid="lms-report-empty">
          No classes match the current filter.
        </div>
      ) : data?.linked && (
        <div className="space-y-3">
          {visibleClasses.map(c => (
            <ClassBlock
              key={c.class_id}
              cls={c}
              expanded={expandedClasses.has(c.class_id)}
              onToggle={() => toggleClass(c.class_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LMSReportBody;
