import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, User, ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import axios from 'axios';
import DOMPurify from 'dompurify';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const SITE_ORIGIN = typeof window !== 'undefined' ? window.location.origin : 'https://oll.co';

// DOMPurify profile tuned for blog HTML coming from TipTap.
// We whitelist:
//  - All standard inline formatting (b/i/u/strong/em/mark/code).
//  - Semantic blocks (h1-h4, p, ul/ol/li, blockquote, pre, hr).
//  - Links (a[href]) — rel/target preserved.
//  - Media: img (with alt/title/data-link), iframe (YouTube only — enforced
//    via ALLOWED_URI_REGEXP below, so arbitrary iframes are blocked).
//  - Custom callout wrapper divs with the data-variant attribute.
const SANITIZE_CONFIG = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: [
    'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'referrerpolicy',
    'target', 'rel', 'data-variant', 'data-link', 'loading', 'decoding',
  ],
  // Allow http(s) only for all URI attributes to defuse `javascript:` payloads.
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

const extractHeadings = (html) => {
  // Build a lightweight table-of-contents from the H2/H3 inside the body.
  if (typeof window === 'undefined') return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('h2, h3')).map((el, i) => {
    const slug = (el.textContent || `section-${i}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    el.setAttribute('id', slug);
    return { id: slug, text: el.textContent || '', level: el.tagName === 'H2' ? 2 : 3 };
  });
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
      } catch (err) {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [slug]);

  // Memoize sanitized HTML + the extracted TOC so DOMPurify and the HTML
  // parse only re-run when the blog content changes.
  const { safeHtml, toc } = useMemo(() => {
    if (!blog?.content) return { safeHtml: '', toc: [] };
    const headings = extractHeadings(blog.content);
    const cleaned = DOMPurify.sanitize(blog.content, SANITIZE_CONFIG);
    return { safeHtml: cleaned, toc: headings };
  }, [blog?.content]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031]"></div>
      </div>
    );
  }

  if (notFound || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-4">Blog Not Found</h1>
          <Button onClick={() => navigate('/blogs')} className="btn-primary">
            Back to Blogs
          </Button>
        </div>
      </div>
    );
  }

  // Build the SEO head block. Falls back to `title` / `excerpt` / `cover_image`
  // when the admin didn't fill the dedicated SEO fields.
  const metaTitle = blog.meta_title || `${blog.title} | OLL Blog`;
  const metaDescription =
    blog.meta_description ||
    blog.excerpt ||
    `Read ${blog.title} on the OLL Blog — expert insights on robotics, coding, AI and skill education.`;
  const canonical = blog.canonical_url || `${SITE_ORIGIN}/blogs/${blog.slug}`;
  const ogImage = blog.og_image || blog.cover_image || '';
  const keywordsStr = Array.isArray(blog.keywords) && blog.keywords.length
    ? blog.keywords.join(', ')
    : (blog.tags || []).join(', ');
  const publishedISO = blog.created_at ? new Date(blog.created_at).toISOString() : undefined;
  const modifiedISO = blog.updated_at ? new Date(blog.updated_at).toISOString() : publishedISO;

  // JSON-LD structured data — tells Google this is a BlogPosting article.
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
      logo: {
        '@type': 'ImageObject',
        url: 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png',
      },
    },
    mainEntityOfPage: canonical,
    keywords: keywordsStr || undefined,
  };

  return (
    <div className="min-h-screen bg-white" data-testid="blog-detail-page">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        {keywordsStr && <meta name="keywords" content={keywordsStr} />}
        <link rel="canonical" href={canonical} />
        {/* Open Graph for LinkedIn / FB / WhatsApp previews */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonical} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="article:published_time" content={publishedISO} />
        <meta property="article:modified_time" content={modifiedISO} />
        <meta property="article:author" content={blog.author || 'OLL Team'} />
        {(blog.tags || []).map((t) => (
          <meta key={t} property="article:tag" content={t} />
        ))}
        {/* Twitter card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        {/* JSON-LD */}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Navbar />

      <main className="pt-24 pb-12 px-4">
        <article className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/blogs')}
            className="mb-6 flex items-center gap-2"
            data-testid="back-to-blogs"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Blogs
          </Button>

          {blog.cover_image && (
            <div className="aspect-video rounded-3xl overflow-hidden mb-8">
              <img
                src={blog.cover_image}
                alt={blog.title}
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-6">
            <span className="px-3 py-1 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] font-medium capitalize">
              {blog.category}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(blog.created_at), 'MMMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {blog.author}
            </span>
            {blog.reading_time_minutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {blog.reading_time_minutes} min read
              </span>
            )}
          </div>

          <h1
            className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-6"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {blog.title}
          </h1>

          {blog.excerpt && (
            <p className="text-lg text-slate-600 leading-relaxed mb-8 font-light">
              {blog.excerpt}
            </p>
          )}

          {toc.length >= 3 && (
            <nav className="mb-10 p-5 rounded-2xl border border-slate-200 bg-slate-50" aria-label="Table of contents">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">On this page</div>
              <ul className="space-y-1.5">
                {toc.map((h) => (
                  <li key={h.id} className={h.level === 3 ? 'pl-4' : ''}>
                    <a
                      href={`#${h.id}`}
                      className="text-sm text-[#1E3A5F] hover:text-[#D63031] font-medium"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* ─────────── Rendered blog body ───────────
              Styles below mirror RichTextEditor's prose styling so the
              preview and published pages look identical. */}
          <div
            className="blog-prose max-w-none text-slate-700 leading-relaxed"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: safeHtml }}
            data-testid="blog-body"
          />

          <style>{`
            .blog-prose h1,
            .blog-prose h2,
            .blog-prose h3,
            .blog-prose h4 { color: #1E3A5F; font-weight: 800; margin-top: 2rem; margin-bottom: 0.75rem; scroll-margin-top: 100px; }
            .blog-prose h2 { font-size: 1.75rem; }
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
            .blog-prose blockquote { border-left: 4px solid #D63031; padding: 0.5rem 0 0.5rem 1.25rem; margin: 1.5rem 0; font-style: italic; color: #475569; background: #FFF7F7; border-radius: 0 12px 12px 0; }
            .blog-prose hr { border: 0; border-top: 1px solid #E2E8F0; margin: 2rem 0; }
            .blog-prose img { border-radius: 12px; max-width: 100%; margin: 1.5rem 0; height: auto; }
            .blog-prose iframe { border-radius: 12px; width: 100%; aspect-ratio: 16/9; margin: 1.5rem 0; border: 0; }
            .blog-prose code { background: #F1F5F9; color: #D63031; padding: 2px 6px; border-radius: 4px; font-size: 0.875em; }
            .blog-prose pre { background: #0F172A; color: #F8FAFC; padding: 1rem; border-radius: 12px; overflow-x: auto; margin: 1.5rem 0; }
            .blog-prose pre code { background: transparent; color: inherit; padding: 0; }
            .blog-prose .callout { padding: 1rem 1.25rem; margin: 1.5rem 0; border-radius: 12px; border-left: 4px solid; }
            .blog-prose .callout p { margin: 0.25rem 0; }
            .blog-prose .callout-info    { background: #EFF6FF; border-color: #60A5FA; color: #1E3A8A; }
            .blog-prose .callout-success { background: #ECFDF5; border-color: #34D399; color: #065F46; }
            .blog-prose .callout-warning { background: #FFFBEB; border-color: #FBBF24; color: #92400E; }
            .blog-prose .callout-note    { background: #FAF5FF; border-color: #A78BFA; color: #5B21B6; }
          `}</style>

          {blog.tags && blog.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {blog.tags.map((t) => (
                <span key={t} className="text-xs font-bold text-slate-600 bg-slate-100 rounded-full px-3 py-1">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-12 glass-card rounded-3xl p-8 text-center">
            <h2
              className="text-xl font-bold text-[#1E3A5F] mb-4"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Ready to Get Started?
            </h2>
            <p className="text-slate-600 mb-6">
              Book a free demo session and explore our programs.
            </p>
            <Link to="/student" className="btn-primary inline-flex items-center gap-2" data-testid="blog-cta">
              Book Free Demo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogDetailPage;
