/**
 * SuccessStoryDetailPage — SEO-friendly blog/article page for a single
 * Success Story. Route: `/success-stories/:slug`.
 *
 * Renders:
 *   - OLL <Navbar />
 *   - Article hero with student photo, name, school and level badge
 *   - Article-style body (rich HTML from `story` field) with proper
 *     typography, indenting and sensible defaults for h2 / h3 / lists
 *   - Optional video embeds (`video_url` + `video_urls[]`), YouTube URLs
 *     render as full <iframe> players; other links render as clickable cards
 *   - Attachments + evidence links surfaced as tap-friendly cards
 *   - SEO meta (title, description, canonical), Open Graph, Twitter card,
 *     JSON-LD Article schema and a visible breadcrumb trail
 *   - <Footer />
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, School, Award, ExternalLink, Play, Share2 } from 'lucide-react';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SchoolBreadcrumbs from '../components/school/SchoolBreadcrumbs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LEVEL_META = {
  1: { color: '#3B82F6', bg: '#EEF4FF', label: 'Creator' },
  2: { color: '#10B981', bg: '#ECFDF5', label: 'Published' },
  3: { color: '#F59E0B', bg: '#FFFBEB', label: 'Recognition' },
  4: { color: '#8B5CF6', bg: '#F5F3FF', label: 'Impact' },
  5: { color: '#DC2626', bg: '#FEF2F2', label: 'Transformation' },
};

/** Extract a YouTube video ID from any common URL shape. Returns `null` if the
 *  URL isn't recognizably YouTube — the caller then treats it as an external link. */
const extractYouTubeId = (url) => {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1) || null;
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null;
      return u.searchParams.get('v');
    }
  } catch { /* not a valid URL */ }
  return null;
};

const VideoEmbed = ({ url, testid }) => {
  const ytId = extractYouTubeId(url);
  if (ytId) {
    return (
      <div className="my-8 rounded-2xl overflow-hidden shadow-xl bg-black" style={{ aspectRatio: '16 / 9' }} data-testid={testid}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`}
          title="Success story video"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    );
  }
  // Any other URL — render as a "watch external" call-to-action card.
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="my-6 flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition"
      data-testid={testid}
    >
      <div className="w-10 h-10 rounded-lg bg-[#DC2626] text-white flex items-center justify-center flex-shrink-0">
        <Play className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[#0A1F44] text-sm">Watch the video</div>
        <div className="text-xs text-slate-500 truncate">{url}</div>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
    </a>
  );
};

const upsertMeta = (attr, val, content) => {
  let el = document.head.querySelector(`meta[${attr}="${val}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, val); document.head.appendChild(el); }
  el.setAttribute('content', content || '');
};
const upsertLink = (rel, href) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
  el.setAttribute('href', href);
};
const upsertJsonLd = (id, obj) => {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el); }
  el.textContent = JSON.stringify(obj);
};

export default function SuccessStoryDetailPage() {
  const { slug } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setNotFound(false);
      try {
        const { data } = await axios.get(`${API}/public/success-stories/by-slug/${encodeURIComponent(slug)}`);
        if (!cancelled) setStory(data);
      } catch (err) {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [slug]);

  // Populate SEO tags whenever we have the story loaded.
  useEffect(() => {
    if (!story) return;
    const canonical = `${window.location.origin}/success-stories/${story.slug || story.id}`;
    const name = story.student_name || 'Success Story';
    const school = story.school_name ? ` — ${story.school_name}` : '';
    const title = `${name}${school} · Success Story | OLL`;
    const raw = story.excerpt || (story.story || '').replace(/<[^>]*>/g, '').slice(0, 155).trim();
    const desc = raw || `Read how ${name} moved from creator to ${story.level_name || 'impact'} on OLL.`;

    document.title = title;
    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'keywords', `${name}, OLL success story, ${story.level_name || ''}, ${(story.tags || []).join(', ')}`);
    upsertLink('canonical', canonical);
    // Open Graph / Twitter
    upsertMeta('property', 'og:type', 'article');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:image', story.image_url);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', story.image_url);
    // JSON-LD Article schema
    upsertJsonLd('ld-success-story', {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description: desc,
      image: story.image_url ? [story.image_url] : undefined,
      author: { '@type': 'Person', name: story.student_name },
      publisher: { '@type': 'Organization', name: 'OLL', logo: { '@type': 'ImageObject', url: `${window.location.origin}/logo.png` } },
      datePublished: story.created_at,
      dateModified: story.updated_at || story.created_at,
      mainEntityOfPage: canonical,
      keywords: (story.tags || []).join(', '),
    });
  }, [story]);

  const level = story ? LEVEL_META[story.level] : null;
  const publishedDate = story?.created_at ? new Date(story.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const share = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 pt-40 pb-20 animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-3/4" />
          <div className="h-6 bg-slate-100 rounded w-1/2" />
          <div className="h-96 bg-slate-100 rounded-3xl mt-8" />
        </div>
      </div>
    );
  }

  if (notFound || !story) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-40 pb-20 text-center">
          <h1 className="text-3xl font-bold text-[#0A1F44]">Story not found</h1>
          <p className="text-slate-600 mt-3">This success story may have been unpublished or the link is broken.</p>
          <Link to="/success-stories" className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-[#DC2626] text-white font-semibold hover:bg-[#B91C1C]" data-testid="story-back-to-list">
            <ArrowLeft className="w-4 h-4" /> Back to Success Stories
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const allVideos = [story.video_url, ...(story.video_urls || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-white" data-testid="success-story-detail">
      <Navbar />

      {/* Breadcrumbs (visible + JSON-LD BreadcrumbList) */}
      <div style={{ paddingTop: 'clamp(4.5rem, 9vw, 7rem)' }}>
        <SchoolBreadcrumbs
          testid="story-breadcrumbs"
          schemaId="ld-breadcrumbs-success-story"
          items={[
            { label: 'Home', href: '/' },
            { label: 'Success Stories', href: '/success-stories' },
            { label: story.student_name },
          ]}
        />
      </div>

      {/* Article header */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-16" data-testid="story-article">
        <header className="mb-8">
          {level && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest mb-4"
              style={{ background: level.bg, color: level.color, border: `1px solid ${level.color}44` }}
              data-testid="story-level-badge"
            >
              <Award className="w-3 h-3" /> Level {story.level} · {level.label}
            </span>
          )}
          <h1
            className="font-black text-[#0A1F44] leading-tight tracking-tight"
            style={{ fontSize: 'clamp(1.85rem, 4.6vw, 3rem)', fontFamily: "'Proxima Nova', 'Montserrat', system-ui, sans-serif" }}
            data-testid="story-title"
          >
            {story.student_name}
            {story.school_name && <span className="block text-lg sm:text-xl font-medium text-slate-500 mt-2">{story.school_name}</span>}
          </h1>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-sm text-slate-500">
            {publishedDate && (
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {publishedDate}</span>
            )}
            {story.school_name && (
              <span className="inline-flex items-center gap-1.5"><School className="w-3.5 h-3.5" /> {story.school_name}</span>
            )}
            <button
              onClick={share}
              className="inline-flex items-center gap-1.5 text-[#DC2626] hover:text-[#B91C1C] font-semibold"
              data-testid="story-share-btn"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </header>

        {/* Hero image */}
        {story.image_url && (
          <img
            src={story.image_url}
            alt={`${story.student_name} — Success Story`}
            loading="eager"
            className="w-full rounded-3xl shadow-2xl object-cover mb-10"
            style={{ aspectRatio: '16 / 10', objectPosition: 'center' }}
            data-testid="story-hero-image"
          />
        )}

        {/* Body — rich HTML from CMS. Renders in article-prose typography. */}
        {story.story && (
          <div
            className="article-prose"
            dangerouslySetInnerHTML={{ __html: story.story }}
            data-testid="story-body"
          />
        )}

        {/* Video embeds — YouTube renders as iframe; anything else = external link card */}
        {allVideos.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-black text-[#0A1F44] mb-3">Watch the journey</h2>
            {allVideos.map((v, i) => (
              <VideoEmbed key={`${v}-${i}`} url={v} testid={`story-video-${i}`} />
            ))}
          </section>
        )}

        {/* Evidence links + attachments */}
        {(story.evidence_links?.length > 0 || story.attachments?.length > 0) && (
          <section className="mt-10">
            <h2 className="text-xl font-black text-[#0A1F44] mb-3">Proof &amp; artefacts</h2>
            <div className="space-y-2">
              {(story.evidence_links || []).map((link, i) => (
                <a
                  key={`ev-${i}`} href={link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-sm"
                  data-testid={`story-evidence-${i}`}
                >
                  <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-[#0A1F44] font-medium truncate">{link}</span>
                </a>
              ))}
              {(story.attachments || []).map((a, i) => (
                <a
                  key={`at-${i}`} href={a.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-sm"
                  data-testid={`story-attachment-${i}`}
                >
                  <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-[#0A1F44] font-medium truncate">{a.name || a.url}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Tags */}
        {story.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-slate-100" data-testid="story-tags">
            {story.tags.map((t) => (
              <span key={t} className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest bg-slate-100 text-slate-600 rounded-full">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Back to list */}
        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            to="/success-stories"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0A1F44] text-white font-semibold hover:bg-[#0F2A5E] transition"
            data-testid="story-back-link"
          >
            <ArrowLeft className="w-4 h-4" /> All Success Stories
          </Link>
        </div>
      </article>

      {/* Blog-style typography — scoped so it doesn't leak into other pages. */}
      <style>{`
        .article-prose {
          font-family: 'Proxima Nova', 'Montserrat', system-ui, sans-serif;
          color: #0F172A;
          font-size: 1.075rem;
          line-height: 1.75;
        }
        .article-prose p { margin: 0 0 1.15rem; text-indent: 1.25rem; }
        .article-prose p:first-of-type { text-indent: 0; }
        .article-prose p:first-of-type::first-letter {
          font-family: 'Proxima Nova', 'Montserrat', system-ui, sans-serif;
          font-size: 3.4rem; line-height: 0.9; font-weight: 900; color: #DC2626;
          float: left; margin: 0.3rem 0.55rem 0 0; padding: 0.15rem 0.25rem 0 0;
        }
        .article-prose h2 {
          font-size: 1.7rem; font-weight: 900; color: #0A1F44;
          margin: 2.2rem 0 0.9rem; letter-spacing: -0.005em; line-height: 1.15;
        }
        .article-prose h3 {
          font-size: 1.3rem; font-weight: 800; color: #0A1F44;
          margin: 1.8rem 0 0.7rem; line-height: 1.2;
        }
        .article-prose h4 { font-size: 1.1rem; font-weight: 800; color: #0A1F44; margin: 1.4rem 0 0.5rem; }
        .article-prose a {
          color: #DC2626; text-decoration: underline; text-underline-offset: 3px;
          text-decoration-thickness: 1.5px;
        }
        .article-prose a:hover { color: #B91C1C; }
        .article-prose strong, .article-prose b { font-weight: 800; color: #0A1F44; }
        .article-prose em, .article-prose i { font-style: italic; }
        .article-prose ul, .article-prose ol { margin: 0 0 1.15rem 0.25rem; padding-left: 1.35rem; }
        .article-prose ul { list-style: disc; } .article-prose ol { list-style: decimal; }
        .article-prose li { margin: 0.4rem 0; padding-left: 0.2rem; }
        .article-prose li::marker { color: #DC2626; font-weight: 700; }
        .article-prose blockquote {
          margin: 1.6rem 0; padding: 1rem 1.3rem;
          border-left: 4px solid #DC2626; background: #FEF2F2; border-radius: 0 10px 10px 0;
          font-style: italic; color: #7F1D1D;
        }
        .article-prose img {
          max-width: 100%; height: auto; border-radius: 14px;
          margin: 1.5rem auto; display: block;
          box-shadow: 0 12px 28px rgba(10,31,68,0.08);
        }
        .article-prose iframe {
          width: 100%; aspect-ratio: 16 / 9; height: auto;
          border: 0; border-radius: 14px; margin: 1.5rem 0;
        }
        .article-prose hr {
          border: none; height: 1px;
          background: linear-gradient(90deg, transparent, #E2E8F0, transparent);
          margin: 2.4rem 0;
        }
        .article-prose code {
          background: #F1F5F9; color: #DC2626; padding: 2px 6px; border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Courier New', monospace;
          font-size: 0.94em;
        }
        .article-prose pre {
          background: #0F172A; color: #E2E8F0; padding: 1rem 1.2rem;
          border-radius: 12px; overflow-x: auto; margin: 1.5rem 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, 'Courier New', monospace;
          font-size: 0.9rem; line-height: 1.55;
        }
        @media (max-width: 640px) {
          .article-prose { font-size: 1.02rem; line-height: 1.7; }
          .article-prose h2 { font-size: 1.45rem; }
          .article-prose h3 { font-size: 1.15rem; }
          .article-prose p { text-indent: 0.9rem; }
        }
      `}</style>

      <Footer />
    </div>
  );
}
