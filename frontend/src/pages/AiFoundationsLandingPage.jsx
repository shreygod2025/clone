import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Sparkles, ArrowRight, Check, Clock, Users, Globe, Zap, Award, Brain,
  Image as ImageIcon, Music, Video, BookOpen, Palette, Code2, Shield,
  Trophy, ChevronDown, Linkedin, Star
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// ── Course curriculum ─────────────────────────────────────────────────────
const CURRICULUM = [
  { day: 1, theme: 'What IS AI?', icon: Brain,
    a: 'Spot-the-AI game · ChatGPT first conversation · Magic sentence builder',
    b: 'AI timeline · Career impact mapping · Prompt architecture (role, context, format, constraints)' },
  { day: 2, theme: 'AI Makes Pictures', icon: ImageIcon,
    a: 'Image creator: build your dream world from a sentence',
    b: 'Style control · Brand identity · Character consistency at scale' },
  { day: 3, theme: 'AI Makes Music & Sound', icon: Music,
    a: 'Suno AI: compose your own song from a vibe',
    b: 'Suno + ElevenLabs: studio-grade music + professional voiceover' },
  { day: 4, theme: 'AI Makes Videos & Avatars', icon: Video,
    a: 'HeyGen: become an AI avatar presenter',
    b: 'Runway + HeyGen: 30-second brand video advertisement' },
  { day: 5, theme: 'AI for School & Study', icon: BookOpen,
    a: 'AI study buddy: build your own quiz generator',
    b: 'Perplexity research assistant + NotebookLM summariser' },
  { day: 6, theme: 'AI for Design & Creativity', icon: Palette,
    a: 'Canva AI: design a professional poster for your school',
    b: 'Canva AI + Gamma: full pitch-deck experience' },
  { day: 7, theme: 'Vibe Coding · Build Tech Without Code', icon: Code2,
    a: 'Vibe Coding: spin up real websites & web apps',
    b: 'Vibe Coding: websites, web apps, and mobile apps without writing code' },
  { day: 8, theme: 'AI Doing Good · AI Gone Wrong', icon: Shield,
    a: 'Deepfake-spotting game + responsible AI pledge',
    b: 'AI ethics debate · Bias investigation · Policy framework' },
  { day: 9, theme: 'Capstone Project Build', icon: Sparkles,
    a: 'Mini project: AI storybook OR AI song album',
    b: 'Full project: AI brand campaign (image + video + deck)' },
  { day: 10, theme: 'Showcase & Celebration', icon: Trophy,
    a: 'Parent showcase · Class vote · Certificates',
    b: 'Industry showcase · OLL panel feedback · Portfolio QR codes' },
];

const OUTCOMES = [
  'Generate professional AI images with style control',
  'Compose original AI music & cinematic voiceovers',
  'Star in your own AI avatar video advertisement',
  'Build a full AI-powered presentation deck',
  'Ship a real website or mobile app — without writing a single line of code',
  'Spot deepfakes & think critically about AI ethics',
  'Walk away with a portfolio of 7+ shareable projects',
  'Earn an OLL AI Foundations Certificate (digital + printed)',
];

const TRACKS = [
  {
    key: 'explorer', label: 'Explorer Track', grades: 'Grade 6 – 8', age: '11 – 14 yrs',
    accent: '#3B82F6', focus: 'WHAT does AI do? Let\'s try it!',
    bullets: [
      '45-50 min sessions, 2 per day — perfect attention span',
      'Daily fun, shareable AI creations',
      'Tools: ChatGPT · Canva AI · Suno · HeyGen · Nano Banana',
      'Outcome: 5+ AI creations + UNESCO-linked certificate',
    ],
  },
  {
    key: 'creator', label: 'Creator Track', grades: 'Grade 9 – 12', age: '14 – 18 yrs',
    accent: '#1E3A5F', focus: 'HOW does AI work? How do I use it professionally?',
    bullets: [
      '60 min sessions — tackle longer, more ambitious projects',
      'Portfolio-grade outputs you can show LinkedIn / colleges',
      'Tools: ChatGPT · Midjourney · Runway · Make.com · Gamma',
      'Outcome: 7 real projects + industry-level certificate',
    ],
  },
];

const FAQS = [
  { q: 'When does the next batch start?', a: 'New cohorts open every 2 weeks. Pick your slot during checkout — we\'ll lock your seat the moment payment clears.' },
  { q: 'My child has never used AI tools. Is that fine?', a: 'Absolutely. Day 1 starts at zero — no accounts, no setup, no jargon. By Day 2 they\'re generating their first AI image.' },
  { q: 'Is any coding required?', a: 'None. Track A is fully no-code. Track B introduces "Vibe Coding" (AI-assisted app building) on Day 7 — still no manual programming.' },
  { q: 'What devices do they need?', a: 'A laptop or tablet with a Chrome / Edge browser, plus a stable internet connection. No special software to install.' },
  { q: 'What\'s the class size?', a: 'Live online classes capped at 10 students per cohort (small cohort) so every child gets personal feedback from the educator.' },
  { q: 'Refund policy?', a: 'Full refund up to 24 hours before Day 1 begins. After Day 1, refunds are pro-rated for the remaining sessions.' },
];

// ── Animated background grid ──────────────────────────────────────────────
const TechGrid = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 opacity-[0.07]"
      style={{
        backgroundImage: 'linear-gradient(#1E3A5F 1px, transparent 1px), linear-gradient(90deg, #1E3A5F 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }}
    />
    <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full bg-blue-200/40 blur-3xl" />
    <div className="absolute top-40 -left-20 w-[320px] h-[320px] rounded-full bg-sky-200/40 blur-3xl" />
    <div className="absolute bottom-0 right-1/3 w-[260px] h-[260px] rounded-full bg-indigo-100/60 blur-3xl" />
  </div>
);

const AiFoundationsLandingPage = () => {
  const navigate = useNavigate();
  const [openDay, setOpenDay] = useState(1);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-white text-[#0F1E33]" data-testid="ai-foundations-landing">
      <Helmet>
        <title>AI Foundations · 10-Day Online Course (Grades 6-12) | OLL</title>
        <meta name="description" content="A hands-on, no-code AI course for Grades 6-12. 10 days online. Build images, music, videos, websites & apps with real AI tools. Earn an OLL certificate. ₹1,999." />
        <meta property="og:title" content="AI Foundations · 10-Day Online Course | OLL" />
        <meta property="og:description" content="Master ChatGPT, Midjourney, Suno, Runway, Vibe Coding & more. 10 days, online, ₹1,999." />
      </Helmet>

      <Navbar variant="aifoundations" />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-12 md:pt-16 md:pb-16 overflow-hidden">
        <TechGrid />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top: Badge + Headline (centered, full-width) */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wide mb-5" data-testid="ai-foundations-badge">
              <Sparkles className="w-3.5 h-3.5" /> NEW · 10-DAY ONLINE COHORT
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-[#0F1E33]">
              AI Foundations<br />
              <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 bg-clip-text text-transparent">
                for Grades 6 – 12
              </span>
            </h1>
            <p className="text-base lg:text-lg text-slate-600 mt-4 max-w-2xl mx-auto">
              10 days. 10 themes. Zero code. Your child builds real AI projects every single day —
              images, music, videos, websites, apps, and a portfolio they{`'`}ll actually show off.
            </p>
          </div>

          {/* ── Video player ── */}
          <div className="relative max-w-4xl mx-auto mb-10" data-testid="ai-foundations-hero-video">
            <div className="absolute -inset-2 bg-gradient-to-br from-blue-500 via-sky-400 to-indigo-500 rounded-3xl opacity-25 blur-2xl" />
            <div className="relative rounded-2xl overflow-hidden border-2 border-blue-100 shadow-2xl shadow-blue-900/15 bg-black aspect-video">
              <iframe
                src="https://www.youtube.com/embed/mtKXzNNVfP0?rel=0&modestbranding=1"
                title="AI Foundations Course — Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                loading="lazy"
                className="absolute inset-0 w-full h-full"
                data-testid="ai-foundations-video-iframe"
              />
            </div>
          </div>

          {/* CTAs + meta-row */}
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => navigate('/ai-foundations/book?trial=1')}
                className="group px-7 py-3.5 rounded-full bg-[#1E3A5F] text-white font-bold text-base hover:bg-[#0F1E33] transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/30 flex items-center gap-2"
                data-testid="hero-enroll-btn"
              >
                Book Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#curriculum"
                className="px-7 py-3.5 rounded-full border-2 border-slate-200 hover:border-blue-400 text-[#1E3A5F] font-bold text-base transition-colors flex items-center gap-2"
                data-testid="hero-curriculum-link"
              >
                See 10-Day Curriculum
              </a>
            </div>
            <p className="text-xs text-slate-500 mt-3" data-testid="trial-helper">
              ✨ First session is on us · Pay ₹1,999 only if your child loves it
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 pt-5 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-600" /> 10 sessions · online live</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-blue-600" /> Live classes · max 10 students (small cohort)</span>
              <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-blue-600" /> OLL Certificate (UNESCO-linked)</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TWO TRACKS ───────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-gradient-to-b from-blue-50/40 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold tracking-widest text-blue-600 uppercase">Two Parallel Tracks</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2 mb-3">Same 10 days. Right depth for the right age.</h2>
            <p className="text-slate-600">Grade 6-8 and Grade 9-12 think differently. So they get different tools, depth, and project ambition — taught by the same expert educator.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {TRACKS.map(t => (
              <div
                key={t.key}
                className="relative bg-white border-2 border-slate-100 hover:border-blue-300 rounded-2xl p-7 transition-all hover:shadow-xl hover:shadow-blue-900/10 group"
                data-testid={`track-card-${t.key}`}
                style={{ borderTopColor: t.accent, borderTopWidth: 4 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[11px] font-bold tracking-wider uppercase" style={{ color: t.accent }}>{t.grades}</div>
                    <h3 className="text-2xl font-black text-[#0F1E33]">{t.label}</h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold">{t.age}</span>
                </div>
                <p className="italic text-slate-600 mb-4 text-sm">"{t.focus}"</p>
                <ul className="space-y-2">
                  {t.bullets.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(`/ai-foundations/book?track=${t.key}&trial=1`)}
                  className="mt-5 w-full py-3 rounded-xl border-2 border-blue-200 text-blue-700 font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2 group-hover:bg-blue-50"
                  data-testid={`track-enrol-${t.key}`}
                >
                  Book Free Trial – {t.label} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10-DAY CURRICULUM ────────────────────────────────────────────── */}
      <section id="curriculum" className="py-16 lg:py-20 relative">
        <TechGrid />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-blue-600 uppercase">10 days · 10 themes</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">The Day-by-Day Curriculum</h2>
            <p className="text-slate-600 mt-3 max-w-2xl mx-auto">Click any day to see exactly what each track builds.</p>
          </div>
          <div className="space-y-2.5">
            {CURRICULUM.map(day => {
              const isOpen = openDay === day.day;
              const Icon = day.icon;
              return (
                <div
                  key={day.day}
                  className={`bg-white border-2 ${isOpen ? 'border-blue-400 shadow-xl shadow-blue-900/10' : 'border-slate-100'} rounded-2xl overflow-hidden transition-all`}
                  data-testid={`curriculum-day-${day.day}`}
                >
                  <button
                    onClick={() => setOpenDay(isOpen ? null : day.day)}
                    className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-blue-50/30 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0 ${isOpen ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}>
                      {String(day.day).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-blue-600 font-bold">
                        <Icon className="w-3.5 h-3.5" /> Day {day.day}
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-[#0F1E33]">{day.theme}</h3>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 grid sm:grid-cols-2 gap-3 border-t border-slate-100">
                      <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">Explorer · Gr 6-8</div>
                        <p className="text-sm text-slate-700 leading-snug">{day.a}</p>
                      </div>
                      <div className="rounded-xl bg-[#0F1E33] text-white p-3.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-sky-300 mb-1">Creator · Gr 9-12</div>
                        <p className="text-sm leading-snug">{day.b}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── EDUCATOR ─────────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-[#0F1E33] via-[#1E3A5F] to-[#0F1E33] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-4">
              <div className="relative aspect-square rounded-3xl bg-gradient-to-br from-blue-400/20 to-indigo-400/20 border-2 border-white/20 overflow-hidden flex items-center justify-center">
                <div className="text-9xl font-black text-white/15">VM</div>
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/70 to-transparent">
                  <div className="text-[11px] uppercase tracking-widest text-sky-300 font-bold">OLL Expert Educator</div>
                  <div className="text-base font-bold">Lead Instructor</div>
                </div>
              </div>
            </div>
            <div className="md:col-span-8 space-y-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-sky-300 uppercase">
                <Star className="w-3.5 h-3.5" /> Meet your educator
              </span>
              <h2 className="text-3xl lg:text-4xl font-black">Vrishank Mistry</h2>
              <p className="text-base lg:text-lg text-blue-100 leading-relaxed">
                OLL Expert Educator and AI / EdTech specialist. Vrishank teaches Grades 6-12 how to think
                with AI — not just use it. Across past cohorts he{`'`}s mentored hundreds of students through
                their first AI portfolio, from prompt-craft to published projects.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {['Prompt Engineering', 'Generative AI Tools', 'Vibe Coding', 'AI Ethics', 'EdTech'].map(t => (
                  <span key={t} className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/20 font-semibold">{t}</span>
                ))}
              </div>
              <a
                href="https://www.linkedin.com/in/vrishank-mistry/"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#1E3A5F] font-bold hover:bg-blue-50 transition-colors mt-2"
                data-testid="educator-linkedin-btn"
              >
                <Linkedin className="w-4 h-4" /> View Full Profile on LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── OUTCOMES ─────────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-blue-600 uppercase">By Day 10, your child will</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">Walk away with this</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {OUTCOMES.map((o, idx) => (
              <div
                key={idx}
                className="bg-white border-2 border-slate-100 hover:border-blue-300 rounded-2xl p-5 transition-all hover:shadow-lg hover:shadow-blue-900/5 hover:-translate-y-0.5"
                data-testid={`outcome-${idx}`}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm mb-3">{idx + 1}</div>
                <p className="text-sm font-semibold text-slate-700 leading-snug">{o}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING / CTA ─────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 relative">
        <TechGrid />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border-2 border-blue-200 rounded-3xl p-8 lg:p-10 shadow-2xl shadow-blue-900/10 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-60" />
            <div className="relative">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div>
                  <span className="text-[11px] uppercase tracking-widest text-blue-600 font-bold">Limited seats · 12 per cohort</span>
                  <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-1">Start your AI journey</h2>
                </div>
                <div className="text-right">
                  <div className="text-5xl lg:text-6xl font-black text-[#0F1E33]">₹1,999</div>
                  <div className="text-xs text-slate-500 font-semibold">All-inclusive · No hidden fees</div>
                </div>
              </div>

              <ul className="grid sm:grid-cols-2 gap-2.5 mb-6">
                {[
                  '10 live online sessions',
                  'Live educator + cohort of 12',
                  'All AI tool access included',
                  '7+ portfolio projects',
                  'OLL Certificate (UNESCO-linked)',
                  'Recordings + resources for life',
                ].map((p, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" /> {p}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/ai-foundations/book?trial=1')}
                  className="flex-1 min-w-[200px] py-4 rounded-xl bg-[#1E3A5F] text-white font-bold text-base hover:bg-[#0F1E33] transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl flex items-center justify-center gap-2"
                  data-testid="pricing-enrol-btn"
                >
                  Book Free Trial <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">First session FREE · Pay ₹1,999 only if you continue from session 2</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-gradient-to-b from-white to-blue-50/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] text-center mb-2">Quick answers</h2>
          <p className="text-center text-slate-600 mb-8 text-sm">Everything parents typically ask, in one place.</p>
          <div className="space-y-2.5">
            {FAQS.map((f, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className={`bg-white border-2 ${isOpen ? 'border-blue-300' : 'border-slate-100'} rounded-2xl overflow-hidden transition-all`}
                  data-testid={`faq-${idx}`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-blue-50/30"
                  >
                    <span className="font-bold text-[#0F1E33] text-sm">{f.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                  {isOpen && <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AiFoundationsLandingPage;
