import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Trophy, Star, Award, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LEVELS = [
  { n: 1, name: 'Creator',        tone: 'from-slate-400 to-slate-500',    accent: 'text-slate-700',   ring: 'ring-slate-300',    tagline: 'The Foundation — first robots, first games, first stories.' },
  { n: 2, name: 'Published',      tone: 'from-blue-400 to-blue-500',      accent: 'text-blue-700',    ring: 'ring-blue-300',     tagline: 'Shipped to the world — public links, launches, apps live.' },
  { n: 3, name: 'Recognition',    tone: 'from-indigo-500 to-indigo-600',  accent: 'text-indigo-700',  ring: 'ring-indigo-300',   tagline: 'Someone outside OLL validated the work.' },
  { n: 4, name: 'Impact',         tone: 'from-amber-500 to-orange-500',   accent: 'text-amber-700',   ring: 'ring-amber-300',    tagline: 'Real, measurable value — downloads, revenue, users.' },
  { n: 5, name: 'Transformation', tone: 'from-fuchsia-500 to-rose-500',   accent: 'text-fuchsia-700', ring: 'ring-fuchsia-300',  tagline: 'The achievement changed the child\'s life.' },
];

const SuccessStoriesPage = () => {
  const [stories, setStories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterLevel, setFilterLevel] = useState(searchParams.get('level') || 'all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterLevel !== 'all') params.append('level', filterLevel);
    Promise.all([
      axios.get(`${API}/public/success-stories?${params.toString()}`),
      axios.get(`${API}/public/success-stories/stats/summary`).catch(() => ({ data: null })),
    ]).then(([sRes, statsRes]) => {
      setStories(sRes.data || []);
      setStats(statsRes.data);
    }).catch(() => setStories([])).finally(() => setLoading(false));
  }, [filterLevel]);

  const flagship = useMemo(() => stories.filter(s => s.is_flagship), [stories]);
  const rest = useMemo(() => stories.filter(s => !s.is_flagship), [stories]);

  const total = stats?.total || stories.length;

  return (
    <>
      <Helmet>
        <title>Verified Success Stories — OLL Learners Who Built Real Value</title>
        <meta name="description" content="Real, verified achievements from OLL students — projects that got published, competitions won, revenue earned, scholarships awarded. See how kids turn skills into real-world impact." />
        <meta property="og:title" content="Verified Success Stories — OLL" />
        <meta property="og:description" content="From first robots to real revenue, media features and scholarships — verified milestones from OLL learners." />
        <link rel="canonical" href="https://oll.co/success-stories" />
      </Helmet>

      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-b from-amber-50 via-white to-white pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            {total} Verified Success {total === 1 ? 'Story' : 'Stories'}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
            Real learners.<br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              Externally verified wins.
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto mt-4">
            A Verified Success Story is a measurable, externally validated achievement — a child applying skills to create real-world value. Not every story needs to be huge; every level counts.
          </p>
        </div>
      </section>

      {/* Level ladder */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
          {LEVELS.map(l => {
            const count = stats?.by_level?.[String(l.n)] ?? 0;
            const active = filterLevel === String(l.n);
            return (
              <button
                key={l.n}
                onClick={() => {
                  const next = active ? 'all' : String(l.n);
                  setFilterLevel(next);
                  setSearchParams(next === 'all' ? {} : { level: next });
                }}
                className={`rounded-2xl px-3 py-3 text-left bg-gradient-to-br ${l.tone} text-white transition-all ${active ? 'scale-[1.03] shadow-xl ring-4 ring-offset-2 ' + l.ring : 'opacity-90 hover:opacity-100 hover:shadow-lg'}`}
                data-testid={`public-level-filter-${l.n}`}
              >
                <div className="text-[10px] uppercase tracking-wider opacity-80">Level {l.n}</div>
                <div className="text-sm md:text-base font-semibold">{l.name}</div>
                <div className="text-2xl md:text-3xl font-bold mt-1">{count}</div>
                <div className="text-[10px] opacity-90 mt-1 hidden md:block leading-snug">{l.tagline}</div>
              </button>
            );
          })}
        </div>
        {filterLevel !== 'all' && (
          <div className="mt-3 text-center">
            <button
              onClick={() => { setFilterLevel('all'); setSearchParams({}); }}
              className="text-xs text-slate-500 underline hover:text-slate-800"
              data-testid="public-clear-filter"
            >
              Show all levels
            </button>
          </div>
        )}
      </section>

      {/* Flagship (Level 5) */}
      {flagship.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-fuchsia-500 fill-current" />
            <h2 className="text-lg md:text-xl font-bold text-slate-900">Flagship stories</h2>
            <span className="text-xs bg-fuchsia-100 text-fuchsia-700 px-2 py-0.5 rounded-full">Level 5 — Transformation</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flagship.map(s => <PublicStoryCard key={s.id} s={s} featured />)}
          </div>
        </section>
      )}

      {/* Rest */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        {flagship.length > 0 && <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-4">More success stories</h2>}
        {loading ? (
          <div className="text-center py-16 text-slate-500">Loading stories…</div>
        ) : rest.length === 0 && flagship.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-300 rounded-2xl">
            <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-slate-700 font-semibold">No stories at this level yet</div>
            <div className="text-slate-500 text-sm mt-1">Check back soon — new milestones are being verified all the time.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map(s => <PublicStoryCard key={s.id} s={s} />)}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 pb-20 text-center">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 md:p-12">
          <h3 className="text-2xl md:text-3xl font-bold mb-3">Your child could be next.</h3>
          <p className="text-slate-300 text-sm md:text-base mb-6">Enroll and start building your first verified success story with OLL.</p>
          <Link to="/student" className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-6 py-3 rounded-xl hover:bg-amber-50 transition">
            Start your journey <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {selected && <PublicStoryDetail s={selected} onClose={() => setSelected(null)} />}

      <Footer />
    </>
  );
};

const PublicStoryCard = ({ s, featured = false }) => {
  const lvl = LEVELS.find(l => l.n === s.level) || LEVELS[0];
  const href = `/success-stories/${s.slug || s.id}`;
  return (
    <Link
      to={href}
      className={`block text-left bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all ${featured ? 'md:col-span-1' : ''}`}
      data-testid={`public-story-card-${s.id}`}
    >
      <div className={`relative bg-slate-100 ${featured ? 'aspect-[16/9]' : 'aspect-[16/10]'}`}>
        {s.image_url ? (
          <img src={s.image_url} alt={s.student_name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Trophy className="w-10 h-10" />
          </div>
        )}
        {s.is_flagship && (
          <div className="absolute top-3 left-3 bg-fuchsia-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <Star className="w-3 h-3 fill-current" />
            FLAGSHIP
          </div>
        )}
        <div className={`absolute top-3 right-3 bg-gradient-to-br ${lvl.tone} text-white px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-md`}>
          L{s.level} · {lvl.name}
        </div>
      </div>
      <div className="p-4">
        <div className={`font-bold text-slate-900 ${featured ? 'text-lg' : 'text-base'}`}>{s.student_name}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          {[s.age && `${s.age} yrs`, s.school_name].filter(Boolean).join(' · ') || 'OLL learner'}
        </div>
        {s.excerpt && (
          <div className="text-sm text-slate-600 mt-2 line-clamp-3">{s.excerpt}</div>
        )}
        {s.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {s.tags.slice(0, 3).map((t, i) => (
              <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">#{t}</span>
            ))}
          </div>
        )}
        <div className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${lvl.accent}`}>
          Read story <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </Link>
  );
};

const PublicStoryDetail = ({ s, onClose }) => {
  const lvl = LEVELS.find(l => l.n === s.level) || LEVELS[0];
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start md:items-center justify-center p-0 md:p-6 overflow-y-auto"
      onClick={onClose}
      data-testid="public-story-detail"
    >
      <div
        className="bg-white w-full md:max-w-3xl md:rounded-2xl overflow-hidden shadow-2xl my-0 md:my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {s.image_url && (
          <img src={s.image_url} alt={s.student_name} className="w-full aspect-[16/9] object-cover" />
        )}
        <div className="p-5 md:p-8">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`bg-gradient-to-br ${lvl.tone} text-white text-[10px] font-semibold px-2.5 py-1 rounded-full`}>
              Level {s.level} · {lvl.name}
            </span>
            {s.is_flagship && (
              <span className="bg-fuchsia-100 text-fuchsia-700 text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> Flagship
              </span>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-3">{s.student_name}</h2>
          <div className="text-sm text-slate-500 mt-1">
            {[s.age && `${s.age} years old`, s.school_name].filter(Boolean).join(' · ') || 'OLL learner'}
          </div>
          {s.excerpt && <div className="text-base text-slate-700 italic mt-4">{s.excerpt}</div>}
          <div
            className="prose prose-sm md:prose-base max-w-none text-slate-800 mt-4 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: s.story || '' }}
          />
          {s.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-6">
              {s.tags.map(t => <span key={t} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">#{t}</span>)}
            </div>
          )}
          {s.evidence_links?.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Evidence</div>
              <div className="space-y-1">
                {s.evidence_links.map(l => (
                  <a key={l} href={l} target="_blank" rel="noreferrer" className="block text-sm text-blue-600 hover:underline truncate">
                    <ExternalLink className="w-3 h-3 inline mr-1" />{l}
                  </a>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="mt-6 w-full md:w-auto bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
            data-testid="public-story-close"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessStoriesPage;
