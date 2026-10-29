def edit(p, pairs):
    s = open(p).read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:70], s.count(a))
        s = s.replace(a, b)
    open(p, 'w').write(s)

C = '/app/frontend/src/pages/franchise/franchiseContent.js'
s = open(C).read()
i = s.index('export const HERO_PHOTOS = [')
j = s.index('];', i) + 2
s = s[:i] + '''const F = '/franchise';
export const IMG = {
  buildKid: `${F}/build-kid.webp`,
  heroKid: `${F}/hero-kid.webp`,
  thanksKid: `${F}/thanks-kid.webp`,
  ecoKids: `${F}/eco-kids.webp`,
  teacher: `${F}/teacher.webp`,
  marketing: `${F}/marketing.webp`,
  school: `${F}/school.webp`,
};

export const SKILL_CARDS = [
  { t: 'Robotics', i: Bot, img: `${F}/skill-0.webp` },
  { t: 'Coding', i: Code2, img: `${F}/skill-1.webp` },
  { t: 'AI', i: BrainCircuit, img: `${F}/skill-2.webp` },
  { t: '3D Design', i: Box, img: `${F}/skill-3.webp` },
  { t: '3D Printing', i: Printer, img: `${F}/skill-4.webp` },
];''' + s[j:]
s = s.replace("  Ruler, MapPin, Plug, ShieldCheck, Paintbrush, Package, Sparkles, Megaphone, Layers,\n} from 'lucide-react';",
              "  Ruler, MapPin, Plug, ShieldCheck, Paintbrush, Package, Sparkles, Megaphone, Layers,\n  Bot, Code2, BrainCircuit, Box, Printer,\n} from 'lucide-react';")
open(C, 'w').write(s)

edit('/app/frontend/src/components/school/RbSkillsCarousel.jsx', [
("export const RbSkillsCarousel = ({ eyebrow, title, subtitle, testid = 'rb-skills' }) => (", "export const RbSkillsCarousel = ({ eyebrow, title, subtitle, testid = 'rb-skills', bg = '#F8FAFC' }) => ("),
("padding: '4rem 1.5rem', background: '#F8FAFC', overflow: 'hidden' }}", "padding: '4rem 1.5rem', background: bg, overflow: 'hidden' }}"),
])

P = '/app/frontend/src/pages/franchise/FranchiseLandingPage.jsx'
edit(P, [
("import { OLL_LOGO_COLOR } from './franchiseContent';", "import { OLL_LOGO_COLOR, IMG } from './franchiseContent';"),
("  FrHero, FrWhy, FrDifferent,", "  Head, FrHero, FrSkills, FrWhy, FrDifferent,"),
('''      <div>
        <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.7rem' }}>build future innovators</div>
        <h2 className="rb-h2" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', lineHeight: 1.08, color: '#fff' }}>
          Build More Than a Business. <span style={{ color: '#FCA5A5' }}>Build Future Innovators.</span>
        </h2>
        <p className="fr-sub" style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'left', margin: '1rem 0 0' }}>
          Imagine children in your city designing robots, building drones, experimenting with AI and turning their ideas into real-world projects. With OLL, you can help make that possible while building your own education venture.
        </p>
        <p className="fr-quote" style={{ textAlign: 'left', margin: '1.5rem 0 0' }}>The future needs creators, problem-solvers and innovators. Help your city create them.</p>
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700 }}>Ready to Start Your OLL Robotics &amp; AI Center?</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>Take the first step toward bringing future-skills education to your community. Fill in your details and our team will connect with you.</p>
        </div>
      </div>''', '''      <div>
        <Head a="Build More Than a Business." b="Build Future Innovators."
          sub="Imagine children in your city designing robots, building drones, experimenting with AI and turning their ideas into real-world projects. With OLL, you can help make that possible while building your own education venture." />
        <p style={{ fontWeight: 800, fontSize: '1.15rem', marginTop: '-1rem' }}>Ready to Start Your OLL Robotics &amp; AI Center?</p>
        <p style={{ color: 'rgba(219,234,254,0.75)', marginTop: 6, lineHeight: 1.6 }}>The future needs creators, problem-solvers and innovators. Help your city create them — fill in your details and our team will connect with you.</p>
        <div className="fr-photo-frame fr-final-kid"><img src={IMG.thanksKid} alt="Future innovator" loading="lazy" /></div>
      </div>'''),
('  <section className="fr-sec fr-dark" ref={formRef} id="apply" data-testid="franchise-apply">\n    <div className="rb-orb rb-orb-red" style={{ width: 480, height: 480, top: -180, left: -140 }} />',
 '  <section className="fr-sec alt" ref={formRef} id="apply" data-testid="franchise-apply">'),
('      <RbSkillsCarousel testid="franchise-skills"', '      <FrSkills />\n      <RbSkillsCarousel testid="franchise-skills" bg="#071345"'),
])
print('ok')
