/**
 * SchoolBreadcrumbs — visible breadcrumb navigation used across the four
 * school landing pages (CBSE CT & AI, ICSE/CBSE Future Skills, Beginner
 * Robotics, ICSE 9/10 Robotics).
 *
 * Renders BOTH the visible trail (home > schools > current) AND emits its
 * own JSON-LD BreadcrumbList schema so search engines see the same graph
 * users see in the UI. Kept intentionally light-weight so it slots under
 * any hero without shifting layout.
 */
import { ChevronRight, Home } from 'lucide-react';
import { useEffect } from 'react';

const upsertJsonLd = (id, obj) => {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el); }
  el.textContent = JSON.stringify(obj);
};

export default function SchoolBreadcrumbs({ items = [], theme = 'light', testid = 'school-breadcrumbs', schemaId }) {
  useEffect(() => {
    if (!schemaId || !items.length) return;
    upsertJsonLd(schemaId, {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.label,
        item: it.href ? `${window.location.origin}${it.href}` : undefined,
      })),
    });
  }, [items, schemaId]);

  const isDark = theme === 'dark';
  const textColor = isDark ? 'rgba(255,255,255,0.85)' : '#475569';
  const activeColor = isDark ? '#fff' : '#0A1F44';
  const sepColor = isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8';

  return (
    <nav aria-label="Breadcrumb" data-testid={testid}
      style={{
        maxWidth: 1180, margin: '0 auto', padding: '14px 20px 0',
        fontFamily: "'Proxima Nova', 'Montserrat', system-ui, sans-serif",
      }}>
      <ol style={{
        listStyle: 'none', margin: 0, padding: 0,
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
        fontSize: '0.78rem', color: textColor,
      }}>
        {items.map((it, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${it.label}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {i === 0 && <Home size={13} style={{ opacity: 0.75 }} />}
              {isLast || !it.href ? (
                <span aria-current={isLast ? 'page' : undefined}
                  style={{ color: activeColor, fontWeight: 700, letterSpacing: '0.01em' }}>
                  {it.label}
                </span>
              ) : (
                <a href={it.href}
                  style={{ color: textColor, textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = isDark ? '#FCA5A5' : '#DC2626')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = textColor)}
                  data-testid={`${testid}-link-${i}`}>
                  {it.label}
                </a>
              )}
              {!isLast && <ChevronRight size={12} style={{ color: sepColor }} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
