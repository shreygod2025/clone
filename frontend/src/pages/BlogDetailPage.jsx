import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, User, ArrowRight, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import DOMPurify from 'dompurify';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://oll.co';
const OLL_LOGO = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

// DOMPurify profile tuned for TipTap blog HTML. We whitelist the custom
// `blog-cta`/`blog-cta-primary|secondary` classes so admin-inserted buttons
// survive sanitization. iframes stay HTTP(S) only via ALLOWED_URI_REGEXP.
const SANITIZE_CONFIG = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: [
    'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'referrerpolicy',
    'target', 'rel', 'data-variant', 'data-link', 'loading', 'decoding',
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

// Transform raw YouTube anchor tags OR plain `youtube.com/watch` URLs that
// slipped through as text nodes into responsive iframes. TipTap's Youtube
// extension already produces iframes natively, so this only kicks in for
// legacy posts and copy-pasted links.
const ytEmbed = (url) => {
  try {
    const u = new URL(url);
    let id = '';
    if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
    else if (u.hostname.includes('youtube.com')) id = u.searchParams.get('v') || (u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/) || [])[1] || '';
    id = (id || '').split(/[?&]/)[0];
    return id ? `https://www.youtube.com/embed/${id}` : '';
  } catch { return ''; }
};

const promoteYoutubeToIframes = (doc) => {
  const toEmbed = ytEmbed;
  // 1) Convert any <a href="…youtube…"> whose text is JUST the URL into an iframe.
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const txt = (a.textContent || '').trim();
    if (!/youtu/.test(href)) return;
    if (txt && txt !== href) return; // keep inline links with custom text
    const embed = toEmbed(href);
    if (!embed) return;
    const wrap = doc.createElement('div');
    wrap.className = 'blog-yt-embed';
    const ifr = doc.createElement('iframe');
    ifr.src = embed;
    ifr.setAttribute('loading', 'lazy');
    ifr.setAttribute('allowfullscreen', '');
    ifr.setAttribute('frameborder', '0');
    ifr.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    wrap.appendChild(ifr);
    // Replace the <p> wrapping the single-link <a>, or the <a> itself.
    const parent = a.parentElement;
    if (parent && parent.tagName === 'P' && parent.children.length === 1 && !(parent.textContent || '').replace(href, '').trim()) {
      parent.replaceWith(wrap);
    } else {
      a.replaceWith(wrap);
    }
  });
};

const extractHeadings = (html) => {
  if (typeof window === 'undefined') return { headings: [], html };
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  promoteYoutubeToIframes(doc);
  const headings = Array.from(doc.querySelectorAll('h2, h3')).map((el, i) => {
    const slug = (el.textContent || `section-${i}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    el.setAttribute('id', slug);
    return { id: slug, text: el.textContent || '', level: el.tagName === 'H2' ? 2 : 3 };
  });
  return { headings, html: doc.body.innerHTML };
};

const CTAButton = ({ cta, variant, size = 'md' }) => {
  const url = cta?.url || '#';
  const label = cta?.label || '';
  const v = (cta?.variant || variant || 'primary').toLowerCase();
  const isExternal = /^https?:\/\//.test(url);
  const base =
    v === 'secondary'
      ? 'bg-slate-800/70 hover:bg-slate-800 text-white border border-white/20 backdrop-blur'
      : 'bg-[#D63031] hover:bg-[#B52828] text-white shadow-lg shadow-red-900/30';
  const sizing = size === 'sm'
    ? 'px-4 py-2 text-xs rounded-full'
    : 'px-6 py-3.5 text-sm rounded-xl';
  const className = `inline-flex items-center gap-2 font-black uppercase tracking-widest transition ${base} ${sizing}`;
  if (!label) return null;
  if (isExternal) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className} data-testid={`blog-cta-${v}`}>
        {v === 'primary' && <ArrowRight className="w-4 h-4" />} {label}
      </a>
    );
  }
  return (
    <Link to={url} className={className} data-testid={`blog-cta-${v}`}>
      {v === 'primary' && <ArrowRight className="w-4 h-4" />} {label}
    </Link>
  );
};

const BlogDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const response = await axios.get(`${API}/blogs/${slug}`);
        if (!cancelled) setBlog(response.data);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [slug]);

  // Memoize sanitized HTML + the extracted TOC so DOMPurify and the HTML
  // parse only re-run when the blog content changes. We run DOMPurify
  // AFTER the YouTube/heading transform so the resulting iframes still
  // go through the whitelist.
  const { safeHtml, toc } = useMemo(() => {
    if (!blog?.content) return { safeHtml: '', toc: [] };
    const { headings, html } = extractHeadings(blog.content);
    const cleaned = DOMPurify.sanitize(html, SANITIZE_CONFIG);
    return { safeHtml: cleaned, toc: headings };
  }, [blog?.content]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1F44]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (notFound || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-4">Blog Not Found</h1>
          <button onClick={() => navigate('/blogs')} className="btn-primary">
            Back to Blogs
          </button>
        </div>
      </div>
    );
  }

  // SEO head — falls back to title / excerpt / cover_image when the admin
  // left the dedicated fields blank.
  const metaTitle = blog.meta_title || `${blog.title} | OLL Blog`;
  const metaDescription =
    blog.meta_description || blog.excerpt || `Read ${blog.title} on the OLL Blog.`;
  const canonical = blog.canonical_url || `${SITE_ORIGIN}/blogs/${blog.slug}`;
  const ogImage = blog.og_image || blog.cover_image || '';
  const keywordsStr = Array.isArray(blog.keywords) && blog.keywords.length
    ? blog.keywords.join(', ')
    : (blog.tags || []).join(', ');
  const publishedISO = blog.created_at ? new Date(blog.created_at).toISOString() : undefined;
  const modifiedISO = blog.updated_at ? new Date(blog.updated_at).toISOString() : publishedISO;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: metaDescription,
    image: ogImage || undefined,
    datePublished: publishedISO,
    dateModified: modifiedISO,
    author: { '@type': 'Person', name: blog.author || 'OLL Team' },
    publisher: {
      '@type': 'Organization',
      name: 'OLL',
      logo: { '@type': 'ImageObject', url: OLL_LOGO },
    },
    mainEntityOfPage: canonical,
    keywords: keywordsStr || undefined,
  };

  const navbarCtas = (blog.navbar_ctas || []).slice(0, 2);
  const heroCtas = (blog.hero_ctas || []).slice(0, 2);
  const coverVideo = blog.cover_video ? ytEmbed(blog.cover_video) : '';
  const hasCover = !!(coverVideo || blog.cover_image);
  const eyebrow = blog.hero_eyebrow || (blog.category ? blog.category.replace(/_/g, ' ') : '');

  return (
    <div className="min-h-screen bg-white" data-testid="blog-detail-page">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        {keywordsStr && <meta name="keywords" content={keywordsStr} />}
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonical} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="article:published_time" content={publishedISO} />
        <meta property="article:modified_time" content={modifiedISO} />
        <meta property="article:author" content={blog.author || 'OLL Team'} />
        {(blog.tags || []).map((t) => <meta key={t} property="article:tag" content={t} />)}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Sticky pill navbar — zero-height wrapper so it overlays the hero */}
      <div className="sticky top-0 z-50 h-0">
        <nav className="max-w-7xl mx-auto px-4 pt-4" data-testid="blog-sticky-nav">
          <div className="bg-white/95 backdrop-blur rounded-full shadow-xl flex items-center justify-between pl-5 pr-2 py-2">
            <Link to="/" className="flex items-center gap-2" aria-label="OLL home">
              <img src={OLL_LOGO} alt="OLL" className="h-8" />
            </Link>
            <div className="flex items-center gap-2">
              {navbarCtas.length > 0 ? navbarCtas.map((c, i) => (
                <CTAButton key={i} cta={c} size="sm" />
              )) : (
                <Link to="/shop" className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-[#0A1F44] hover:bg-slate-100 rounded-full">
                  Shop Kits
                </Link>
              )}
            </div>
          </div>
        </nav>

      </div>

      {/* ─────────── Blue → red hero (title stack + cover) ─────────── */}
      <header className="relative text-white overflow-hidden" style={{ background: 'linear-gradient(120deg, #0A1F44 0%, #1E3A8A 42%, #7F1D3A 72%, #D63031 100%)' }} data-testid="blog-hero">
        {/* Decorative dot grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className={`relative z-10 mx-auto px-4 pt-28 pb-16 ${hasCover ? 'max-w-7xl grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center' : 'max-w-5xl'}`}>
          <div className="min-w-0">
          {/* Breadcrumbs */}
          <nav className="flex items-center text-xs text-white/60 mb-6" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-3 h-3 mx-2" />
            <Link to="/blogs" className="hover:text-white">Blog</Link>
            <ChevronRight className="w-3 h-3 mx-2" />
            <span className="text-white/40 truncate max-w-[260px]">{blog.title}</span>
          </nav>

          {eyebrow && (
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-widest mb-6 backdrop-blur">
              {eyebrow}
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight max-w-4xl" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {blog.title}
          </h1>

          {blog.excerpt && (
            <p className="text-base sm:text-lg text-white/80 font-light leading-relaxed mt-5 max-w-3xl">
              {blog.excerpt}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/70 mt-7">
            {blog.created_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(blog.created_at), 'd MMMM yyyy')}
              </span>
            )}
            {blog.reading_time_minutes > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {blog.reading_time_minutes} min read
              </span>
            )}
            {blog.author && (
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {blog.author}
              </span>
            )}
          </div>

          {heroCtas.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mt-8">
              {heroCtas.map((c, i) => (
                <CTAButton key={i} cta={c} variant={i === 0 ? 'primary' : 'secondary'} />
              ))}
            </div>
          )}
          </div>

          {hasCover && (
            <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20 bg-black/20" data-testid="blog-hero-cover">
              {coverVideo ? (
                <iframe src={coverVideo} title={blog.title} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen data-testid="blog-hero-video" />
              ) : (
                <img src={blog.cover_image} alt={blog.title} className="w-full h-full object-cover" loading="eager" decoding="async" data-testid="blog-hero-image" />
              )}
            </div>
          )}
        </div>
      </header>

      {/* ─────────── Body + sticky right TOC ─────────── */}
      <main className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid lg:grid-cols-[1fr_280px] gap-12">
          <article>
            <div
              className="blog-prose max-w-none text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
              data-testid="blog-body"
            />

            {blog.tags && blog.tags.length > 0 && (
              <div className="mt-12 flex flex-wrap gap-2">
                {blog.tags.map((t) => (
                  <span key={t} className="text-xs font-bold text-slate-600 bg-slate-100 rounded-full px-3 py-1">#{t}</span>
                ))}
              </div>
            )}
          </article>

          {/* Right-side sticky TOC */}
          {toc.length >= 2 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1" data-testid="blog-toc">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">
                  On this page
                </div>
                <ul className="space-y-2.5 border-l border-slate-200 pl-4">
                  {toc.map((h) => (
                    <li key={h.id} className={h.level === 3 ? 'pl-4' : ''}>
                      <a
                        href={`#${h.id}`}
                        className="text-[13px] text-slate-700 hover:text-[#D63031] font-medium leading-snug block"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Prose styles — mirror the editor + add CTA button styling. */}
      <style>{`
        .blog-prose h1,
        .blog-prose h2,
        .blog-prose h3,
        .blog-prose h4 { color: #1E3A5F; font-weight: 800; margin-top: 2.5rem; margin-bottom: 0.75rem; scroll-margin-top: 100px; }
        .blog-prose h2 { font-size: 1.875rem; }
        .blog-prose h3 { font-size: 1.35rem; }
        .blog-prose h4 { font-size: 1.1rem; }
        .blog-prose p  { margin: 1rem 0; font-size: 1.0625rem; line-height: 1.75; }
        .blog-prose a  { color: #D63031; text-decoration: underline; }
        .blog-prose a:hover { text-decoration: none; }
        .blog-prose strong { color: #0A1F44; }
        .blog-prose mark { background: #FEF3C7; border-radius: 4px; padding: 0 4px; }
        .blog-prose ul { list-style: disc; padding-left: 1.75rem; margin: 1rem 0; }
        .blog-prose ol { list-style: decimal; padding-left: 1.75rem; margin: 1rem 0; }
        .blog-prose li { margin: 0.4rem 0; }
        .blog-prose blockquote { border-left: 4px solid #D63031; padding: 0.75rem 0 0.75rem 1.5rem; margin: 2rem 0; font-style: italic; color: #475569; background: #FFF7F7; border-radius: 0 12px 12px 0; }
        .blog-prose hr { border: 0; border-top: 1px solid #E2E8F0; margin: 2.5rem 0; }
        .blog-prose img { border-radius: 12px; max-width: 100%; margin: 1.75rem 0; height: auto; }
        .blog-prose iframe,
        .blog-prose .blog-yt-embed iframe { border-radius: 12px; width: 100%; aspect-ratio: 16/9; margin: 1.75rem 0; border: 0; }
        .blog-prose code { background: #F1F5F9; color: #D63031; padding: 2px 6px; border-radius: 4px; font-size: 0.875em; }
        .blog-prose pre { background: #0F172A; color: #F8FAFC; padding: 1rem; border-radius: 12px; overflow-x: auto; margin: 1.75rem 0; }
        .blog-prose pre code { background: transparent; color: inherit; padding: 0; }
        .blog-prose .callout { padding: 1rem 1.25rem; margin: 1.75rem 0; border-radius: 12px; border-left: 4px solid; }
        .blog-prose .callout p { margin: 0.25rem 0; }
        .blog-prose .callout-info    { background: #EFF6FF; border-color: #60A5FA; color: #1E3A8A; }
        .blog-prose .callout-success { background: #ECFDF5; border-color: #34D399; color: #065F46; }
        .blog-prose .callout-warning { background: #FFFBEB; border-color: #FBBF24; color: #92400E; }
        .blog-prose .callout-note    { background: #FAF5FF; border-color: #A78BFA; color: #5B21B6; }
        /* CTA buttons inserted via the editor */
        .blog-prose a.blog-cta {
          display: inline-flex; align-items: center; gap: .5rem;
          padding: .9rem 1.6rem; margin: 1.25rem 0;
          border-radius: 999px; text-decoration: none !important;
          font-weight: 900; font-size: .8125rem; letter-spacing: .14em; text-transform: uppercase;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .blog-prose a.blog-cta:hover { transform: translateY(-1px); box-shadow: 0 12px 28px rgba(0,0,0,.12); }
        .blog-prose a.blog-cta-primary   { background: #D63031; color: #fff !important; box-shadow: 0 10px 24px rgba(214,48,49,.3); }
        .blog-prose a.blog-cta-secondary { background: #0A1F44; color: #fff !important; }
      `}</style>

      <Footer />
    </div>
  );
};

export default BlogDetailPage;
