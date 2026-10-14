/**
 * AdminLive — full-screen "Command Center" TV dashboard.
 *
 * Rendered at /admin/live.  Designed to fit a wall-mounted TV (1920×1080,
 * 16:9) with NO vertical scrolling.  Polls /api/live-dashboard/snapshot
 * every 30 seconds.
 *
 * Layout (12-col CSS grid, viewport-height contained):
 *   ┌───────────────────── Header (OLL logo · date · clock · LIVE) ──────────────────────┐
 *   │  Left column  (3 cols)   │      India Map (6 cols)      │  Right column (3 cols)   │
 *   │  Success Stories (slim)  │     dark tile · clickable    │  School CRM               │
 *   │  Today's Sessions        │     city markers + popup     │  Student & FS CRM         │
 *   │  Support Queries         │                              │  My Space (tasks/projects)│
 *   └─────────────────────── Activity ticker (marquee) ─────────────────────────────────┘
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, Trophy, Ticket, School as SchoolIcon, Users, Rocket,
  Clock, MapPin, Zap, ListChecks, FolderKanban, Instagram, Youtube,
  UserPlus, GraduationCap, Briefcase, TrendingUp, Maximize2,
  Phone, Compass,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const POLL_MS = 30_000; // 30-second refresh
const INDIA_CENTER = [23.5, 80.5];
const OLL_LOGO = 'https://customer-assets.emergentagent.com/job_0add39d8-6ba8-4c9a-b97e-1c8e22260bae/artifacts/bnp5i3h5_OLL-horizontal-logo-white.png';

// Format big numbers as 12.3k / 4.5M
const compact = (n) => {
  if (n == null) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
};

// Role catalogue for the map popup (mirrors AdminCentralDatabase).
const ROLE_META = {
  team:            { label: 'Team',            color: '#0EA5E9' },
  growth_partners: { label: 'Growth Partners', color: '#10B981' },
  teachers:        { label: 'Teachers',        color: '#F59E0B' },
  schools:         { label: 'Schools',         color: '#7C3AED' },
  students:        { label: 'Students',        color: '#DC2626' },
  centers:         { label: 'FS Centres',      color: '#0A1F44' },
  fs_leads:        { label: 'FS Leads',        color: '#EC4899' },
};

// ─── Small presentational helpers ────────────────────────────────────
const glowBorder = 'border border-cyan-500/20 shadow-[0_0_18px_-8px_rgba(6,182,212,0.35)]';

const Card = ({ title, icon: Icon, accent = 'cyan', children, testId, className = '' }) => {
  const map = {
    cyan:   'from-cyan-500/10 to-transparent text-cyan-300',
    amber:  'from-amber-500/10 to-transparent text-amber-300',
    rose:   'from-rose-500/10 to-transparent text-rose-300',
    violet: 'from-violet-500/10 to-transparent text-violet-300',
    emerald:'from-emerald-500/10 to-transparent text-emerald-300',
    sky:    'from-sky-500/10 to-transparent text-sky-300',
  };
  return (
    <div
      data-testid={testId}
      className={`relative rounded-xl bg-gradient-to-br ${map[accent]} bg-slate-950/70 backdrop-blur ${glowBorder} p-3 flex flex-col overflow-hidden ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      <div className="flex items-center gap-2 mb-2">
        {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
        <span className="text-[10px] tracking-[0.25em] uppercase text-slate-300 font-semibold">
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
    sky:     'text-sky-300',
  };
  return (
    <div className="text-center min-w-0" data-testid={testId}>
      {/* Bumped from 2xl → 4xl now that we have ~2× the screen real estate
          after dropping the map section. */}
      <div className={`text-4xl font-black leading-none ${toneMap[tone]} tabular-nums`}>
        {value ?? 0}
      </div>
      <div className="mt-1 text-[11px] tracking-widest uppercase text-slate-400">
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

// Marker radius scales with total (log to keep giant cities readable).
const markerRadius = (n) => Math.max(6, Math.min(22, 5 + Math.log2(Math.max(2, n)) * 2.4));

// ─── Main component ──────────────────────────────────────────────────
export default function AdminLive() {
  const { user, isAuthenticated, loading: authLoading, getAuthHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [nowIST, setNowIST] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [needsFsPrompt, setNeedsFsPrompt] = useState(true);
  const timerRef = useRef(null);

  // Live clock (ticks every second)
  useEffect(() => {
    const id = setInterval(() => setNowIST(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Fullscreen handling ─────────────────────────────────────────────
  // Browsers block programmatic `requestFullscreen()` on page load — a user
  // gesture is required.  So we:
  //   1) Try once on mount (will silently fail in most browsers).
  //   2) Show a friendly overlay button that flips the page into fullscreen
  //      on the first click / key press.
  //   3) Listen to the browser's `fullscreenchange` event so pressing ESC
  //      cleanly returns to normal view AND re-shows the "Enter fullscreen"
  //      prompt for the next time.
  useEffect(() => {
    const enterFs = () => {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (!req) return Promise.reject(new Error('Fullscreen API not supported'));
      return req.call(el);
    };

    // Try optimistically — some browsers allow it if the user just clicked
    // a link/nav to reach this page (counts as a user gesture).
    enterFs().catch(() => { /* silently ignore — prompt overlay will handle it */ });

    const onFsChange = () => {
      const active = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      setIsFullscreen(active);
      setNeedsFsPrompt(!active);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    // Also allow pressing "F" as a hotkey.
    const onKey = (e) => {
      if (e.key && e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const active = !!document.fullscreenElement;
        if (!active) enterFs().catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleEnterFullscreen = () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) {
      req.call(el).then(() => setNeedsFsPrompt(false)).catch((err) => {
        console.warn('[live] fullscreen refused:', err);
      });
    }
  };

  // Poll snapshot every POLL_MS. This dashboard is PUBLIC — no auth required.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axios.get(`${API}/live-dashboard/snapshot`);
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
  }, []);

  const clockStr = useMemo(() => nowIST.toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: '2-digit', second: '2-digit',
    hour12: true, timeZone: 'Asia/Kolkata',
  }), [nowIST]);
  const dayStr = useMemo(
    () => nowIST.toLocaleDateString('en-IN', {
      weekday: 'long',
      timeZone: 'Asia/Kolkata',
    }),
    [nowIST]
  );
  const dateStr = useMemo(
    () => nowIST.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
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
  // PUBLIC dashboard — no auth required. Any user, logged-in or not, can
  // see this (it's intended for lobby TVs / public share).

  const map = data?.map || { cities: [], grand_total: 0 };
  const stories = data?.success_stories || {};
  const support = data?.support || {};
  const school = data?.school_crm || {};
  const studentFs = data?.student_fs_crm || {};
  const sessions = data?.sessions || {};
  const activity = data?.activity || [];
  const tp = data?.tasks_projects || {};
  const outreach = data?.outreach || { instagram: {}, youtube: {} };
  const hiring = data?.hiring || { educators: {}, team: {}, growth_partners: {} };

  const maxLevel = Math.max(1, ...(stories.by_level || []).map((l) => l.count));

  return (
    <div
      className="h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden relative flex flex-col"
      data-testid="admin-live-dashboard"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, rgba(14,165,233,0.10) 0%, transparent 55%),' +
          'radial-gradient(ellipse at bottom, rgba(139,92,246,0.09) 0%, transparent 55%)',
      }}
    >
      {/* Fullscreen prompt overlay — appears when the browser is not currently
          in fullscreen mode.  Auto-attempted on mount but browsers require
          a user gesture, so this overlay is the one-click activator. */}
      {needsFsPrompt && !isFullscreen ? (
        <button
          type="button"
          onClick={handleEnterFullscreen}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-slate-950/85 backdrop-blur-sm text-slate-100 group"
          data-testid="fullscreen-prompt"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 grid place-items-center shadow-[0_0_40px_-8px_rgba(6,182,212,0.7)] group-hover:scale-110 transition-transform">
            <Maximize2 className="w-10 h-10 text-white" />
          </div>
          <div className="text-5xl font-black tracking-tight">Enter Fullscreen</div>
          <div className="text-sm text-slate-400 tracking-widest uppercase">
            Click anywhere · or press <kbd className="px-2 py-0.5 mx-1 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-xs">F</kbd>
          </div>
          <div className="text-[11px] text-slate-500 tracking-widest uppercase mt-1">
            Press <kbd className="px-1.5 py-0.5 mx-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">ESC</kbd> anytime to exit
          </div>
        </button>
      ) : null}

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.4) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(148,163,184,0.4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Header — compact */}
      <header className="relative z-10 flex items-center justify-between px-6 py-2.5 border-b border-cyan-500/10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <img
            src={OLL_LOGO}
            alt="OLL"
            className="h-8 w-auto"
            data-testid="live-oll-logo"
          />
          <div className="h-7 w-px bg-slate-700/70" />
          <div>
            <div className="text-[10px] tracking-[0.35em] uppercase text-cyan-300/80">
              Command Center
            </div>
            <div className="text-sm font-bold text-slate-200/90 tracking-wide">
              Live Operations
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right leading-tight">
            <div className="text-lg font-black text-white uppercase tracking-wider" data-testid="live-day">
              {dayStr}
            </div>
            <div className="text-sm font-semibold text-slate-300 tabular-nums" data-testid="live-date">
              {dateStr}
            </div>
          </div>
          <div className="text-right border-l border-slate-700/70 pl-4">
            <div className="text-[10px] tracking-[0.3em] uppercase text-slate-400">
              IST
            </div>
            <div className="text-2xl font-black text-white tabular-nums leading-none mt-0.5" data-testid="live-clock">
              {clockStr}
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[10px] font-bold tracking-widest text-emerald-300 uppercase">
              Live
            </span>
          </div>
          <button
            type="button"
            onClick={handleEnterFullscreen}
            title={isFullscreen ? 'You are in fullscreen — press ESC to exit' : 'Enter fullscreen (F)'}
            className={`p-1.5 rounded-lg border transition ${isFullscreen ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
            data-testid="live-fullscreen-btn"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {error && !data ? (
        <div className="mx-6 mt-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex-shrink-0">
          {error}
        </div>
      ) : null}

      {/* Main grid — takes remaining height. Map section removed per 2026-10-07 spec;
          left + right columns are now equal (6/6) and each tile has more breathing room. */}
      <main className="relative z-10 grid grid-cols-12 gap-4 px-5 py-4 flex-1 min-h-0">
        {/* LEFT COLUMN */}
        <section className="col-span-6 flex flex-col gap-4 min-h-0">
          {/* Success Stories — slim */}
          <Card title="Verified Success Stories" icon={Trophy} accent="emerald" testId="card-success-stories" className="flex-shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-5xl font-black text-emerald-300 tabular-nums leading-none">
                {stories.total ?? 0}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                <div>{stories.published ?? 0} published</div>
                <div className="text-emerald-400/80">+{stories.today ?? 0} today</div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {(stories.by_level || []).map((l) => (
                <div key={l.level} className="flex flex-col items-center">
                  <div className="w-full h-8 bg-slate-800/70 rounded flex items-end overflow-hidden">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-300 transition-all"
                      style={{ height: `${Math.max(6, (l.count / maxLevel) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 tabular-nums">L{l.level}</div>
                  <div className="text-[10px] text-emerald-300 font-bold tabular-nums leading-none">
                    {l.count}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Today's Sessions */}
          <Card title="Today's Sessions" icon={Clock} accent="cyan" testId="card-sessions" className="flex-shrink-0">
            <div className="grid grid-cols-4 gap-1 mb-2">
              <Metric label="Checked-in" value={sessions.checked_in} tone="slate" testId="sessions-checked-in" />
              <Metric label="On-time" value={sessions.on_time} tone="emerald" testId="sessions-on-time" />
              <Metric label="Late" value={sessions.late} tone="amber" testId="sessions-late" />
              <Metric label="Not in" value={sessions.not_checked_in} tone="rose" testId="sessions-not-checked-in" />
            </div>
            <SessionBar
              total={sessions.total || 0}
              onTime={sessions.on_time || 0}
              late={sessions.late || 0}
              absent={sessions.absent || 0}
              upcoming={sessions.upcoming || 0}
            />
            <div className="mt-1.5 text-[9px] text-slate-500 flex justify-between">
              <span data-testid="sessions-total">{sessions.total || 0} scheduled · {sessions.upcoming || 0} upcoming · {sessions.absent || 0} missed</span>
              <span>src: {sessions.source || 'checkin'}</span>
            </div>
          </Card>

          {/* Sessions -- keep flex-1 removed, make normal so Outreach can also fit */}
          {/* Support Queries */}
          <Card title="Today's Support Queries" icon={Ticket} accent="amber" testId="card-support" className="flex-shrink-0">
            <div className="grid grid-cols-4 gap-2 mb-1.5">
              <Metric label="New" value={support.new_today} tone="cyan" testId="support-new" />
              <Metric label="Overdue" value={support.overdue} tone="rose" testId="support-overdue" />
              <Metric label="On Hold" value={support.on_hold} tone="amber" testId="support-onhold" />
              <Metric label="Resolved" value={support.resolved_today} tone="emerald" testId="support-resolved" />
            </div>
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[9px] tracking-widest uppercase text-slate-500 mb-1">
                Open by priority · {support.open_total ?? 0} total
              </div>
              <div className="grid grid-cols-4 gap-1" data-testid="support-priority">
                <PriorityChip label="Urgent" value={support.priority?.urgent} tone="rose" />
                <PriorityChip label="High" value={support.priority?.high} tone="amber" />
                <PriorityChip label="Normal" value={support.priority?.normal} tone="cyan" />
                <PriorityChip label="Low" value={support.priority?.low} tone="slate" />
              </div>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[9px] tracking-widest uppercase text-slate-500">
                Avg Resolution Time
                {support.resolved_sample_size ? (
                  <span className="ml-1 text-slate-600 normal-case tracking-normal">
                    · {support.resolved_sample_size} resolved
                  </span>
                ) : null}
              </div>
              <div className="text-sm font-black text-emerald-300 tabular-nums" data-testid="support-avg-resolution">
                {support.avg_resolution_display || '—'}
              </div>
            </div>
          </Card>

          {/* Today's Outreach */}
          <Card title="Today's Outreach" icon={TrendingUp} accent="rose" testId="card-outreach" className="flex-1 min-h-0">
            <div className="grid grid-cols-2 gap-2 h-full">
              <OutreachTile
                icon={Instagram}
                label="Instagram"
                total={outreach.instagram?.followers}
                totalLabel="followers"
                gained={outreach.instagram?.followers_gained}
                engagement={outreach.instagram?.engagement}
                engGained={outreach.instagram?.engagement_gained}
                color="text-pink-300"
                gradient="from-pink-500/20 to-transparent"
                testId="outreach-instagram"
              />
              <OutreachTile
                icon={Youtube}
                label="YouTube"
                total={outreach.youtube?.subscribers}
                totalLabel="subs"
                gained={outreach.youtube?.subscribers_gained}
                engagement={outreach.youtube?.engagement}
                engGained={outreach.youtube?.engagement_gained}
                color="text-red-300"
                gradient="from-red-500/20 to-transparent"
                testId="outreach-youtube"
              />
              <OutreachTile
                icon={Phone}
                label="Calls Connected"
                gained={outreach.calls?.connected}
                gainedLabel="connected"
                total={outreach.calls?.made}
                totalLabel={`Made · ${outreach.calls?.connect_rate ?? 0}%`}
                engagement={outreach.calls?.interested}
                engagementLabel="Interested"
                color="text-emerald-300"
                gradient="from-emerald-500/20 to-transparent"
                testId="outreach-calls"
              />
              <OutreachTile
                icon={Compass}
                label="Field Visits"
                gained={outreach.field_visits?.visits}
                gainedLabel="visits"
                total={outreach.field_visits?.entries}
                totalLabel="Got entry"
                engagement={outreach.field_visits?.leads}
                engagementLabel={`Leads · ${outreach.field_visits?.reps ?? 0} reps`}
                color="text-cyan-300"
                gradient="from-cyan-500/20 to-transparent"
                testId="outreach-field-visits"
              />
            </div>
          </Card>
        </section>

        {/* CENTER MAP REMOVED (2026-10-07) — the lobby TV / public live dashboard
            now shows ops data only. The map was taking 50% of the screen but
            the live-dashboard CTA value is in the metrics, not the geo-view. */}

        {/* RIGHT COLUMN */}
        <section className="col-span-6 flex flex-col gap-4 min-h-0">
          {/* School CRM */}
          <Card title="Today · School CRM" icon={SchoolIcon} accent="violet" testId="card-school-crm" className="flex-shrink-0">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <Metric label="New" value={school.new_today} tone="cyan" testId="school-new" />
              <Metric label="Meeting" value={school.meeting_done_today} tone="amber" testId="school-meeting" />
              <Metric label="Converted" value={school.converted_today} tone="emerald" testId="school-converted" />
            </div>
            {(() => {
              const converted = Number(school.total_converted ?? 0);
              const goal = 500;
              const pct = Math.min(100, Math.round((converted / goal) * 100));
              return (
                <div className="pt-2 border-t border-slate-800" data-testid="school-total-progress">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[9px] tracking-widest uppercase text-slate-400">Total converted schools</span>
                    <span className="text-[10px] font-bold tabular-nums text-emerald-300">{pct}%</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-violet-300 tabular-nums leading-none" data-testid="school-total-count">
                      {converted}
                    </span>
                    <span className="text-sm text-slate-500 font-semibold tabular-nums">/ {goal}</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-emerald-400 transition-[width] duration-700"
                      style={{ width: `${pct}%` }}
                      data-testid="school-progress-bar"
                    />
                  </div>
                </div>
              );
            })()}
          </Card>

          {/* Student CRM (Student + Future Skills combined) */}
          <Card title="Today · Student CRM" icon={Rocket} accent="rose" testId="card-student-fs-crm" className="flex-shrink-0">
            <div className="grid grid-cols-3 gap-2">
              <Metric label="New" value={studentFs.new_today} tone="cyan" testId="stufs-new" />
              <Metric label="Demo" value={studentFs.demo_done_today} tone="amber" testId="stufs-demo" />
              <Metric label="Converted" value={studentFs.converted_today} tone="emerald" testId="stufs-converted" />
            </div>
          </Card>

          {/* My Space — today's tasks + active projects */}
          <Card title="Today · My Space Tasks" icon={ListChecks} accent="sky" testId="card-tasks-projects" className="flex-shrink-0">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <Metric label="New" value={tp.new_today} tone="cyan" testId="tasks-new" />
              <Metric label="Overdue" value={tp.overdue} tone="rose" testId="tasks-overdue" />
              <Metric label="Completed" value={tp.completed_today} tone="emerald" testId="tasks-completed" />
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px]">
              <span className="flex items-center gap-1.5 text-slate-300">
                <FolderKanban className="w-3 h-3 text-sky-300" />
                <span className="uppercase tracking-widest">Active Projects</span>
              </span>
              <span className="text-sky-300 font-bold tabular-nums text-base leading-none" data-testid="active-projects">
                {tp.active_projects ?? 0}
              </span>
            </div>
          </Card>

          {/* Hiring pipeline */}
          <Card title="Today's Hiring Pipeline" icon={UserPlus} accent="emerald" testId="card-hiring" className="flex-1 min-h-0">
            <div className="space-y-1.5">
              <HiringRow
                icon={GraduationCap}
                label="Educators"
                data={hiring.educators}
                color="text-amber-300"
                testId="hiring-educators"
              />
              <HiringRow
                icon={TrendingUp}
                label="Growth Partners"
                data={hiring.growth_partners}
                color="text-emerald-300"
                testId="hiring-growth"
              />
              <HiringRow
                icon={Briefcase}
                label="Team Members"
                data={hiring.team}
                color="text-sky-300"
                testId="hiring-team"
              />
            </div>
          </Card>
        </section>
      </main>

      {/* Bottom ticker */}
      <footer className="relative z-10 bg-slate-950/95 border-t border-cyan-500/20 shadow-[0_-4px_20px_-4px_rgba(6,182,212,0.25)] flex-shrink-0">
        <div className="flex items-center">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-violet-500 text-white flex-shrink-0">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase">
              Live Feed
            </span>
          </div>
          <div className="flex-1 overflow-hidden py-1.5">
            <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
              {activity.concat(activity).map((evt, i) => {
                const Ico = activityIcon[evt.type] || Zap;
                return (
                  <span key={`${evt.at}-${i}`} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Ico className={`w-3 h-3 ${activityColor[evt.type] || 'text-slate-400'}`} />
                    <span>{evt.text}</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                      · {timeAgo(evt.at)}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="px-3 py-1.5 border-l border-slate-800 text-[9px] text-slate-500 tracking-widest uppercase flex-shrink-0">
            Last update {lastUpdated ? timeAgo(lastUpdated.toISOString()) : '—'}
          </div>
        </div>
      </footer>

      {/* Marquee keyframes (scoped) */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { animation: marquee 60s linear infinite; }
        .leaflet-popup-content-wrapper { background: #0f172a; color: #e2e8f0; border-radius: 10px; }
        .leaflet-popup-tip { background: #0f172a; }
        .leaflet-popup-content { margin: 10px 12px; min-width: 200px; }
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
    <div className="h-1.5 rounded-full overflow-hidden flex bg-slate-900">
      {seg.map((s) => (
        <div key={s.key} className={s.color} style={{ width: `${s.pct}%` }} />
      ))}
    </div>
  );
};

const CityPopup = ({ city }) => {
  const counts = city.counts || {};
  const entries = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <div className="text-sm font-bold text-white mb-1.5">{city.city}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">
        {city.total} total entities
      </div>
      <div className="space-y-1">
        {entries.map(([role, count]) => {
          const meta = ROLE_META[role] || { label: role, color: '#64748b' };
          return (
            <div key={role} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                <span className="text-slate-200">{meta.label}</span>
              </span>
              <span className="text-slate-100 font-bold tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OutreachTile = ({ icon: Icon, label, total, totalLabel, gained, gainedLabel, engagement, engagementLabel, engGained, color, gradient, testId }) => {
  const positive = (gained || 0) > 0;
  const posEng = engGained !== undefined ? (engGained > 0) : (engagement || 0) > 0;
  return (
    <div
      className={`rounded-lg bg-gradient-to-br ${gradient} bg-slate-900/60 border border-slate-800 p-2 flex flex-col`}
      data-testid={testId}
    >
      <div className={`flex items-center gap-1.5 ${color} text-[10px] font-bold uppercase tracking-widest`}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      {/* Big number = TODAY's gain (what matters day-to-day) */}
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`text-2xl font-black tabular-nums leading-none ${positive ? 'text-emerald-300' : 'text-slate-400'}`}>
          {engGained !== undefined ? (positive ? '+' : '') : ''}{compact(gained || 0)}
        </span>
        <span className="text-[9px] uppercase tracking-widest text-slate-400">
          {gainedLabel || `${totalLabel} today`}
        </span>
      </div>
      {/* Total = small caption below */}
      <div className="mt-0.5 text-[10px] text-slate-500">
        {engGained !== undefined ? 'Total' : totalLabel} <span className="text-slate-300 font-semibold tabular-nums">{compact(total)}</span>
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-slate-800/70 flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-widest text-slate-400">{engagementLabel || 'Engagement'}</span>
        <span className="text-slate-200 text-xs font-bold tabular-nums">
          {engGained !== undefined ? (
            <>
              <span className={`${posEng ? 'text-emerald-300' : 'text-slate-500'}`}>+{compact(engGained || 0)}</span>
              <span className="ml-1 text-[9px] text-slate-500 font-normal">/ {compact(engagement || 0)}</span>
            </>
          ) : (
            <span className="text-slate-200">{compact(engagement || 0)}</span>
          )}
        </span>
      </div>
    </div>
  );
};

const HiringRow = ({ icon: Icon, label, data, color, testId }) => (
  <div className="rounded-lg bg-slate-900/50 border border-slate-800 px-2 py-1.5" data-testid={testId}>
    <div className={`flex items-center gap-1.5 ${color} text-[10px] font-bold uppercase tracking-widest mb-1`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
      <span className="ml-auto text-slate-500 font-normal">{data?.total ?? 0} total</span>
    </div>
    <div className="grid grid-cols-4 gap-1">
      <HiringCell label="New" value={data?.new} tone="cyan" />
      <HiringCell label="Interview" value={data?.interview} tone="amber" />
      <HiringCell label="Onboarded" value={data?.onboarded} tone="emerald" />
      <HiringCell label="Inactive" value={data?.inactive} tone="rose" />
    </div>
  </div>
);

const HiringCell = ({ label, value, tone }) => {
  const toneMap = {
    cyan:    'text-cyan-300',
    amber:   'text-amber-300',
    emerald: 'text-emerald-300',
    rose:    'text-rose-400',
  };
  return (
    <div className="text-center">
      <div className={`text-sm font-black leading-none ${toneMap[tone]} tabular-nums`}>
        {value ?? 0}
      </div>
      <div className="mt-0.5 text-[8px] tracking-widest uppercase text-slate-400">
        {label}
      </div>
    </div>
  );
};

const PriorityChip = ({ label, value, tone }) => {
  const toneMap = {
    rose:  { bg: 'bg-rose-500/15 border-rose-500/40',   text: 'text-rose-300' },
    amber: { bg: 'bg-amber-500/15 border-amber-500/40', text: 'text-amber-300' },
    cyan:  { bg: 'bg-cyan-500/15 border-cyan-500/40',   text: 'text-cyan-300' },
    slate: { bg: 'bg-slate-600/20 border-slate-500/30', text: 'text-slate-300' },
  };
  const t = toneMap[tone] || toneMap.slate;
  return (
    <div className={`${t.bg} border rounded px-1 py-1 text-center`}>
      <div className={`${t.text} text-sm font-black leading-none tabular-nums`}>
        {value ?? 0}
      </div>
      <div className="mt-0.5 text-[8px] tracking-widest uppercase text-slate-400">
        {label}
      </div>
    </div>
  );
};
