def edit(p, pairs):
    s = open(p).read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:70], s.count(a))
        s = s.replace(a, b)
    open(p, 'w').write(s)

D = '/app/frontend/src/pages/franchise/'
edit(D + 'FranchiseSections.jsx', [
('<span className="fr-dot" /> OLL Franchise · Ages 3–16</div>', '<span className="fr-dot" /> OLL Franchise</div>'),
('''        <div className="fr-need" data-testid="franchise-hero-need">
          <div className="fr-need-k">All you need is?</div>
          <div className="fr-need-row">
            <span><Building2 size={18} /> 1 furnished room <b className="fr-plus">+</b></span>
            <span><Users2 size={18} /> 1 teacher</span>
          </div>
          <p>Rest everything is done by OLL.</p>
        </div>''', '''        <div className="fr-need" data-testid="franchise-hero-need">
          <p className="fr-need-copy">Launch your own Robotics &amp; AI Learning Center with OLL — a complete franchise opportunity designed to help you build a business in the rapidly evolving future-skills education space.</p>
        </div>'''),
('''    <p className="fr-hero-copy">
      Launch your own Robotics &amp; AI Learning Center with OLL — a complete franchise opportunity designed to help you build a business in the rapidly evolving future-skills education space.
    </p>
''', ''),
("import { Check, ArrowRight, Building2, Users2, Handshake } from 'lucide-react';", "import { Check, ArrowRight, Handshake } from 'lucide-react';"),
('<Strip>Your investment builds a complete learning ecosystem — <em>not merely a collection of equipment.</em></Strip>', '<Strip>Seven pillars. One program. <em>Everything your center needs to deliver.</em></Strip>'),
])
edit('/app/frontend/src/components/school/RbSkillsCarousel.jsx', [
("export const RbSkillsCarousel = ({ eyebrow, title, subtitle, testid = 'rb-skills', bg = '#F8FAFC' }) => (",
 "export const RbSkillsCarousel = ({ eyebrow, title, subtitle, testid = 'rb-skills', bg = '#F8FAFC', eyebrowBelow = false }) => ("),
('''          <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.5rem' }}>{eyebrow}</div>
          <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#fff' }}>{title}</h2>''',
 '''          {!eyebrowBelow && <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.5rem' }}>{eyebrow}</div>}
          <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#fff' }}>{title}</h2>
          {eyebrowBelow && <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.5rem', marginTop: '0.6rem' }}>{eyebrow}</div>}'''),
])
edit(D + 'FranchiseLandingPage.jsx', [
('<RbSkillsCarousel testid="franchise-skills" bg="#071345"', '<RbSkillsCarousel testid="franchise-skills" bg="#071345" eyebrowBelow'),
('''        <button type="button" className="fr-cta sm" onClick={apply} data-testid="franchise-sticky-apply-btn">Apply Now <ArrowRight size={16} /></button>''',
 '''        <BrochureButton className="fr-cta sm" label="Download Brochure" testid="franchise-sticky-brochure-btn" />'''),
])
edit(D + 'franchiseStyles.js', [
(".fr-need p { margin-top: 0.3rem; color: rgba(219,234,254,0.85); font-size: 0.95rem; }",
 ".fr-need p { margin-top: 0.3rem; color: rgba(219,234,254,0.85); font-size: 0.95rem; }\n.fr-need .fr-need-copy { margin: 0; font-size: 1rem; line-height: 1.65; color: rgba(226,232,240,0.92); }"),
("  .fr-hero-chips { left: 0.75rem; bottom: 0.75rem; }", "  .fr-hero-chips { position: static; flex-direction: row; flex-wrap: wrap; margin-top: 0.85rem; }"),
("  .fr-themed section { padding-left: 1rem !important; padding-right: 1rem !important; }",
 """  .fr-themed section { padding-left: 1rem !important; padding-right: 1rem !important; }
  .fr-themed .rb-skill-card { flex: 0 0 150px !important; border-radius: 16px !important; }
  .fr-themed .rb-skills-track { animation-duration: 18s !important; gap: 0.7rem !important; }
  .fr-themed .rb-skill-label { font-size: 0.8rem !important; }"""),
])
print('ok')
