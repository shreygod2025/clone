/**
 * AdminLive — full-screen "Command Center" TV dashboard.
 *
 * Rendered at /admin/live.  Designed for a wall-mounted TV in the office
 * (1920×1080, 16:9).  Polls /api/live-dashboard/snapshot every 30 seconds.
 *
 * Layout (12-col CSS grid):
 *   ┌──────────────────────────── Header (clock · LIVE badge) ────────────────────────────┐
 *   │  Left column  (3 cols)   │      India Map (6 cols)      │  Right column (3 cols)   │
 *   │  Success Stories         │      pulsing city dots       │  School CRM               │
 *   │  Today's Sessions        │                              │  Student & FS CRM         │
 *   │  Support Queries         │                              │  Team Totals              │
 *   └────────────────────────── Activity ticker (marquee) ───────────────────────────────┘
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, Trophy, Ticket, School as SchoolIcon, Users, Rocket,
  Clock, MapPin, Zap, TrendingUp, AlertTriangle, CheckCircle2, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const POLL_MS = 30_000; // 30-second refresh
const INDIA_CENTER = [22.3511, 78.6677];

// ─── Small presentational helpers ────────────────────────────────────
const glowBorder = 'border border-cyan-500/20 shadow-[0_0_25px_-8px_rgba(6,182,212,0.35)]';

const Card = ({ title, icon: Icon, accent = 'cyan', children, testId }) => {
  const map = {
    cyan:   'from-cyan-500/10 to-transparent text-cyan-300 shadow-cyan-500/20',
    amber:  'from-amber-500/10 to-transparent text-amber-300 shadow-amber-500/20',
    rose:   'from-rose-500/10 to-transparent text-rose-300 shadow-rose-500/20',
    violet: 'from-violet-500/10 to-transparent text-violet-300 shadow-violet-500/20',
    emerald:'from-emerald-500/10 to-transparent text-emerald-300 shadow-emerald-500/20',
    sky:    'from-sky-500/10 to-transparent text-sky-300 shadow-sky-500/20',
  };
  return (
    <div
      data-testid={testId}
      className={`relative rounded-2xl bg-gradient-to-br ${map[accent]} bg-slate-950/70 backdrop-blur ${glowBorder} p-4 flex flex-col overflow-hidden`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      <div className="flex items-center gap-2 mb-3">
        {Icon ? <Icon className="w-4 h-4" /> : null}
        <span className="text-[11px] tracking-[0.25em] uppercase text-slate-300 font-semibold">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
};

const Metric = ({ label, value, tone = 'cyan', testId }) => {
  const toneMap = {
    cyan:    'text-cyan-300',
    amber:   'text-amber-300',
    rose:    'text-rose-400',
    emerald: 'text-emerald-300',
    violet:  'text-violet-300',
    slate:   'text-slate-200',
  };
  return (
    <div className="text-center min-w-0" data-testid={testId}>
      <div className={`text-3xl font-black leading-none ${toneMap[tone]} tabular-nums`}>
        {value ?? 0}
      </div>
      <div className="mt-1 text-[10px] tracking-widest uppercase text-slate-400">
        {label}
      </div>
    </div>
  );
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const activityIcon = {
  school_lead:    SchoolIcon,
  student_lead:   Users,
  fs_lead:        Rocket,
  ticket:         Ticket,
  success_story:  Trophy,
};
const activityColor = {
  school_lead:    'text-violet-300',
  student_lead:   'text-rose-300',
  fs_lead:        'text-pink-300',
  ticket:         'text-amber-300',
  success_story:  'text-emerald-300',
};

// ─── Main component ──────────────────────────────────────────────────
export default function AdminLive() {
  const { user, isAuthenticated, loading: authLoading, getAuthHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [nowIST, setNowIST] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);

  // Live clock (ticks every second)
  useEffect(() => {
    const id = setInterval(() => setNowIST(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Poll snapshot every POLL_MS
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axios.get(`${API}/live-dashboard/snapshot`, {
          headers: getAuthHeaders(),
        });
        if (!cancelled) {
          setData(res.data);
          setLastUpdated(new Date());
          setError('');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.detail || 'Failed to load snapshot');
        }
      }
    };
    load();
    timerRef.current = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAuthenticated, getAuthHeaders]);

  const clockStr = useMemo(() => {
    // Force IST display regardless of viewer's local tz
    return nowIST.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: 'Asia/Kolkata',
    });
  }, [nowIST]);
  const dateStr = useMemo(
    () => nowIST.toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }),
    [nowIST]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 grid place-items-center">
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  const role = user?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return <Navigate to="/admin/access-denied" replace />;
  }

  const map = data?.map || { cities: [], grand_total: 0 };
  const stories = data?.success_stories || {};
  const support = data?.support || {};
  const school = data?.school_crm || {};
  const studentFs = data?.student_fs_crm || {};
  const sessions = data?.sessions || {};
  const activity = data?.activity || [];

  const maxLevel = Math.max(1, ...(stories.by_level || []).map((l) => l.count));

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden relative"
      data-testid="admin-live-dashboard"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, rgba(14,165,233,0.12) 0%, transparent 55%),' +
          'radial-gradient(ellipse at bottom, rgba(139,92,246,0.10) 0%, transparent 55%)',
      }}
    >
      {/* Subtle grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.4) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(148,163,184,0.4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-cyan-500/10">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 grid place-items-center shadow-lg shadow-cyan-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-[11px] tracking-[0.35em] uppercase text-cyan-300/80">
              OLL · Command Center
            </div>
            <div className="text-2xl font-black tracking-tight text-white">
              Live Operations Dashboard
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] tracking-[0.3em] uppercase text-slate-400">
              {dateStr}
            </div>
            <div
              className="text-3xl font-black text-white tabular-nums leading-none mt-1"
              data-testid="live-clock"
            >
              {clockStr}
              <span className="ml-2 text-xs text-slate-500 font-normal">IST</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-bold tracking-widest text-emerald-300 uppercase">
              Live
            </span>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && !data ? (
        <div className="mx-8 mt-4 px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm">
          {error}
        </div>
      ) : null}

      {/* Main grid */}
      <main className="relative z-10 grid grid-cols-12 gap-4 px-6 py-4">
        {/* LEFT COLUMN */}
        <section className="col-span-3 flex flex-col gap-4">
          {/* Success Stories */}
          <Card title="Verified Success Stories" icon={Trophy} accent="emerald" testId="card-success-stories">
            <div className="flex items-baseline gap-3 mb-3">
              <div className="text-5xl font-black text-emerald-300 tabular-nums leading-none">
                {stories.total ?? 0}
              </div>
              <div className="text-xs text-slate-400">
                <div>{stories.published ?? 0} published</div>
                <div className="text-emerald-400/80">+{stories.today ?? 0} today</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {(stories.by_level || []).map((l) => (
                <div key={l.level} className="flex items-center gap-2 text-[11px]">
                  <span className="w-4 text-slate-500 tabular-nums">L{l.level}</span>
                  <span className="w-24 text-slate-300 truncate">{l.label}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                      style={{ width: `${(l.count / maxLevel) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-emerald-300 font-bold tabular-nums">
                    {l.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Today's Sessions */}
          <Card title="Today's Sessions" icon={Clock} accent="cyan" testId="card-sessions">
            <div className="grid grid-cols-4 gap-2 mb-3">
              <Metric label="Total" value={sessions.total} tone="slate" testId="sessions-total" />
              <Metric label="On-time" value={sessions.on_time} tone="emerald" testId="sessions-on-time" />
              <Metric label="Late" value={sessions.late} tone="amber" testId="sessions-late" />
              <Metric label="Absent" value={sessions.absent} tone="rose" testId="sessions-absent" />
            </div>
            <SessionBar
              total={sessions.total || 0}
              onTime={sessions.on_time || 0}
              late={sessions.late || 0}
              absent={sessions.absent || 0}
              upcoming={sessions.upcoming || 0}
            />
            <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
              <span>{sessions.upcoming || 0} upcoming</span>
              <span>Source: {sessions.source || 'checkin'}</span>
            </div>
          </Card>

          {/* Support Queries */}
          <Card title="Today's Support Queries" icon={Ticket} accent="amber" testId="card-support">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Metric label="New" value={support.new_today} tone="cyan" testId="support-new" />
              <Metric label="Overdue" value={support.overdue} tone="rose" testId="support-overdue" />
              <Metric label="Resolved" value={support.resolved_today} tone="emerald" testId="support-resolved" />
            </div>
            <div className="mt-2 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
              <span>Open tickets</span>
              <span className="text-slate-200 font-bold tabular-nums">{support.open_total ?? 0}</span>
            </div>
          </Card>
        </section>

        {/* CENTER — MAP */}
        <section className="col-span-6">
          <Card title="Central Database · Live View" icon={MapPin} accent="violet" testId="card-map">
            <div className="flex items-baseline gap-4 mb-2">
              <div className="text-5xl font-black text-violet-300 tabular-nums leading-none">
                {map.grand_total?.toLocaleString?.() ?? map.grand_total ?? 0}
              </div>
              <div className="text-xs text-slate-400">
                <div>{map.cities?.length ?? 0} cities mapped</div>
                <div className="text-violet-400/80">across India</div>
              </div>
              <div className="ml-auto flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_2px_rgba(34,211,238,0.6)]" />
                  Active
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_6px_2px_rgba(167,139,250,0.6)]" />
                  Coverage
                </span>
              </div>
            </div>
            <div
              className="h-[560px] rounded-xl overflow-hidden border border-cyan-500/20 relative"
              data-testid="live-map"
            >
              <MapContainer
                center={INDIA_CENTER}
                zoom={5}
                minZoom={4}
                maxZoom={7}
                style={{ height: '100%', width: '100%', background: '#020617' }}
                zoomControl={false}
                dragging={false}
                doubleClickZoom={false}
                scrollWheelZoom={false}
                touchZoom={false}
                keyboard={false}
                attributionControl={false}
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                />
                {(map.cities || []).map((c) => (
                  <PulsingDot key={c.city_key} city={c} />
                ))}
              </MapContainer>
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-cyan-500/10 rounded-xl" />
            </div>
          </Card>
        </section>

        {/* RIGHT COLUMN */}
        <section className="col-span-3 flex flex-col gap-4">
          {/* School CRM */}
          <Card title="Today · School CRM" icon={SchoolIcon} accent="violet" testId="card-school-crm">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Metric label="New" value={school.new_today} tone="cyan" testId="school-new" />
              <Metric label="Meeting" value={school.meeting_done_today} tone="amber" testId="school-meeting" />
              <Metric label="Converted" value={school.converted_today} tone="emerald" testId="school-converted" />
            </div>
            <div className="mt-2 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
              <span>Total converted schools</span>
              <span className="text-violet-300 font-bold tabular-nums">{school.total_converted ?? 0}</span>
            </div>
          </Card>

          {/* Student & Future Skills CRM */}
          <Card title="Today · Student & Future Skills" icon={Rocket} accent="rose" testId="card-student-fs-crm">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Metric label="New" value={studentFs.new_today} tone="cyan" testId="stufs-new" />
              <Metric label="Demo Done" value={studentFs.demo_done_today} tone="amber" testId="stufs-demo" />
              <Metric label="Converted" value={studentFs.converted_today} tone="emerald" testId="stufs-converted" />
            </div>
            {studentFs.breakdown ? (
              <div className="mt-2 pt-3 border-t border-slate-800 space-y-1.5 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 uppercase tracking-widest">Student</span>
                  <span className="text-slate-300 tabular-nums">
                    {studentFs.breakdown.student.new}·{studentFs.breakdown.student.demo}·{studentFs.breakdown.student.converted}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 uppercase tracking-widest">Future Skills</span>
                  <span className="text-slate-300 tabular-nums">
                    {studentFs.breakdown.future_skills.new}·{studentFs.breakdown.future_skills.demo}·{studentFs.breakdown.future_skills.converted}
                  </span>
                </div>
              </div>
            ) : null}
          </Card>

          {/* Coverage / Team distribution */}
          <Card title="Coverage · By Segment" icon={Users} accent="sky" testId="card-coverage">
            {map.cities?.length ? (
              <div className="space-y-1.5">
                {Object.entries(map.totals || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([role, count]) => (
                    <div key={role} className="flex items-center gap-2 text-[11px]">
                      <span className="w-28 text-slate-300 capitalize truncate">
                        {role.replace('_', ' ')}
                      </span>
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-cyan-300"
                          style={{
                            width: `${Math.min(100, (count / (map.grand_total || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-sky-300 font-bold tabular-nums">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">No data</div>
            )}
          </Card>
        </section>
      </main>

      {/* Bottom ticker */}
      <footer className="fixed bottom-0 inset-x-0 z-20 bg-slate-950/95 backdrop-blur border-t border-cyan-500/20 shadow-[0_-4px_20px_-4px_rgba(6,182,212,0.25)]">
        <div className="flex items-center">
          <div className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-violet-500 text-white flex-shrink-0">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-[11px] font-bold tracking-[0.25em] uppercase">
              Live Feed
            </span>
          </div>
          <div className="flex-1 overflow-hidden py-2.5">
            <div className="flex items-center gap-10 whitespace-nowrap animate-marquee">
              {activity.concat(activity).map((evt, i) => {
                const Ico = activityIcon[evt.type] || Zap;
                return (
                  <span key={`${evt.at}-${i}`} className="flex items-center gap-2 text-sm text-slate-300">
                    <Ico className={`w-3.5 h-3.5 ${activityColor[evt.type] || 'text-slate-400'}`} />
                    <span>{evt.text}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                      · {timeAgo(evt.at)}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="px-4 py-2 border-l border-slate-800 text-[10px] text-slate-500 tracking-widest uppercase flex-shrink-0">
            Last update {lastUpdated ? timeAgo(lastUpdated.toISOString()) : '—'}
          </div>
        </div>
      </footer>

      {/* Marquee + pulse keyframes (scoped) */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 60s linear infinite;
        }
        @keyframes live-ring {
          0%   { transform: scale(0.6); opacity: 0.9; }
          80%  { transform: scale(2.6); opacity: 0;   }
          100% { transform: scale(2.6); opacity: 0;   }
        }
        .live-dot-icon { background: transparent !important; border: 0 !important; }
        .live-dot-wrap {
          position: relative;
          display: grid;
          place-items: center;
        }
        .live-dot-core {
          position: absolute;
          border-radius: 9999px;
          background: var(--dot-color);
          box-shadow: 0 0 8px 2px var(--dot-color);
          border: 1px solid rgba(255,255,255,0.9);
        }
        .live-dot-ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 1.5px solid var(--dot-color);
          animation: live-ring 2s ease-out infinite;
        }
        .live-dot-ring--slow {
          animation-duration: 3s;
          animation-delay: 0.8s;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────
const SessionBar = ({ total, onTime, late, absent, upcoming }) => {
  const denom = Math.max(1, onTime + late + absent + upcoming);
  const seg = [
    { key: 'onTime',   pct: (onTime / denom) * 100,   color: 'bg-emerald-400' },
    { key: 'late',     pct: (late / denom) * 100,     color: 'bg-amber-400' },
    { key: 'absent',   pct: (absent / denom) * 100,   color: 'bg-rose-500' },
    { key: 'upcoming', pct: (upcoming / denom) * 100, color: 'bg-slate-600' },
  ];
  return (
    <div className="h-2 rounded-full overflow-hidden flex bg-slate-900">
      {seg.map((s) => (
        <div key={s.key} className={s.color} style={{ width: `${s.pct}%` }} />
      ))}
    </div>
  );
};

/**
 * PulsingDot — a Leaflet `Marker` using a `divIcon` so we get full HTML/CSS
 * control (a static core dot + two staggered animated rings).
 */
const PulsingDot = ({ city }) => {
  const size = Math.min(28, 10 + Math.log2(Math.max(2, city.total)) * 3);
  const hot = city.total >= 50;
  const color = hot ? '#22d3ee' : '#a78bfa';

  const icon = useMemo(() => {
    const s = Math.round(size);
    const core = Math.max(6, Math.round(s * 0.5));
    const html = `
      <div class="live-dot-wrap" style="--dot-color:${color}; width:${s}px; height:${s}px;">
        <span class="live-dot-ring live-dot-ring--slow"></span>
        <span class="live-dot-ring"></span>
        <span class="live-dot-core" style="width:${core}px; height:${core}px;"></span>
      </div>`;
    return L.divIcon({
      className: 'live-dot-icon',
      html,
      iconSize: [s, s],
      iconAnchor: [s / 2, s / 2],
    });
  }, [size, color]);

  return (
    <Marker position={[city.lat, city.lng]} icon={icon}>
      <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
        <div className="font-bold text-slate-900">{city.city}</div>
        <div className="text-xs text-slate-700">{city.total} entities</div>
      </Tooltip>
    </Marker>
  );
};
