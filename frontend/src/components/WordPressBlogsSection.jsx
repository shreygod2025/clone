/**
 * WordPress Blogs Section — Homepage strip that lists the latest 6 posts
 * fetched from the OLL WordPress instance via the public REST API.
 *
 * SEO strategy (Hybrid): posts stay authored + rendered by WordPress at
 * `https://oll.co/blogs/[slug]/` (full server-side HTML, meta tags, Yoast
 * SEO, sitemap etc.). This React section only surfaces the latest 6 posts
 * as teaser cards on the homepage and links OUT to the WordPress URL, so
 * Google indexes the WP pages directly (best SEO) while visitors see a
 * unified brand experience on the React homepage.
 *
 * Endpoints:
 *   GET https://oll.co/blogs/wp-json/wp/v2/posts?_embed&per_page=6
 *
 * Fails silently: if the WordPress endpoint is unreachable, the section
 * simply doesn't render — the homepage keeps working.
 */
import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Calendar } from 'lucide-react';

const WP_BASE = 'https://oll.co/blogs';
const WP_API  = `${WP_BASE}/wp-json/wp/v2/posts?_embed&per_page=6&orderby=date&order=desc`;

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function pickFeaturedImage(post) {
  const emb = post?._embedded?.['wp:featuredmedia']?.[0];
  if (!emb) return null;
  const sizes = emb?.media_details?.sizes;
  return (
    sizes?.medium_large?.source_url ||
    sizes?.large?.source_url ||
    sizes?.medium?.source_url ||
    emb?.source_url ||
    null
  );
}

function pickCategory(post) {
  const terms = post?._embedded?.['wp:term'];
  if (!Array.isArray(terms)) return null;
  for (const group of terms) {
    if (Array.isArray(group) && group[0]?.taxonomy === 'category') {
      return group[0]?.name || null;
    }
  }
  return null;
}

export default function WordPressBlogsSection({ compact = false, testid = 'homepage-blogs' }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(WP_API, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`WP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setPosts(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) { setError(true); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Silent hide if the WP feed is down or empty — homepage keeps flowing.
  if (error || (!loading && posts.length === 0)) return null;

  return (
    <section
      data-testid={testid}
      style={{
        position: 'relative', overflow: 'hidden',
        padding: compact ? '3rem 1.25rem' : '5rem 1.25rem',
        background: '#F8FAFC',
      }}
    >
      <style>{`
        .home-blog-eyebrow { font-family:'Montserrat',sans-serif; font-size:0.72rem; font-weight:900; letter-spacing:0.28em; text-transform:uppercase; color:#DC2626; }
        .home-blog-h2 { font-family:'Proxima Nova','Montserrat',sans-serif; font-weight:900; font-size:clamp(1.75rem,4.5vw,3.25rem); line-height:1.04; letter-spacing:-0.02em; color:#0A1F44; margin-top:6px; }
        .home-blog-sub { font-family:'Proxima Nova','Montserrat',sans-serif; font-weight:300; font-size:1rem; line-height:1.6; color:#475569; max-width:640px; margin:12px auto 0; }
        .home-blog-grid { display:grid; grid-template-columns:1fr; gap:1.1rem; margin-top:2.5rem; }
        @media (min-width: 720px)  { .home-blog-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:1.25rem; } }
        @media (min-width: 1024px) { .home-blog-grid { grid-template-columns:repeat(3,minmax(0,1fr)); gap:1.5rem; } }
        .home-blog-card { position:relative; display:flex; flex-direction:column; background:#fff; border:1px solid #E2E8F0; border-radius:1.25rem; overflow:hidden; text-decoration:none; color:inherit; box-shadow:0 8px 24px rgba(15,30,80,0.06); transition:transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
        .home-blog-card:hover { transform:translateY(-4px); box-shadow:0 22px 46px rgba(15,30,80,0.14); border-color:#DC2626; }
        .home-blog-thumb { position:relative; aspect-ratio:16/9; background:linear-gradient(135deg,#0A1F44,#1E3A5F); overflow:hidden; }
        .home-blog-thumb img { width:100%; height:100%; object-fit:cover; transition:transform 0.4s ease; }
        .home-blog-card:hover .home-blog-thumb img { transform:scale(1.05); }
        .home-blog-thumb-fallback { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.35); }
        .home-blog-cat { position:absolute; top:12px; left:12px; padding:0.35rem 0.7rem; background:rgba(220,38,38,0.95); color:#fff; border-radius:999px; font-family:'Montserrat',sans-serif; font-size:0.65rem; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; }
        .home-blog-body { padding:1.25rem 1.25rem 1.35rem; display:flex; flex-direction:column; gap:0.6rem; flex:1; }
        .home-blog-date { display:inline-flex; align-items:center; gap:0.35rem; font-family:'Montserrat',sans-serif; font-size:0.7rem; font-weight:700; letter-spacing:0.08em; color:#94A3B8; text-transform:uppercase; }
        .home-blog-title { font-family:'Proxima Nova','Montserrat',sans-serif; font-weight:800; font-size:1.1rem; line-height:1.28; color:#0A1F44; letter-spacing:-0.01em; }
        .home-blog-excerpt { font-family:'Proxima Nova','Montserrat',sans-serif; font-weight:300; font-size:0.9rem; line-height:1.55; color:#475569; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
        .home-blog-read { margin-top:auto; padding-top:6px; display:inline-flex; align-items:center; gap:0.35rem; font-family:'Montserrat',sans-serif; font-size:0.72rem; font-weight:900; letter-spacing:0.14em; text-transform:uppercase; color:#DC2626; }
        .home-blog-cta-row { text-align:center; margin-top:2.25rem; }
        .home-blog-cta { display:inline-flex; align-items:center; gap:0.5rem; padding:0.85rem 1.5rem; border-radius:999px; background:#0A1F44; color:#fff; font-family:'Montserrat',sans-serif; font-size:0.78rem; font-weight:900; letter-spacing:0.14em; text-transform:uppercase; text-decoration:none; transition:transform 0.2s ease, background 0.2s ease; }
        .home-blog-cta:hover { transform:translateY(-2px); background:#DC2626; }
        .home-blog-skel { border-radius:1.25rem; height:340px; background:linear-gradient(90deg,#f1f5f9 0%,#e2e8f0 50%,#f1f5f9 100%); background-size:200% 100%; animation: home-blog-shimmer 1.4s ease-in-out infinite; }
        @keyframes home-blog-shimmer { 0%{background-position:0% 0}100%{background-position:-200% 0} }
      `}</style>

      <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="home-blog-eyebrow">from the OLL journal</div>
          <h2 className="home-blog-h2">Ideas, playbooks &amp; stories<br />for parents, students &amp; schools.</h2>
          <p className="home-blog-sub">Roundups, product deep-dives and success stories from India's fastest-growing school robotics network — freshly published every week.</p>
        </div>

        <div className="home-blog-grid">
          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={`sk-${i}`} className="home-blog-skel" data-testid="home-blog-skel" />
          ))}
          {!loading && posts.map((p) => {
            const img = pickFeaturedImage(p);
            const cat = pickCategory(p);
            const title = stripHtml(p?.title?.rendered);
            const excerpt = stripHtml(p?.excerpt?.rendered);
            const url = p?.link;
            return (
              <a
                key={p.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="home-blog-card"
                data-testid={`home-blog-card-${p.id}`}
                aria-label={`Read: ${title}`}
              >
                <div className="home-blog-thumb">
                  {img ? (
                    <img src={img} alt={title} loading="lazy" />
                  ) : (
                    <div className="home-blog-thumb-fallback"><BookOpen size={56} /></div>
                  )}
                  {cat && <span className="home-blog-cat">{cat}</span>}
                </div>
                <div className="home-blog-body">
                  <div className="home-blog-date"><Calendar size={12} /> {formatDate(p.date)}</div>
                  <div className="home-blog-title">{title}</div>
                  {excerpt && <div className="home-blog-excerpt">{excerpt}</div>}
                  <span className="home-blog-read">Read the story <ArrowRight size={12} /></span>
                </div>
              </a>
            );
          })}
        </div>

        <div className="home-blog-cta-row">
          <a
            href={`${WP_BASE}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="home-blog-cta"
            data-testid="home-blog-cta-all"
          >
            Explore all blogs <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
