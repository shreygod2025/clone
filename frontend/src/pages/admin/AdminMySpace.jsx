/**
 * My Space — a single hub that merges Tasks, Projects and Performance into
 * one navigable page. On mobile the tabs collapse into a sticky segmented
 * bar so switching context is a single tap.
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from './AdminDashboard';
import AdminTasks from './AdminTasks';
import AdminProjects from './AdminProjects';
import UserPerformance from './UserPerformance';
import { areSoundsOn, toggleSounds } from '../../lib/celebrate';
import { CheckSquare, FolderKanban, BarChart3, Volume2, VolumeX } from 'lucide-react';

const TABS = [
  { key: 'tasks',       label: 'Tasks',       icon: CheckSquare, hint: 'Everything on your plate' },
  { key: 'projects',    label: 'Projects',    icon: FolderKanban, hint: 'What you\u2019re building this quarter' },
  { key: 'performance', label: 'Performance', icon: BarChart3,   hint: 'Your KPIs, growth & scores' },
];

const AdminMySpace = () => {
  const [params, setParams] = useSearchParams();
  const initialTab = TABS.some(t => t.key === params.get('tab')) ? params.get('tab') : 'tasks';
  const [tab, setTab] = useState(initialTab);
  const [soundsOn, setSoundsOn] = useState(areSoundsOn());

  // Keep the URL in sync so tab state survives refresh & is deep-linkable.
  useEffect(() => {
    const current = params.get('tab');
    if (current !== tab) {
      params.set('tab', tab);
      setParams(params, { replace: true });
    }
  }, [tab, params, setParams]);

  const active = TABS.find(t => t.key === tab) || TABS[0];

  return (
    <AdminLayout title="My Space">
      <div className="max-w-[1600px] mx-auto" data-testid="admin-my-space-page">
        {/* Sticky segmented header — stays available on scroll */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-slate-100">
          <div className="px-4 sm:px-6 pt-3 pb-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <active.icon className="w-4 h-4 text-blue-500" />
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">My Space</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{active.hint}</p>
              </div>
              <button
                onClick={() => setSoundsOn(toggleSounds())}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                title={soundsOn ? 'Turn completion sound off' : 'Turn completion sound on'}
                data-testid="sounds-toggle-btn"
              >
                {soundsOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{soundsOn ? 'Sounds on' : 'Sounds off'}</span>
              </button>
            </div>

            {/* Segmented tab bar */}
            <div className="mt-2 flex items-center gap-1 bg-slate-100/70 rounded-xl p-1 w-full sm:w-fit overflow-x-auto no-scrollbar">
              {TABS.map(t => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`relative flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                      active
                        ? 'bg-white text-[#1E3A5F] shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                    data-testid={`myspace-tab-${t.key}`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panels — each renders in embedded mode so no double chrome */}
        <div key={tab} className="animate-in fade-in slide-in-from-bottom-1 duration-200">
          {tab === 'tasks'       && <AdminTasks embedded />}
          {tab === 'projects'    && <AdminProjects embedded />}
          {tab === 'performance' && <UserPerformance mode="me" embedded />}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMySpace;
