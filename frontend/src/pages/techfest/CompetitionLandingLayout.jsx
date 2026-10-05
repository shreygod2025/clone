/**
 * CompetitionLandingLayout
 * ─────────────────────────
 * Shared, SEO-first scaffold used by the three Techfest competition
 * landing pages (RoboSumo, RoboRacer, Robotics Innovation Challenge)
 * and the HTML Problem-Statement page.
 *
 * Why a shared layout:
 *   • Keeps keyword scaffolding (H1, hero, FAQ, JSON-LD) consistent
 *   • Mobile-first by default — single-column, large tap targets
 *   • Each page only passes DATA (title, rules, prize, kit URL, …)
 *   • Any crawler sees the same clean Breadcrumb/Event/FAQPage schema
 *
 * NOT a generic "competition page builder" — this is tailored to the
 * OLL × TechFest IIT Bombay 2026-27 championship copy only.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Calendar,
  Check,
  ChevronRight,
  Download,
  FileText,
  Flag,
  MapPin,
  Trophy,
  Youtube,
  Zap,
} from 'lucide-react';
import Footer from '../../components/Footer';
import { useSeo } from '../../hooks/useSeo';
import { ogImage } from '../../utils/ogImage';

const OLL_LOGO =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const TECHFEST_LOGO = '/techfest/techfest-iitb-logo.webp';

// Grand Finale metadata — single source of truth, surfaced in Event
// schema so Google can show "Dec 17, 2026 · IIT Bombay" rich result.
const GRAND_FINALE = {
  startISO: '2026-12-17T09:00:00+05:30',
  endISO: '2026-12-19T18:00:00+05:30',
  venue: 'TechFest, IIT Bombay',
  city: 'Mumbai',
  country: 'IN',
  address: 'Indian Institute of Technology Bombay, Powai, Mumbai — 400076',
};

/**
 * data = {
 *   slug, canonical, title, h1, kicker, tagline, metaDescription, keywords,
 *   heroImage, heroImageAlt, videoId,
 *   stats: [{k,v}],              // 4 pill cards
 *   whyParticipate: [string],
 *   rounds: [{k,v,when}],
 *   rules: [string],
 *   judging: [{k,v,d}],
 *   prizes: [{k,v}],
 *   kit: { title, slug, bullets:[string] } | null,
 *   faqs: [{q,a}],
 *   relatedBlogs: [{to,title}],  // internal link block for SEO
 * }
 */
export const CompetitionLandingLayout = ({ data }) => {
  const CANONICAL = data.canonical;
  const OG_IMAGE = useMemo(
    () => {
      const src = data.heroImage?.startsWith('http')
        ? data.heroImage
        : `https://oll.co${data.heroImage || '/techfest/1.webp'}`;
      return ogImage(src);
    },
    [data.heroImage],
  );

  const jsonLd = useMemo(
    () => [
      // 1) Event — rich result eligibility
      {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: data.h1,
        description: data.metaDescription,
        startDate: GRAND_FINALE.startISO,
        endDate: GRAND_FINALE.endISO,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        image: [data.heroImage?.startsWith('http') ? data.heroImage : `https://oll.co${data.heroImage}`],
        location: {
          '@type': 'Place',
          name: GRAND_FINALE.venue,
          address: {
            '@type': 'PostalAddress',
            streetAddress: GRAND_FINALE.address,
            addressLocality: GRAND_FINALE.city,
            addressCountry: GRAND_FINALE.country,
          },
        },
        organizer: {
          '@type': 'Organization',
          name: 'OLL (On Learn Learn)',
          url: 'https://oll.co',
        },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
          url: 'https://oll.co/techfest/register',
          validFrom: '2026-01-01T00:00:00+05:30',
        },
        performer: {
          '@type': 'PerformingGroup',
          name: 'School teams across India',
        },
      },
      // 2) Breadcrumb
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://oll.co/' },
          { '@type': 'ListItem', position: 2, name: 'Techfest IIT Bombay 2026', item: 'https://oll.co/techfest' },
          { '@type': 'ListItem', position: 3, name: data.h1, item: CANONICAL },
        ],
      },
      // 3) FAQPage
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: (data.faqs || []).map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
    [data, CANONICAL],
  );

  useSeo({
    title: data.title,
    description: data.metaDescription,
    keywords: data.keywords,
    canonical: CANONICAL,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1',
    og: {
      title: data.h1,
      description: data.metaDescription,
      image: OG_IMAGE,
      type: 'article',
      url: CANONICAL,
      siteName: 'OLL',
    },
    twitter: {
      card: 'summary_large_image',
      title: data.h1,
      description: data.metaDescription,
      image: OG_IMAGE,
    },
    jsonLd,
  });

  return (
    <main className="min-h-screen bg-white text-slate-900" data-testid={`comp-page-${data.slug}`}>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex-shrink-0" data-testid="comp-nav-oll-logo">
            <img src={OLL_LOGO} alt="OLL — Learn Future Skills" className="h-7 sm:h-8 w-auto" />
          </Link>
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
            <Link to="/techfest" className="hover:text-[#DC2626] font-semibold" data-testid="comp-nav-techfest">
              Techfest IIT Bombay 2026
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="font-bold text-slate-900">{data.breadcrumbLeaf || data.h1}</span>
          </div>
          <Link
            to="/techfest/register"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-bold uppercase tracking-wider"
            data-testid="comp-nav-register-cta"
          >
            Register Free <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A5F 60%, #DC2626 150%)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-white">
          <div className="flex items-center gap-3 mb-4">
            <img src={TECHFEST_LOGO} alt="Techfest IIT Bombay" className="h-9 w-auto" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/70 font-bold">
              {data.kicker}
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight max-w-4xl">
            {data.h1}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white/85 max-w-2xl leading-relaxed">
            {data.heroLede || data.metaDescription}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/techfest/register"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-[#0A1F44] text-sm font-black uppercase tracking-widest shadow-lg hover:shadow-xl transition"
              data-testid="comp-hero-register-cta"
            >
              Register your team · Free <ArrowRight className="w-4 h-4" />
            </Link>
            {data.kit?.slug && (
              <Link
                to={`/shop/product/${data.kit.slug}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-black uppercase tracking-widest border border-white/30"
                data-testid="comp-hero-kit-cta"
              >
                Get the Official Kit <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {data.stats?.map((s) => (
              <div key={s.k} className="bg-white/10 border border-white/20 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-widest text-white/70 font-bold">{s.k}</div>
                <div className="mt-1 text-xl font-black tracking-tight">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why participate ─────────────────────────────────────── */}
      {data.whyParticipate?.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#DC2626]">Why compete</div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 text-[#0A1F44] max-w-3xl">
            Built for school teams who want to win on India&apos;s biggest robotics stage.
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {data.whyParticipate.map((w, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <BadgeCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700 leading-relaxed">{w}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Video (optional) ────────────────────────────────────── */}
      {data.videoId && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
          <div className="rounded-3xl overflow-hidden border border-slate-200 bg-black shadow-xl" style={{ paddingTop: '56.25%', position: 'relative' }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube-nocookie.com/embed/${data.videoId}?rel=0&modestbranding=1`}
              title={`${data.h1} — video`}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
            <Youtube className="w-4 h-4 text-[#DC2626]" />
            Watch the full build / explainer on YouTube
          </div>
        </section>
      )}

      {/* ── Rounds ──────────────────────────────────────────────── */}
      {data.rounds?.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 border-t border-slate-100">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#DC2626]">The road to IIT Bombay</div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 text-[#0A1F44]">Competition rounds</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {data.rounds.map((r, i) => (
              <div key={r.k} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="absolute -top-3 left-6 text-[10px] font-black uppercase tracking-widest bg-[#DC2626] text-white px-2 py-1 rounded">
                  Round {i + 1}
                </div>
                <div className="mt-3 text-lg font-black text-[#0A1F44]">{r.k}</div>
                {r.when && (
                  <div className="mt-1 text-[11px] uppercase tracking-widest text-slate-500 flex items-center gap-1 font-bold">
                    <Calendar className="w-3 h-3" /> {r.when}
                  </div>
                )}
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{r.v}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Rules ───────────────────────────────────────────────── */}
      {data.rules?.length > 0 && (
        <section className="bg-slate-50 border-y border-slate-200 py-14">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#DC2626]">The ring, the rules</div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 text-[#0A1F44]">Competition rules</h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 text-sm text-slate-700 leading-relaxed">
              {data.rules.map((r, i) => (
                <li key={i} className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-4">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#DC2626] flex-shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/techfest-iitbombay/problem-statement"
              className="mt-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#DC2626] hover:text-[#7f1d1d]"
              data-testid="comp-problem-statement-cta"
            >
              <FileText className="w-4 h-4" />
              Read the full Problem Statement <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Judging ─────────────────────────────────────────────── */}
      {data.judging?.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#DC2626]">How teams get scored</div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 text-[#0A1F44]">Judging rubric</h2>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {data.judging.map((j, i) => (
              <div key={j.k} className={`grid grid-cols-[1fr,auto] gap-3 items-start px-5 py-4 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                <div>
                  <div className="font-bold text-[#0A1F44]">{j.k}</div>
                  <div className="text-xs text-slate-500 leading-relaxed mt-0.5">{j.d}</div>
                </div>
                <div className="text-2xl font-black text-[#DC2626] tabular-nums leading-none pt-0.5">{j.v}</div>
              </div>
            ))}
            <div className="grid grid-cols-[1fr,auto] gap-3 items-center px-5 py-4 border-t-2 border-slate-200 bg-slate-50">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">Total weightage</div>
              <div className="text-2xl font-black text-[#0A1F44]">100%</div>
            </div>
          </div>
        </section>
      )}

      {/* ── Prizes ──────────────────────────────────────────────── */}
      {data.prizes?.length > 0 && (
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0A1F44] via-[#111827] to-[#DC2626] text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">What you take home</div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2">Prizes & recognition</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {data.prizes.map((p, i) => (
                <div key={p.k} className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/70 font-bold">
                    <Trophy className="w-3.5 h-3.5" /> Rank {i + 1}
                  </div>
                  <div className="mt-2 text-lg font-black">{p.k}</div>
                  <div className="mt-1 text-2xl font-black tracking-tight">{p.v}</div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-white/70 max-w-2xl">
              Every participating team receives a Certificate of Participation. Grand Finale teams
              get a Certificate of Finalist Recognition. Prize-money payouts via NEFT by May 2027.
            </p>
          </div>
        </section>
      )}

      {/* ── Kit callout ─────────────────────────────────────────── */}
      {data.kit?.slug && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="grid md:grid-cols-[1.15fr,1fr]">
              <div className="p-6 sm:p-10 flex flex-col justify-center">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#DC2626]">Official OLL × TechFest kit</div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 text-[#0A1F44]">{data.kit.title}</h2>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Everything your team needs to compete — pre-engineered against the official
                  problem statement, with build tutorials and starter code included.
                </p>
                <ul className="mt-5 grid gap-2.5">
                  {data.kit.bullets?.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link
                    to={`/shop/product/${data.kit.slug}`}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-black uppercase tracking-widest"
                    data-testid="comp-kit-cta"
                  >
                    View the kit <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <div className="relative bg-slate-50 min-h-[320px]">
                <img
                  src={data.heroImage}
                  alt={data.heroImageAlt}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      {data.faqs?.length > 0 && (
        <section className="bg-slate-50 border-t border-slate-200 py-14">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#DC2626]">Parents, teachers & students ask</div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 text-[#0A1F44]">Frequently asked questions</h2>
            <div className="mt-8 divide-y divide-slate-200 bg-white border border-slate-200 rounded-2xl">
              {data.faqs.map((f, i) => (
                <details key={i} className="group p-5" data-testid={`comp-faq-${i}`}>
                  <summary className="flex items-start gap-3 cursor-pointer list-none">
                    <ChevronRight className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-1 transition-transform group-open:rotate-90" />
                    <span className="font-bold text-[#0A1F44]">{f.q}</span>
                  </summary>
                  <p className="mt-3 ml-7 text-sm text-slate-600 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Related / Internal link rail ────────────────────────── */}
      {data.relatedBlogs?.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#DC2626]">Go deeper</div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-2 text-[#0A1F44]">You may also like</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.relatedBlogs.map((r) => (
              <Link
                key={r.to}
                to={r.to}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
                data-testid={`comp-related-${r.to.replace(/\//g, '-')}`}
              >
                <div className="text-[10px] uppercase tracking-widest text-[#DC2626] font-black">{r.kicker || 'Guide'}</div>
                <div className="mt-2 font-bold text-[#0A1F44] group-hover:text-[#DC2626] transition">{r.title}</div>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-[#DC2626]">
                  Read <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: '#0A1F44' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 text-center text-white">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Register in 2 minutes</div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-2 max-w-2xl mx-auto">
            Ready to compete at IIT Bombay?
          </h2>
          <p className="mt-3 text-sm text-white/80 max-w-xl mx-auto">
            Grab your official kit, register your team and start the build — the Grand Finale is
            waiting on Dec 17, 2026.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/techfest/register"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-black uppercase tracking-widest shadow-lg"
              data-testid="comp-final-register-cta"
            >
              Register team <ArrowRight className="w-4 h-4" />
            </Link>
            {data.kit?.slug && (
              <Link
                to={`/shop/product/${data.kit.slug}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-[#0A1F44] text-sm font-black uppercase tracking-widest"
                data-testid="comp-final-kit-cta"
              >
                Buy the kit <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default CompetitionLandingLayout;
