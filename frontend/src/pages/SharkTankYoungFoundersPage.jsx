import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Calendar, Users, GraduationCap, Lightbulb, UserCheck, Flag, FileText, Info, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const OFFICIAL_URL = 'https://sharktank.sonyliv.com/youngfounder/oll';
const INFOGRAPHIC = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/bbe3d9a70d71debb_image.png';

const PAGE_URL = 'https://oll.co/shark-tank-young-founders';
const META_TITLE = 'Shark Tank India Young Founders Special 2026 — Eligibility, Dates & Info | OLL';
const META_DESC = 'Everything you need to know about the Shark Tank India Season 6 Young Founders Special. Eligibility (ages 6–15), key dates (registrations 12 Oct – 11 Nov 2026), and the official registration route. Information page by OLL — Online Learning Launchpad.';

// Lightweight head-tag updater — avoids pulling react-helmet just for this page
function useDocumentMeta() {
  useEffect(() => {
    const prev = {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
    };
    document.title = META_TITLE;

    const upsert = (sel, attr, val) => {
      let el = document.querySelector(sel);
      if (!el) {
        el = document.createElement('meta');
        const [k, v] = sel.match(/\[(.+?)="(.+?)"\]/).slice(1, 3);
        el.setAttribute(k, v);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
    };

    upsert('meta[name="description"]', 'content', META_DESC);
    upsert('meta[property="og:title"]', 'content', META_TITLE);
    upsert('meta[property="og:description"]', 'content', META_DESC);
    upsert('meta[property="og:type"]', 'content', 'article');
    upsert('meta[property="og:url"]', 'content', PAGE_URL);
    upsert('meta[property="og:image"]', 'content', INFOGRAPHIC);
    upsert('meta[name="twitter:card"]', 'content', 'summary_large_image');
    upsert('meta[name="twitter:title"]', 'content', META_TITLE);
    upsert('meta[name="twitter:description"]', 'content', META_DESC);
    upsert('meta[name="twitter:image"]', 'content', INFOGRAPHIC);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', PAGE_URL);

    // JSON-LD Event + BreadcrumbList
    const ldId = 'sti6-yf-jsonld';
    document.getElementById(ldId)?.remove();
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.id = ldId;
    ld.textContent = JSON.stringify([
      {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Shark Tank India Season 6 — Young Founders Special',
        description: META_DESC,
        startDate: '2026-10-12',
        endDate: '2026-11-11',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
        location: { '@type': 'VirtualLocation', url: OFFICIAL_URL },
        image: [INFOGRAPHIC],
        organizer: { '@type': 'Organization', name: 'Shark Tank India / SonyLIV', url: 'https://sharktank.sonyliv.com' },
        offers: { '@type': 'Offer', url: OFFICIAL_URL, price: '0', priceCurrency: 'INR', availability: 'https://schema.org/InStock', validFrom: '2026-10-12' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://oll.co' },
          { '@type': 'ListItem', position: 2, name: 'Shark Tank India Young Founders Special', item: PAGE_URL },
        ],
      },
    ]);
    document.head.appendChild(ld);

    return () => {
      document.title = prev.title;
      if (prev.description) upsert('meta[name="description"]', 'content', prev.description);
      document.getElementById(ldId)?.remove();
    };
  }, []);
}

const FACTS = [
  { icon: Flag, label: 'Initiative', value: 'Shark Tank India Season 6 — Young Founders Special' },
  { icon: Users, label: 'Eligible age', value: '6 to 15 years (as of 12 October 2026)' },
  { icon: GraduationCap, label: 'Citizenship', value: 'Indian' },
  { icon: Calendar, label: 'Registrations open', value: '12 October 2026' },
  { icon: Calendar, label: 'Registrations close', value: '11 November 2026' },
  { icon: Calendar, label: 'Selection period', value: '12 October – 23 December 2026' },
  { icon: Info, label: 'Application fee', value: 'Free' },
  { icon: FileText, label: 'Registration route', value: 'Online via SonyLIV' },
];

const ELIGIBILITY = [
  { icon: Users, title: 'Age', body: 'Between 6 and 15 years old as of 12 October 2026.' },
  { icon: Flag, title: 'Citizenship', body: 'Must be an Indian citizen.' },
  { icon: GraduationCap, title: 'School status', body: 'School-going students, homeschooled children, and school dropouts are eligible, subject to the other stated requirements.' },
  { icon: Lightbulb, title: 'Business stage', body: 'Applicants can apply with a business idea. An established company or existing revenue is not mandatory.' },
  { icon: UserCheck, title: 'Parent or legal guardian', body: 'Because applicants are minors, their parent or legal guardian must complete the registration on their behalf.' },
];

export default function SharkTankYoungFoundersPage() {
  useDocumentMeta();

  return (
    <div className="min-h-screen bg-white" data-testid="shark-tank-yf-page">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 pb-10 px-4 sm:px-6 bg-gradient-to-b from-[#F8FAFC] to-white">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-[#0A1F44]">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700">Shark Tank India Young Founders Special</span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-5">
            <Info className="w-3.5 h-3.5" /> Informational page · External opportunity
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0A1F44] leading-[1.08] tracking-tight">
            Shark Tank India Young Founders Special
          </h1>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed max-w-3xl">
            A quick, no-nonsense guide to the Season 6 Young Founders Special — who can apply, important dates, and where
            to register. We're sharing this because we think young builders should know it exists.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={OFFICIAL_URL}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#0A1F44] text-white rounded-xl font-semibold hover:bg-[#1E3A5F] transition-colors"
              data-testid="sti6-yf-official-link"
            >
              Visit the official page on SonyLIV <ArrowUpRight className="w-4 h-4" />
            </a>
            <span className="text-xs text-slate-500">
              Not affiliated with Sony Pictures or SonyLIV. Please verify details on the official page.
            </span>
          </div>
        </div>
      </section>

      {/* What is it */}
      <section className="py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0A1F44]">What is the Young Founders Special?</h2>
          <div className="mt-4 space-y-4 text-slate-700 leading-relaxed">
            <p>
              Shark Tank India is a business reality show where entrepreneurs present their businesses to a panel of
              investors — the Sharks. Founders explain what they are building, the problem they solve, their customers,
              and how they plan to grow. The Sharks evaluate these opportunities and may offer financial support under
              agreed terms.
            </p>
            <p>
              The <strong>Young Founders Special for Season 6</strong> brings this entrepreneurial platform to younger
              aspiring founders. Unlike the assumption that you need years of business experience to pursue
              entrepreneurship, this initiative welcomes eligible children who have a business idea or an early-stage
              venture they want to develop.
            </p>
            <p>
              The opportunity is not limited to children who already operate established companies. According to the
              official FAQs, applicants can apply with a business idea, including one that is still at the pre-revenue
              stage.
            </p>
          </div>
        </div>
      </section>

      {/* Who Can Apply - infographic + cards */}
      <section className="py-12 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0A1F44]">Who can apply?</h2>
          <p className="mt-3 text-slate-600 max-w-2xl">
            Before beginning the application, families should check whether the applicant meets the eligibility
            requirements listed on the official FAQs.
          </p>

          <img
            src={INFOGRAPHIC}
            alt="Eligibility criteria for Shark Tank India Season 6 Young Founders Special — age 6 to 15, Indian citizen, school-going/homeschooled/dropout eligible, idea-stage okay, parent registers on behalf"
            className="mt-8 w-full rounded-2xl border border-slate-200 shadow-sm"
            loading="lazy"
          />

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ELIGIBILITY.map((c, i) => (
              <div key={i} className="p-5 bg-white rounded-xl border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-[#0A1F44] text-white flex items-center justify-center mb-3">
                  <c.icon className="w-5 h-5" />
                </div>
                <div className="text-sm font-black text-[#0A1F44] uppercase tracking-wide">{c.title}</div>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-slate-500">
            This means a child does not necessarily need to own a registered company or already be generating revenue
            to explore the opportunity. Verify the complete rules on the{' '}
            <a href={OFFICIAL_URL} target="_blank" rel="noopener noreferrer" className="text-[#0A1F44] underline font-semibold">official page</a>.
          </p>
        </div>
      </section>

      {/* Dates & Facts */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0A1F44]">Important dates &amp; details</h2>
          <p className="mt-3 text-slate-600">
            Registrations opened on <strong>12 October 2026</strong> and are scheduled to close on <strong>11 November 2026</strong>,
            per the official FAQs. The selection process runs between <strong>12 October and 23 December 2026</strong>. Organisers reserve the
            right to change timelines, so applicants should check the official platform for updates.
          </p>

          <div className="mt-7 rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {FACTS.map((f, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="w-14 pl-5 py-3.5 align-top">
                      <f.icon className="w-5 h-5 text-[#0A1F44]" aria-hidden="true" />
                    </td>
                    <td className="py-3.5 pr-5 font-semibold text-slate-500 w-56">{f.label}</td>
                    <td className="py-3.5 pr-5 text-[#0A1F44] font-medium">{f.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">
              <strong>Important:</strong> Dates and selection timelines may change. Always verify the latest information on the
              official registration page before applying.
            </p>
          </div>
        </div>
      </section>

      {/* Where to register */}
      <section className="py-12 px-4 sm:px-6 bg-[#0A1F44]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Where to register</h2>
          <p className="mt-4 text-slate-300 leading-relaxed">
            All applications are submitted online through SonyLIV's official registration route. There is no application fee.
            For any changes to timelines, rules, or eligibility, the official page is the single source of truth.
          </p>
          <a
            href={OFFICIAL_URL}
            target="_blank" rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2 px-6 py-3.5 bg-white text-[#0A1F44] rounded-xl font-bold hover:bg-slate-100 transition-colors"
            data-testid="sti6-yf-cta-bottom"
          >
            Open the official registration page <ArrowUpRight className="w-4 h-4" />
          </a>
          <p className="mt-4 text-xs text-slate-400 break-all">{OFFICIAL_URL}</p>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-xs text-slate-500 leading-relaxed">
          <strong className="text-slate-700">Disclaimer:</strong> OLL (Online Learning Launchpad) is sharing this
          information as a community resource for young founders and their families. We are not the organiser of this
          programme. "Shark Tank India" and related marks belong to their respective owners (Sony Pictures Networks India
          / SonyLIV). Always refer to the official Shark Tank India Young Founders Special FAQs and registration page
          for authoritative information. Content on this page is based on the publicly released FAQs dated 12 October 2026
          and may be out of date; verify before applying.
        </div>
      </section>

      <Footer />
    </div>
  );
}
