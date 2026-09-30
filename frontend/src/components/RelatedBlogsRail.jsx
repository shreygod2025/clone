/**
 * RelatedBlogsRail — small "You may also like" strip that cross-links the
 * long-form pillar blogs (RoboSumo build guide ↔ ICSE Code 66 guide).
 *
 * Kept as a lightweight, dependency-free component so any future blog can
 * drop it in with just: <RelatedBlogsRail exclude="robosumo-build-guide" />
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';

const POSTS = [
  {
    id: 'robosumo-build-guide',
    slug: 'how-to-build-robosumo-robot-iit-bombay-techfest',
    title: 'How to Build a RoboSumo Robot for Robotics Competitions',
    excerpt:
      "A national RoboSumo winner's step-by-step build guide — ESP32, BTS7960, LiPo, code and testing — for the OLL × TechFest championship at IIT Bombay.",
    cover: '/blog-assets/robosumo/hero-robosumo-circuit-diagram.png',
    readTime: '18 min',
    eyebrow: 'OLL × TechFest',
  },
  {
    id: 'icse-code66-guide',
    slug: 'icse-robotics-ai-code-66-classes-9-10-guide',
    title: 'ICSE Robotics & AI Group 3 Subject (Code 66): Complete Guide for Schools',
    excerpt:
      'CISCE syllabus, exam pattern, lab setup, Python and teacher support — the full implementation playbook for schools introducing Subject Code 66 in Classes 9 and 10.',
    cover: '/blog-assets/icse-code66/icse-code66-hero-banner-v2.jpg',
    readTime: '22 min',
    eyebrow: 'ICSE Code 66',
  },
];

const RelatedBlogsRail = ({ exclude, heading = 'You may also like', theme = 'light' }) => {
  const posts = POSTS.filter((p) => p.id !== exclude);
  if (posts.length === 0) return null;

  const dark = theme === 'dark';
  return (
    <section
      className={`not-prose max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-10 lg:py-14 ${
        dark ? 'text-white' : ''
      }`}
      data-testid="related-blogs-rail"
    >
      <div className="flex items-baseline justify-between mb-6">
        <h2
          className={`text-[22px] md:text-[26px] font-bold tracking-tight ${
            dark ? 'text-white' : 'text-[#0A1F44]'
          }`}
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {heading}
        </h2>
        <Link
          to="/blogs"
          className={`text-sm font-semibold hover:underline flex items-center gap-1 ${
            dark ? 'text-[#FDBA74]' : 'text-[#DC2626]'
          }`}
          data-testid="related-blogs-all-link"
        >
          All blogs <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className={`grid gap-5 ${posts.length === 1 ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
        {posts.map((p) => (
          <Link
            key={p.id}
            to={`/blogs/${p.slug}`}
            className={`group relative rounded-2xl overflow-hidden border transition-shadow hover:shadow-xl ${
              dark
                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                : 'bg-white border-slate-200'
            }`}
            data-testid={`related-blog-${p.id}`}
          >
            <div className="grid grid-cols-[130px_1fr] sm:grid-cols-[180px_1fr]">
              <div className="bg-slate-100 overflow-hidden">
                <img
                  src={p.cover}
                  alt={p.title}
                  width={360}
                  height={220}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 sm:p-5">
                <div
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 ${
                    dark ? 'text-[#FDBA74]' : 'text-[#DC2626]'
                  }`}
                >
                  {p.eyebrow}
                </div>
                <h3
                  className={`font-bold leading-snug mb-2 line-clamp-2 ${
                    dark ? 'text-white' : 'text-[#0A1F44]'
                  }`}
                  style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.05rem' }}
                >
                  {p.title}
                </h3>
                <p
                  className={`text-[13px] leading-relaxed line-clamp-2 mb-2 ${
                    dark ? 'text-white/70' : 'text-slate-600'
                  }`}
                >
                  {p.excerpt}
                </p>
                <div
                  className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                    dark ? 'text-white/60' : 'text-slate-400'
                  }`}
                >
                  <Clock className="w-3 h-3" /> {p.readTime} read
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RelatedBlogsRail;
