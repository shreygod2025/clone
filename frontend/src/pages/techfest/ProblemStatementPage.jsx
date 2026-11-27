/**
 * ProblemStatementPage — /techfest-iitbombay/problem-statement
 *
 * Replaces the raw PDF (1,837 impressions · 1.5% CTR per Search Console)
 * with a crawlable HTML page. The PDF stays as a download link so teams
 * can still read it offline, but Google now ranks the HTML page which
 * cross-links to the kits and the competition landings.
 */
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Download,
  FileText,
  Flag,
  Zap,
  Lightbulb,
} from 'lucide-react';
import Footer from '../../components/Footer';
import { useSeo } from '../../hooks/useSeo';
import { ogImage } from '../../utils/ogImage';

const CANONICAL = 'https://oll.co/techfest-iitbombay/problem-statement';
const PDF_URL = '/techfest/problem-statement.pdf';

const OLL_LOGO =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const TECHFEST_LOGO = '/techfest/techfest-iitb-logo.webp';

const SECTIONS = [
  { k: 'Overview', body: 'The OLL Robotics Championship, powered by Techfest IIT Bombay 2026-27, is India\'s biggest school robotics stage. It has three competition tracks — RoboSumo, RoboRacer and the Robotics Innovation Challenge. This document is the official problem statement for all three tracks: it details the eligibility, formats, round-by-round progression, bot/prototype specifications, judging rubrics and submission requirements.' },
  { k: 'Eligibility', body: 'Open to all school teams from Grade 6 upward. Teams must have one assigned school mentor (teacher or coach) and register through the official OLL Techfest form. There is no registration fee for any track or round.' },
  { k: 'Tracks & format', body: 'Each student may enter exactly one track. RoboSumo and RoboRacer follow a three-round path — R1 online submission, R2 live Regional Qualifier in your region, R3 Grand Finale at IIT Bombay (17 Dec 2026). The Robotics Innovation Challenge follows a two-round path — R1 online prototype submission, R2 Direct Grand Finale at IIT Bombay.' },
];

const SUMO_SPECS = [
  { k: 'Arena', v: '100 cm (1 m) circular diameter, marked boundary' },
  { k: 'Bot Envelope', v: '25 × 25 × 25 cm max' },
  { k: 'Bot Weight', v: '3 kg max (incl. battery)' },
  { k: 'Control', v: 'Autonomous, wired or wireless RC — one channel per team' },
  { k: 'Match', v: '2 min · knockout · first push-out wins' },
  { k: 'Grace period', v: '2 min to fix a non-functional bot before forfeit' },
];

const RACER_SPECS = [
  { k: 'Track', v: '5 m straight · 2 parallel lanes' },
  { k: 'Bot Envelope', v: '20 × 20 × 15 cm max' },
  { k: 'Bot Weight', v: '1.5 kg max (incl. battery)' },
  { k: 'Control', v: 'Wireless RC only · 1 channel per team' },
  { k: 'Heat', v: '2 min · knockout · first across finish wins' },
  { k: 'Dead heat', v: 'Immediate re-race between the same two bots' },
];

const INNOVATION_SPECS = [
  { k: 'Team Size', v: '2–4 students + 1 mentor' },
  { k: 'Round 1', v: '2-page concept note + 60–90 s prototype video' },
  { k: 'Round 2', v: 'Live pitch + physical demo at IIT Bombay' },
  { k: 'Hardware', v: 'Open — Arduino, ESP32, Raspberry Pi, LLMs, CV, 3D-printed parts' },
  { k: 'Scoring', v: 'Originality 20% · Technical rigour 30% · Impact 25% · Pitch 15% · Team 10%' },
];

const ProblemStatementPage = () => {
  useSeo({
    title: 'OLL × Techfest 2026 — Official Problem Statement | IIT Bombay',
    description:
      'Official Problem Statement for the OLL Robotics Championship, powered by Techfest IIT Bombay 2026-27. Rules, bot specs, judging rubric and submission format for RoboSumo, RoboRace and the Robotics Innovation Challenge.',
    keywords:
      'oll techfest problem statement, robo sumo rules, robo race rules, robotics innovation challenge rules, techfest iit bombay 2026 rulebook, oll robotics championship rulebook',
    canonical: CANONICAL,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1',
    og: {
      title: 'OLL × Techfest 2026 — Official Problem Statement',
      description:
        'Full rulebook, bot specifications and judging rubric for the OLL Robotics Championship powered by Techfest IIT Bombay 2026-27.',
      image: ogImage('https://oll.co/techfest/1.webp'),
      type: 'article',
      url: CANONICAL,
      siteName: 'OLL',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'OLL × Techfest 2026 — Problem Statement',
      description: 'The official rulebook for RoboSumo, RoboRace and the Robotics Innovation Challenge.',
    },
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: 'OLL × Techfest 2026 — Official Problem Statement',
        description:
          'The official rulebook, bot specifications and judging rubric for the OLL Robotics Championship powered by Techfest IIT Bombay 2026-27.',
        datePublished: '2026-08-01T09:00:00+05:30',
        dateModified: new Date().toISOString(),
        author: { '@type': 'Organization', name: 'OLL', url: 'https://oll.co' },
        publisher: {
          '@type': 'Organization',
          name: 'OLL',
          logo: { '@type': 'ImageObject', url: 'https://oll.co/favicon.png' },
        },
        mainEntityOfPage: CANONICAL,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://oll.co/' },
          { '@type': 'ListItem', position: 2, name: 'Techfest IIT Bombay 2026', item: 'https://oll.co/techfest' },
          { '@type': 'ListItem', position: 3, name: 'Problem Statement', item: CANONICAL },
        ],
      },
    ],
  });

  return (
    <main className="min-h-screen bg-white text-slate-900" data-testid="problem-statement-page">
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex-shrink-0" data-testid="ps-nav-oll-logo">
            <img src={OLL_LOGO} alt="OLL" className="h-7 sm:h-8 w-auto" />
          </Link>
          <a
            href={PDF_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-bold uppercase tracking-wider"
            data-testid="ps-download-pdf"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A5F 60%, #DC2626 150%)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-white">
          <div className="flex items-center gap-3 mb-4">
            <img src={TECHFEST_LOGO} alt="Techfest IIT Bombay" className="h-9 w-auto" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/70 font-bold">
              OLL × TechFest IIT Bombay · 2026-27 · Official Rulebook
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight max-w-4xl">
            OLL Robotics Championship — Official Problem Statement
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white/85 max-w-3xl leading-relaxed">
            The complete rulebook for the three competition tracks at Techfest, IIT Bombay 2026-27 —
            RoboSumo, RoboRace and the Robotics Innovation Challenge. Eligibility, bot specifications,
            round-by-round progression, judging rubrics and submission format, all on one page.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={PDF_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-[#0A1F44] text-sm font-black uppercase tracking-widest shadow-lg"
              data-testid="ps-hero-download-pdf"
            >
              <Download className="w-4 h-4" /> Download the official PDF
            </a>
            <Link
              to="/techfest/register"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-black uppercase tracking-widest border border-white/30"
              data-testid="ps-hero-register-cta"
            >
              Register team free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#DC2626]">Overview</div>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 text-[#0A1F44]">What this document covers</h2>
        <div className="mt-8 space-y-6">
          {SECTIONS.map((s) => (
            <div key={s.k} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-black uppercase tracking-widest text-[#DC2626]">{s.k}</div>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* RoboSumo specs */}
      <SpecBlock
        icon={<Flag className="w-5 h-5" />}
        kicker="Track 1 · Battle · 1v1"
        title="RoboSumo — bot & arena specs"
        description="A 1v1 push-out arena battle. Autonomous, wired or wireless RC bots face off on a 1 m circular arena. First bot pushed out of the ring loses."
        rows={SUMO_SPECS}
        competitionTo="/techfest-iitbombay/robo-sumo-competition"
        kitTo="/shop/product/robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a"
        kitLabel="View the Robo Sumo kit"
      />

      {/* Robo Race specs */}
      <SpecBlock
        icon={<Zap className="w-5 h-5" />}
        kicker="Track 2 · Race · 1v1"
        title="Robo Race — bot & track specs"
        description="A 1v1 head-to-head RC sprint. Both bots launch on the referee's signal and race down a 5 m dual-lane straight. First across the finish line wins the heat."
        rows={RACER_SPECS}
        competitionTo="/techfest-iitbombay/robo-race-competition"
        kitTo="/shop/product/robo-racer-kit-specially-made-for-iit-bombay-8bf545dc"
        kitLabel="View the Robo Racer kit"
        tint="light"
      />

      {/* Innovation specs */}
      <SpecBlock
        icon={<Lightbulb className="w-5 h-5" />}
        kicker="Track 3 · Ideate · Prototype · Pitch"
        title="Robotics Innovation Challenge — format & judging"
        description="An open-ended prototype + pitch track. Teams spot a real-world problem, design an original robotics / AI / automation prototype and defend it live before a judging panel at IIT Bombay."
        rows={INNOVATION_SPECS}
        competitionTo="/techfest-iitbombay/robo-innovation-competition"
        kitTo={null}
        kitLabel={null}
      />

      {/* Download CTA */}
      <section className="bg-slate-50 border-t border-slate-200 py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#DC2626]">Prefer the PDF?</div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 text-[#0A1F44]">Download the official rulebook</h2>
          <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto">
            Same content, offline-ready — share it with your school mentor, print it or bring it to the arena.
          </p>
          <a
            href={PDF_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-black uppercase tracking-widest shadow-lg"
            data-testid="ps-footer-download-pdf"
          >
            <FileText className="w-4 h-4" /> Download Problem Statement PDF
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
};

const SpecBlock = ({ icon, kicker, title, description, rows, competitionTo, kitTo, kitLabel, tint = 'default' }) => (
  <section className={`${tint === 'light' ? 'bg-slate-50 border-y border-slate-200' : ''} py-14`}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#DC2626]">
        {icon}
        <span>{kicker}</span>
      </div>
      <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 text-[#0A1F44] max-w-3xl">{title}</h2>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-3xl">{description}</p>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {rows.map((r, i) => (
          <div
            key={r.k}
            className={`grid grid-cols-[160px,1fr] sm:grid-cols-[220px,1fr] gap-3 px-5 py-4 ${i > 0 ? 'border-t border-slate-100' : ''}`}
          >
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center">
              {r.k}
            </div>
            <div className="text-sm text-slate-800 font-semibold">{r.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to={competitionTo}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black uppercase tracking-widest"
          data-testid={`ps-cta-${competitionTo.replace(/\//g, '-')}`}
        >
          View the competition <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        {kitTo && (
          <Link
            to={kitTo}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest"
            data-testid={`ps-kit-${kitTo.replace(/\//g, '-')}`}
          >
            {kitLabel} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  </section>
);

export default ProblemStatementPage;
