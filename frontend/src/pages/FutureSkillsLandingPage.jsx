import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Sparkles, ArrowRight, Check, Clock, Users, Zap, Award,
  Bot, Cpu, Code2, Box, Wand2, ChevronDown, Star, Quote,
  Brain, Hammer, Rocket, BookOpenCheck, ShieldCheck, Calendar,
  TrendingUp, Lightbulb, Trophy, X, Heart, MapPin, Gift
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// ── Skill buckets ─────────────────────────────────────────────────────────
const GIFS = [
  { src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/4y2zbq59_Robotics.gif',   label: 'Robotics' },
  { src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/8i8zob06_Pyhton%20.gif',  label: 'Coding' },
  { src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/je1umfoj_AI%20TOOl.gif',  label: 'AI' },
  { src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/xj8dva2y_3D%20Design.gif', label: '3D Design' },
];

const PRESS_ITEMS = [
  'Shark Tank India', 'Kaun Banega Crorepati', 'NDTV', 'Times of India',
  'Economic Times', 'India Today', 'YourStory', 'Inc42',
];

const SKILLS = [
  { icon: Bot, key: 'robotics', name: 'Robotics', tag: 'Build & program robots',
    out: 'From line-followers in Grade 3 to obstacle-avoiding bots in Grade 8. Real motors, real sensors, real "it works!"' },
  { icon: Code2, key: 'coding', name: 'Coding', tag: 'Block to Python',
    out: 'Scratch-style logic in early grades, Python by Grade 7. Kids ship games, websites & automations they can show off.' },
  { icon: Brain, key: 'ai', name: 'Artificial Intelligence', tag: 'AI tools & ethics',
    out: 'Train image classifiers, talk to chatbots they built, make AI art — and learn to spot deepfakes.' },
  { icon: Box, key: '3d', name: '3D Design', tag: 'CAD + 3D printing',
    out: 'Tinkercad → Fusion 360 progression. Many students 3D-print their own designs at our centers.' },
  { icon: Wand2, key: 'emerging', name: 'Emerging Tech', tag: 'AR/VR · IoT · Drones',
    out: 'Quarterly "wild card" modules — drone basics, augmented reality scenes, smart home circuits.' },
];

const HOW = [
  { icon: Calendar,    t: '1 Class / Week',         s: '90 minutes of hands-on tech, every week.' },
  { icon: MapPin,      t: 'Offline Centers',        s: 'In-centre or at partner schools — never just a screen.' },
  { icon: Users,       t: 'Small Batches · Max 10', s: 'Every kid gets the educator\'s eyes & feedback.' },
  { icon: TrendingUp,  t: 'Progressive Levels',     s: 'Grade-mapped curriculum that scales as they grow.' },
];

const TRANSFORM = {
  before: [
    { icon: X, t: 'Stuck consuming screens', s: 'YouTube, games, scroll' },
    { icon: X, t: 'Theory-heavy school work', s: 'Memorise, repeat, forget' },
    { icon: X, t: 'No outlet for curiosity',  s: '"Why?" gets shut down' },
    { icon: X, t: 'Shy of new tech',          s: 'Watches others use it' },
  ],
  after: [
    { icon: Heart, t: 'Creates with screens',         s: 'Builds games, robots, art' },
    { icon: Heart, t: 'Hands-on, lifelong learner',   s: 'Tries → fails → solves' },
    { icon: Heart, t: 'Confident problem-solver',     s: 'Owns the "why" and the "how"' },
    { icon: Heart, t: 'Future-ready & fearless',      s: 'AI, 3D, drones — bring it on' },
  ],
};

const TESTIMONIALS = [
  { name: 'Anita S., Grade 5 parent',  quote: 'My son went from gaming all weekend to spending Saturdays designing his own game. The shift in 3 months has been unreal.' },
  { name: 'Rajesh M., Grade 8 parent', quote: 'He builds robots at home now with parts he saves up for. The class lit a fire we didn\'t know was there.' },
  { name: 'Priya K., Grade 3 parent',  quote: 'Best investment beyond her academics. She actually looks forward to Saturdays.' },
];

const STATS = [
  { v: '2,500+', l: 'Students Trained' },
  { v: '500+',   l: 'Partner Schools' },
  { v: '10',     l: 'Max per Batch' },
  { v: '4.9/5',  l: 'Parent Rating' },
];

const FAQ = [
  { q: 'My child is in Grade 1. Is that too young?',
    a: 'Not at all — our youngest learners start at Grade 1 with story-driven robotics and block-based coding. Activities are tailored to grip strength and attention span.' },
  { q: 'What if my child has zero tech background?',
    a: 'Most don\'t when they start. Our curriculum is built for absolute beginners — all materials and kits are provided, and the educator paces the batch to the slowest learner.' },
  { q: 'Do I need to buy a laptop or kit?',
    a: 'No. Robotics kits are included free with the yearly plan. Laptops and tools live at the centre — kids work hands-on without family logistics.' },
  { q: 'Can my child switch between Robotics, Coding & AI?',
    a: 'Yes — one program covers all five skill tracks across the year, structured so kids try everything and find what they love.' },
  { q: 'Class missed? Refunds?',
    a: 'One make-up class per month is included free. Cancel anytime — yearly plan is refunded pro-rata for unused months.' },
  { q: 'How is this different from Whitehat / BYJU\'s?',
    a: 'Those are 1-on-1 online. We\'re offline, hands-on, with a small peer group — kids learn faster from each other, and the physical kits make every concept concrete.' },
];

// Animated background grid
const TechGrid = ({ accent = '#1E3A5F' }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 opacity-[0.06]"
      style={{
        backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
      }}
    />
    <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full blur-3xl"
      style={{ background: `${accent}26` }} />
    <div className="absolute top-40 -left-20 w-[320px] h-[320px] rounded-full blur-3xl"
      style={{ background: '#1E3A5F26' }} />
  </div>
);

const FutureSkillsLandingPage = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const goTrial = () => navigate('/future-skills/book?mode=trial');
  const goSubscribe = (plan) => navigate(`/future-skills/book?mode=subscribe&plan=${plan}`);

  return (
    <div className="min-h-screen bg-white text-[#0F1E33]" data-testid="future-skills-landing">
      <Helmet>
        <title>Future Skills Continuous Learning Program (Grades 1-10) | OLL</title>
        <meta name="description" content="Weekly offline classes in Robotics, Coding, AI, 3D Design & Emerging Tech for Grades 1-10. Small batches, hands-on kits. Book a free trial — pay just ₹1,750/month." />
        <meta property="og:title" content="Future Skills Continuous Learning Program | OLL" />
        <meta property="og:description" content="Robotics, Coding, AI, 3D Design — weekly offline classes for Grades 1-10. From ₹1,750/month, kit included." />
        <link rel="canonical" href="https://oll.co/future-skills" />
      </Helmet>

      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-20 overflow-hidden">
        <TechGrid accent="#1E3A5F" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-[#D63031] text-xs font-bold tracking-wide" data-testid="hero-badge">
                <Sparkles className="w-3.5 h-3.5" /> NEW BATCHES STARTING THIS MONTH
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-[#0F1E33]">
                Your child won't just<br />
                <span className="bg-gradient-to-r from-[#D63031] via-[#7B2C5C] to-[#1E3A5F] bg-clip-text text-transparent">
                  use the future.
                </span><br />
                They'll build it.
              </h1>
              <p className="text-lg lg:text-xl text-slate-600 max-w-xl">
                Hands-on weekly classes in Robotics, Coding, AI, 3D Design & emerging tech — for Grades 1 to 10.
                Small batches, real kits, lasting curiosity.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={goTrial}
                  className="group px-7 py-3.5 rounded-full bg-gradient-to-r from-[#D63031] to-[#1E3A5F] text-white font-bold text-base hover:from-[#B52828] hover:to-[#0F1E33] transition-all shadow-lg shadow-blue-900/25 hover:shadow-xl hover:shadow-blue-900/35 flex items-center gap-2"
                  data-testid="hero-trial-btn"
                >
                  Book a Free Trial Class
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a href="#pricing" className="px-7 py-3.5 rounded-full border-2 border-slate-200 hover:border-[#1E3A5F] text-[#1E3A5F] font-bold text-base transition-colors flex items-center gap-2"
                  data-testid="hero-pricing-link">
                  See Pricing
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-6 pt-3 text-sm text-slate-600">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-[#1E3A5F]" /> Once a week · 90 min</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-[#1E3A5F]" /> Max 10 per batch</span>
                <span className="flex items-center gap-1.5"><Gift className="w-4 h-4 text-[#D63031]" /> Robotic kit free w/ yearly</span>
              </div>
            </div>

            {/* Hero card — GIF showcase */}
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-[#D63031] via-[#7B2C5C] to-[#1E3A5F] rounded-3xl opacity-25 blur-xl" />
                <div className="relative bg-white border-2 border-blue-100 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-blue-900/15">
                  <div className="text-[10px] uppercase tracking-widest text-[#D63031] font-black mb-1">Live at every OLL centre</div>
                  <h3 className="text-lg sm:text-xl font-black text-[#0F1E33] mb-4 leading-tight">What a weekly class actually looks like</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {GIFS.map((g) => (
                      <div key={g.label} className="group">
                        <div className="relative overflow-hidden rounded-xl border-2 border-blue-100 hover:border-[#D63031] transition-all bg-slate-50 aspect-square shadow-md shadow-blue-900/5">
                          <img src={g.src} alt={g.label} loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F1E33]/90 via-[#0F1E33]/40 to-transparent p-2">
                            <div className="text-[10px] font-black tracking-widest uppercase text-white">{g.label}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Starts at</div>
                      <div className="text-2xl font-black text-[#0F1E33]">₹1,750<span className="text-sm text-slate-500 font-bold">/month</span></div>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-[#D63031] bg-red-50 border border-red-200 px-2 py-1 rounded-full font-bold">Kit Included</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AS SEEN ON (National TV + Press ticker) ─────────────────────── */}
      <section className="py-12 lg:py-16 bg-gradient-to-b from-[#0F1E33] to-[#1E3A5F] text-white relative overflow-hidden" data-testid="fs-as-seen-on">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />
        <div className="absolute -top-24 left-1/4 w-[420px] h-[420px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(214,48,49,0.18)' }} />
        <div className="absolute -bottom-24 right-1/4 w-[360px] h-[360px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(37,99,235,0.22)' }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-7">
            <p className="text-[10px] font-black tracking-[0.22em] uppercase text-[#FCA5A5]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>featured.on.national.tv</p>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">As Seen On</h2>
            <p className="text-blue-200 text-sm mt-2 max-w-xl mx-auto">India's leading EdTech for young builders — trusted by the country's biggest stages.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 lg:gap-5">
            {/* KBC */}
            <div className="group relative rounded-2xl overflow-hidden border-2 border-white/10 hover:border-[#D63031]/60 transition-all shadow-2xl shadow-black/40" style={{ height: 260 }}
              data-testid="media-card-kbc">
              <img src="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/mkbfftaz_KBC%20Website%20%281%29.png"
                alt="Kaun Banega Crorepati" loading="lazy"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F1E33] via-[#0F1E33]/40 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#FCA5A5] mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Sony Entertainment · KBC</div>
                <div className="font-black text-base lg:text-lg text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Kaun Banega Crorepati</div>
                <div className="text-xs text-blue-200 mt-1">Featured as India's leading EdTech for kids</div>
              </div>
            </div>

            {/* Shark Tank India */}
            <div className="group relative rounded-2xl overflow-hidden border-2 border-white/10 hover:border-[#60A5FA]/60 transition-all shadow-2xl shadow-black/40" style={{ height: 260 }}
              data-testid="media-card-shark-tank">
              <img src="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png"
                alt="Shark Tank India" loading="lazy"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F1E33] via-[#0F1E33]/40 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#60A5FA] mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Sony LIV · Season Finale</div>
                <div className="font-black text-base lg:text-lg text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Shark Tank India</div>
                <div className="text-xs text-blue-200 mt-1">Pitched to India's top investors on national TV</div>
              </div>
            </div>
          </div>

          {/* Press ticker */}
          <div className="mt-8 overflow-hidden">
            <div className="text-center mb-3">
              <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-300/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>// Also covered by</span>
            </div>
            <div className="fs-ticker-wrap">
              <div className="fs-ticker-inner">
                {[...PRESS_ITEMS, ...PRESS_ITEMS].map((name, i) => (
                  <span key={i} className="fs-ticker-item">{name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .fs-ticker-wrap { position: relative; overflow: hidden; mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); }
          .fs-ticker-inner { display: flex; gap: 3rem; white-space: nowrap; animation: fs-ticker-scroll 32s linear infinite; width: max-content; }
          .fs-ticker-item { font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; font-weight: 800; color: rgba(255,255,255,0.55); letter-spacing: 0.08em; text-transform: uppercase; padding: 0.25rem 0; flex-shrink: 0; transition: color 0.2s; }
          .fs-ticker-item:hover { color: #FCA5A5; }
          @keyframes fs-ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        `}</style>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold tracking-widest text-[#D63031] uppercase">The honest truth</span>
          <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2 mb-4">School isn't enough anymore.</h2>
          <p className="text-slate-600 max-w-2xl mx-auto mb-10">By the time today's kids graduate, half their jobs won't exist yet. Memorising chapters won't cut it.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: BookOpenCheck, t: 'Stuck in theory',          s: 'Memorising what AI now finishes in seconds.' },
              { icon: X,             t: 'No real-world skills',     s: '12 years of classes, zero things they can build.' },
              { icon: Cpu,           t: 'Consuming, not creating',  s: 'Hours of screen time without ever shipping anything.' },
            ].map((p, i) => (
              <div key={i} className="bg-white border-2 border-red-100 rounded-2xl p-6 hover:border-[#D63031] transition-all" data-testid={`problem-${i}`}>
                <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 flex items-center justify-center text-[#D63031] mb-3">
                  <p.icon className="w-6 h-6" />
                </div>
                <h3 className="font-black text-[#0F1E33] text-base">{p.t}</h3>
                <p className="text-sm text-slate-500 mt-1.5">{p.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTION ─────────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 relative">
        <TechGrid accent="#1E3A5F" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold tracking-widest text-[#D63031] uppercase">A different kind of class</span>
          <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2 mb-4">The Future Skills Program</h2>
          <p className="text-slate-600 max-w-2xl mx-auto mb-10 text-lg">
            Once a week, your child walks into a centre, picks up a kit, and <strong className="text-[#1E3A5F]">builds something real</strong>.
            Robots that move. Code that runs. Designs that print. Across 5 future-defining skill tracks — taught by educators, not videos.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: Hammer,    t: 'Build by doing',     s: 'Every class produces a thing they take home or display.' },
              { icon: Lightbulb, t: 'Curiosity-led',      s: 'Kids choose what to deepen — robots, AI, 3D, you decide.' },
              { icon: Rocket,    t: 'Compounding skills', s: 'Today\'s line-follower becomes tomorrow\'s drone.' },
            ].map((p, i) => (
              <div key={i} className="bg-white border-2 border-slate-100 rounded-2xl p-6 hover:border-[#1E3A5F] transition-all hover:-translate-y-0.5">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-red-50 to-blue-50 flex items-center justify-center text-[#1E3A5F] mb-3 border border-blue-200">
                  <p.icon className="w-6 h-6" />
                </div>
                <h3 className="font-black text-[#0F1E33] text-base">{p.t}</h3>
                <p className="text-sm text-slate-500 mt-1.5">{p.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT THEY LEARN ──────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#D63031] uppercase">5 Tracks · 1 program</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">What your child will actually walk away with</h2>
            <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm">Outcome-focused, grade-mapped, taught hands-on.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SKILLS.map((s, i) => (
              <div key={s.key}
                className="group relative bg-white border-2 border-slate-100 hover:border-[#1E3A5F] rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1"
                data-testid={`skill-card-${s.key}`}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D63031] to-[#1E3A5F] text-white flex items-center justify-center mb-4 shadow-lg shadow-blue-900/30">
                  <s.icon className="w-7 h-7" />
                </div>
                <div className="text-[11px] font-bold tracking-wider uppercase text-[#D63031]">{s.tag}</div>
                <h3 className="text-xl font-black text-[#0F1E33] mt-1">{s.name}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">{s.out}</p>
              </div>
            ))}
            <div className="relative bg-gradient-to-br from-[#0F1E33] to-[#1E3A5F] text-white border-2 border-blue-900 rounded-2xl p-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                <Trophy className="w-7 h-7 text-[#FCA5A5]" />
              </div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-[#FCA5A5]">Year-end</div>
              <h3 className="text-xl font-black mt-1">Tech Showcase Project</h3>
              <p className="text-sm text-blue-100 leading-relaxed mt-2">Every student presents their year's biggest build — robots, apps, AI projects — to parents and an industry panel.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CURRICULUM BY TIER ───────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#D63031] uppercase">Grade-mapped curriculum</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">A different curriculum for every age.</h2>
            <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm">Same five skill tracks, paced exactly right for your child's grade.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                tier: 'Junior',
                grades: 'Grades 1 – 4',
                accent: 'from-[#D63031] to-[#7B2C5C]',
                badge: 'bg-red-50 text-[#D63031] border-red-200',
                items: [
                  'Story-led robotics — first robots that move, light up & beep',
                  'Block coding (Scratch) — animations & simple games',
                  'AI play — train an image classifier with their drawings',
                  'Intro 3D — Tinkercad shapes, name keyrings, simple models',
                  'Soft skills — listening, sharing kits, asking "what if?"',
                ],
              },
              {
                tier: 'Middle',
                grades: 'Grades 5 – 7',
                accent: 'from-[#7B2C5C] to-[#1E3A5F]',
                badge: 'bg-gradient-to-r from-red-50 to-blue-50 text-[#7B2C5C] border-blue-200',
                items: [
                  'Sensor robotics — line followers, obstacle avoidance, claws',
                  'Python intro — first scripts, console games, simple bots',
                  'AI tools — chatbots, image gen, deepfake spotting',
                  'Tinkercad 3D — print-ready models, mechanical assemblies',
                  'Project showcase — a build they own and present',
                ],
              },
              {
                tier: 'Senior',
                grades: 'Grades 8 – 10',
                accent: 'from-[#1E3A5F] to-[#0F1E33]',
                badge: 'bg-blue-50 text-[#1E3A5F] border-blue-200',
                items: [
                  'Advanced robotics + IoT — Arduino, sensors, smart-home circuits',
                  'Python projects — automations, web scrapers, mini apps',
                  'ML basics — train a real model, evaluate accuracy, ethics',
                  'Fusion 360 + 3D printing — designed-to-print engineering',
                  'Capstone build — portfolio-grade tech project for school & beyond',
                ],
              },
            ].map((t, i) => (
              <div key={t.tier}
                className="relative bg-white border-2 border-slate-100 hover:border-[#1E3A5F] rounded-3xl p-6 transition-all hover:shadow-xl hover:shadow-blue-100/40 hover:-translate-y-1"
                data-testid={`tier-card-${t.tier.toLowerCase()}`}>
                <div className={`inline-flex items-center text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded-full border ${t.badge}`}>
                  {t.grades}
                </div>
                <h3 className={`text-2xl font-black mt-3 bg-gradient-to-r ${t.accent} bg-clip-text text-transparent`}>
                  {t.tier} Track
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {t.items.map((line, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                      <Check className="w-4 h-4 text-[#D63031] flex-shrink-0 mt-0.5" /> {line}
                    </li>
                  ))}
                </ul>
                <button onClick={goTrial}
                  className="mt-5 text-xs font-bold text-[#1E3A5F] hover:text-[#D63031] inline-flex items-center gap-1 transition-colors"
                  data-testid={`tier-trial-${t.tier.toLowerCase()}-btn`}>
                  Book free trial for this tier <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#D63031] uppercase">How the program runs</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">A rhythm that fits your week</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW.map((h, i) => (
              <div key={i} className="bg-white border-2 border-slate-100 rounded-2xl p-6 text-center hover:border-[#1E3A5F] transition-all" data-testid={`how-${i}`}>
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-red-50 to-blue-50 border border-blue-200 flex items-center justify-center text-[#1E3A5F] mb-3">
                  <h.icon className="w-6 h-6" />
                </div>
                <h3 className="font-black text-[#0F1E33]">{h.t}</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-snug">{h.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRANSFORMATION ───────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-[#0F1E33] via-[#1E3A5F] to-[#0F1E33] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#FCA5A5] uppercase">The transformation</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">From screen-stuck to skill-stacked.</h2>
            <p className="text-blue-200 max-w-2xl mx-auto mt-2 text-sm">A 90-day shift in how your child sees themselves and tech.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl border-2 border-[#D63031]/40 bg-[#D63031]/5 p-6">
              <div className="text-[11px] font-bold tracking-widest uppercase text-[#FCA5A5] mb-2">Before OLL</div>
              <ul className="space-y-3">
                {TRANSFORM.before.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 w-7 h-7 rounded-lg bg-[#D63031]/20 border border-[#D63031]/40 flex items-center justify-center text-[#FCA5A5] flex-shrink-0">
                      <b.icon className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <div className="font-bold">{b.t}</div>
                      <div className="text-xs text-blue-200">{b.s}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-blue-300/40 bg-blue-300/10 p-6">
              <div className="text-[11px] font-bold tracking-widest uppercase text-blue-200 mb-2">After 3 months at OLL</div>
              <ul className="space-y-3">
                {TRANSFORM.after.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 w-7 h-7 rounded-lg bg-blue-300/20 border border-blue-200/40 flex items-center justify-center text-blue-100 flex-shrink-0">
                      <a.icon className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <div className="font-bold">{a.t}</div>
                      <div className="text-xs text-blue-100">{a.s}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#D63031] uppercase">Numbers parents trust</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">2,500+ kids. 500+ schools. One mission.</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
            {STATS.map((s, i) => (
              <div key={i} className="bg-gradient-to-br from-white via-red-50/20 to-blue-50/30 border-2 border-blue-100 rounded-2xl p-5 text-center" data-testid={`stat-${i}`}>
                <div className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-[#D63031] to-[#1E3A5F] bg-clip-text text-transparent">{s.v}</div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white border-2 border-slate-100 rounded-2xl p-6" data-testid={`testimonial-${i}`}>
                <Quote className="w-6 h-6 text-[#D63031]/60 mb-3" />
                <p className="text-sm text-slate-700 leading-relaxed italic">"{t.quote}"</p>
                <div className="flex items-center gap-1 mt-3 mb-1">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-[#D63031] text-[#D63031]" />)}
                </div>
                <div className="text-xs font-bold text-[#0F1E33]">{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16 lg:py-20 bg-gradient-to-b from-blue-50/40 to-white relative">
        <TechGrid accent="#1E3A5F" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#D63031] uppercase">Investment, not expense</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">Simple subscription pricing</h2>
            <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm">Cancel anytime. Robotic kit free with yearly. 1 free make-up class per month.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-7 hover:border-[#1E3A5F] transition-all" data-testid="plan-monthly">
              <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">Monthly</div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-5xl font-black text-[#0F1E33]">₹2,000</span>
                <span className="text-sm text-slate-500 font-bold">/month</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Cancel anytime · Billed monthly</div>
              <ul className="space-y-2.5 mt-5 text-sm text-slate-700">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#1E3A5F]" /> 4 classes per month</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#1E3A5F]" /> All 5 skill tracks</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#1E3A5F]" /> Small batch · max 10</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#1E3A5F]" /> Kit access at centre</li>
                <li className="flex items-center gap-2 text-slate-400"><X className="w-4 h-4 text-slate-300" /> Take-home robotic kit</li>
              </ul>
              <button onClick={() => goSubscribe('monthly')}
                className="w-full mt-6 py-3 rounded-xl border-2 border-[#1E3A5F] text-[#1E3A5F] font-bold hover:bg-[#1E3A5F] hover:text-white transition-all"
                data-testid="plan-monthly-btn">
                Choose Monthly
              </button>
            </div>

            <div className="relative bg-gradient-to-br from-[#1E3A5F] to-[#0F1E33] text-white border-2 border-[#D63031] rounded-3xl p-7 shadow-2xl shadow-blue-900/30" data-testid="plan-yearly">
              <span className="absolute -top-3 right-6 bg-[#D63031] text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-lg shadow-[#D63031]/40">Save ₹3,000</span>
              <div className="text-xs font-bold tracking-widest text-[#FCA5A5] uppercase">Yearly · Best Value</div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-5xl font-black">₹1,750</span>
                <span className="text-sm text-blue-200 font-bold">/month</span>
              </div>
              <div className="text-xs text-blue-200 mt-1">₹21,000 billed annually</div>
              <ul className="space-y-2.5 mt-5 text-sm">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#FCA5A5]" /> 48 classes (full year)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#FCA5A5]" /> All 5 skill tracks</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#FCA5A5]" /> Small batch · max 10</li>
                <li className="flex items-center gap-2 text-[#FCA5A5] font-semibold"><Gift className="w-4 h-4 text-[#FCA5A5]" /> Free Robotic Kit · Take Home</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#FCA5A5]" /> Year-end Tech Showcase</li>
              </ul>
              <button onClick={() => goSubscribe('yearly')}
                className="w-full mt-6 py-3 rounded-xl bg-[#D63031] text-white font-bold hover:bg-[#B52828] transition-all shadow-lg shadow-[#D63031]/40"
                data-testid="plan-yearly-btn">
                Choose Yearly · Save ₹3,000
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── URGENCY + FINAL CTA ─────────────────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#D63031] via-[#7B2C5C] to-[#1E3A5F] rounded-3xl p-8 lg:p-12 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-xs font-bold tracking-wide backdrop-blur-sm">
                <Clock className="w-3.5 h-3.5" /> NEW BATCH FILLING UP · ONLY 4 SEATS LEFT
              </div>
              <h2 className="text-3xl lg:text-5xl font-black mt-4">Don't miss the next batch.</h2>
              <p className="text-white/90 mt-3 text-base lg:text-lg max-w-2xl mx-auto">
                Each batch caps at 10 students for a reason. Once it fills, you wait a month.
                Free trial slots are limited too — claim yours before it's gone.
              </p>
              <div className="flex flex-wrap gap-3 justify-center mt-6">
                <button onClick={goTrial}
                  className="px-7 py-3.5 rounded-full bg-white text-[#1E3A5F] font-bold text-base hover:bg-slate-100 transition-all shadow-lg flex items-center gap-2"
                  data-testid="final-cta-trial-btn">
                  Book Free Trial Class <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={() => goSubscribe('yearly')}
                  className="px-7 py-3.5 rounded-full border-2 border-white text-white font-bold text-base hover:bg-white/10 transition-all">
                  Subscribe Now · Save ₹3,000
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] text-center mb-2">Parent questions, answered.</h2>
          <p className="text-center text-slate-500 mb-8 text-sm">Quick answers to what every parent asks before booking.</p>
          <div className="space-y-2.5">
            {FAQ.map((f, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`bg-white border-2 ${isOpen ? 'border-[#1E3A5F]' : 'border-slate-100'} rounded-2xl overflow-hidden transition-all`} data-testid={`faq-${idx}`}>
                  <button onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-blue-50/30">
                    <span className="font-bold text-[#0F1E33] text-sm">{f.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-[#D63031]' : ''}`} />
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

export default FutureSkillsLandingPage;
