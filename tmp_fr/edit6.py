def edit(p, pairs):
    s = open(p).read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:70], s.count(a))
        s = s.replace(a, b)
    open(p, 'w').write(s)

D = '/app/frontend/src/pages/franchise/'
edit(D + 'FranchiseSections.jsx', [
("import { Check, ArrowRight, Handshake } from 'lucide-react';", "import { useState } from 'react';\nimport { Check, ArrowRight, Handshake, ChevronDown } from 'lucide-react';"),
('''export const Head = ({ a, b, sub, center }) => (
  <div className={`fr-head ${center ? 'center' : ''}`}>
    <span className="fr-tickbar" />
    <h2 className="fr-h2">{a} <em>{b}</em></h2>
    {sub && <p className="fr-sub">{sub}</p>}
  </div>
);''', '''export const Head = ({ a, b, sub, center }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`fr-head ${center ? 'center' : ''}`}>
      <span className="fr-tickbar" />
      <h2 className="fr-h2">{a} <em>{b}</em></h2>
      {sub && <p className={`fr-sub ${open ? 'open' : ''}`}>{sub}</p>}
      {sub && (
        <button type="button" className="fr-more" onClick={() => setOpen((v) => !v)} data-testid="franchise-read-more">
          {open ? 'Show less' : 'Read more'} <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>
      )}
    </div>
  );
};'''),
('''        <div className="fr-need" data-testid="franchise-hero-need">
          <p className="fr-need-copy">Launch your own Robotics &amp; AI Learning Center with OLL — a complete franchise opportunity designed to help you build a business in the rapidly evolving future-skills education space.</p>
        </div>
        <div className="fr-hero-actions">''', '''      </div>
      <div className="fr-hero-actions">'''),
('''          <div className="fr-invest" data-testid="franchise-investment"><span>Total Investment</span><b>₹2.5 Lakhs</b></div>
        </div>
      </div>''', '''          <div className="fr-invest" data-testid="franchise-investment"><span>Total Investment</span><b>₹2.5 Lakhs</b></div>
      </div>'''),
])
edit(D + 'FranchiseLandingPage.jsx', [
('subtitle="Robotics, coding, AI, drones, 3D design and more — give children in your community the chance to explore the technologies shaping tomorrow." />',
 'subtitle="Give children in your community the chance to explore the technologies shaping tomorrow." />'),
])
edit(D + 'franchiseStyles.js', [
(".fr-hero-grid { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 3rem; align-items: center; }",
 ".fr-hero-grid { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.05fr 0.95fr; grid-template-areas: 'text art' 'cta art'; column-gap: 3rem; row-gap: 0; align-items: center; }\n.fr-hero-grid > div:first-child { grid-area: text; align-self: end; }\n.fr-hero-grid > .fr-hero-actions { grid-area: cta; align-self: start; }\n.fr-hero-grid > .fr-hero-art { grid-area: art; }\n.fr-cta, .fr-ghost { white-space: nowrap; }\n.fr-more { display: none; }"),
("  .fr-hero-grid { grid-template-columns: 1fr; gap: 2.5rem; }", "  .fr-hero-grid { grid-template-columns: 1fr; grid-template-areas: 'text' 'art' 'cta'; row-gap: 1.75rem; }\n  .fr-hero-actions { margin-top: 0; }"),
("  .fr-hero-actions .fr-cta, .fr-hero-actions .fr-ghost { width: 100%; justify-content: center; }",
 "  .fr-hero-actions .fr-cta, .fr-hero-actions .fr-ghost { width: 100%; justify-content: center; font-size: 0.8rem; padding: 0.95rem 1rem; }\n  .fr-sub { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }\n  .fr-sub.open { display: block; }\n  .fr-more { display: inline-flex; align-items: center; gap: 4px; margin-top: 0.4rem; background: none; border: 0; padding: 0; color: #F87171; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer; font-family: inherit; }\n  .fr-card-s, .fr-easy-lbl small, .fr-role-p, .fr-note { display: none; }"),
])
print('ok')
