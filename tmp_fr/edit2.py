def edit(p, pairs):
    s = open(p).read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:70], s.count(a))
        s = s.replace(a, b)
    open(p, 'w').write(s)

D = '/app/frontend/src/pages/franchise/'
edit(D + 'FranchiseLandingPage.jsx', [
('      <FrSkills />\n', ''),
('  Head, FrHero, FrSkills, FrWhy, FrDifferent, FrParents,', '  Head, FrHero, FrWhy, FrDifferent, FrEasySetup,'),
('      <FrParents />\n', '      <FrEasySetup />\n'),
])
S = D + 'FranchiseSections.jsx'
s = open(S).read()
# remove FrSkills
i = s.index('export const FrSkills = () => (')
j = s.index('export const FrWhy = () => (')
s = s[:i] + s[j:]
# replace FrParents with FrEasySetup
i = s.index('export const FrParents = () => (')
j = s.index('export const FrIncluded = () => {')
s = s[:i] + '''export const FrEasySetup = () => (
  <section className="fr-sec" data-testid="franchise-easy-setup">
    <Pixels />
    <div className="fr-wrap">
      <Head a="Easy" b="Implementation." sub="Designed to work with your setup. Start your future-skills center without creating an entirely new academic infrastructure." />
      <div className="fr-easy">
        <div className="fr-easy-have" data-testid="franchise-you-have">
          <div className="fr-easy-cap"><b>You Already Have</b><span>Just bring your space and your people.</span></div>
          <div className="fr-easy-tiles">
            {YOU_HAVE.map((t, i) => (
              <div key={t.t} className={`fr-easy-tile ${i === 2 ? 'wide' : ''}`}>
                <div className="fr-easy-img"><img src={t.img} alt={t.t} loading="lazy" /></div>
                <div className="fr-easy-lbl"><span className={`fr-easy-ic ${i % 2 ? 'red' : ''}`}><t.i size={20} /></span>{t.t}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="fr-plus-big">+</div>
        <div className="fr-easy-give" data-testid="franchise-we-provide">
          <div className="fr-easy-cap red"><b>We Provide</b><span>Everything you need to run the program.</span></div>
          <div className="fr-easy-icons">
            {WE_PROVIDE.map((t, i) => (
              <div key={t.t}><span className={`fr-easy-ic big ${i % 2 ? 'red' : ''}`}><t.i size={30} /></span><b>{t.t}</b></div>
            ))}
          </div>
        </div>
      </div>
      <Strip icon={Handshake}>We provide the equipment, curriculum, training, LMS and <em>academic framework.</em></Strip>
    </div>
  </section>
);

export const FrIncluded = () => (
  <section className="fr-sec alt" data-testid="franchise-included">
    <Pixels />
    <div className="fr-wrap">
      <Head a="What Your" b="Investment Builds." sub="Not a kit purchase. A complete future-skills center — here's what's included in your franchise." />
      <div className="fr-inc-list">
        {INCLUDED.map((cur, i) => (
          <div key={cur.key} className={`fr-tabpanel ${i % 2 ? 'red' : ''}`} data-testid={`franchise-included-${cur.key}`}>
            <span className="fr-num">{String(i + 1).padStart(2, '0')}</span>
            <div className="fr-icon big"><cur.i size={30} /></div>
            <div style={{ flex: 1 }}>
              <h3 className="fr-panel-t">{cur.t}</h3>
              <p className="fr-panel-s">{cur.s}</p>
              <div className="fr-items">{cur.items.map((x) => <span key={x}><Check size={14} strokeWidth={3} /> {x}</span>)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

''' + s[s.index('export const FrServices = () => ('):]
s = s.replace("import { useState } from 'react';\n", '')
s = s.replace("import { Check, ArrowRight, Building2, Users2 } from 'lucide-react';", "import { Check, ArrowRight, Building2, Users2, Handshake } from 'lucide-react';")
s = s.replace("  WHY_START, DIFFERENT, PARENT_VISIBILITY, INCLUDED, SERVICES, SKILL_CARDS, IMG,", "  WHY_START, DIFFERENT, YOU_HAVE, WE_PROVIDE, INCLUDED, SERVICES, SKILL_CARDS, IMG,")
open(S, 'w').write(s)

C = D + 'franchiseContent.js'
s = open(C).read()
i = s.index('export const PARENT_VISIBILITY = [')
j = s.index('];', i) + 2
s = s[:i] + '''export const YOU_HAVE = [
  { i: School, t: 'Classroom Space', img: '/franchise/setup-space.webp' },
  { i: UserRound, t: 'Your Appointed Educator', img: '/franchise/setup-educator.webp' },
  { i: Users, t: 'Student Batches', img: '/franchise/setup-batches.webp' },
];

export const WE_PROVIDE = [
  { i: Layers, t: 'Curriculum' },
  { i: Box, t: 'Equipment' },
  { i: Presentation, t: 'Teacher Training & SOPs' },
  { i: Laptop, t: 'LMS & Assessments' },
  { i: Settings, t: 'Academic Framework' },
];''' + s[j:]
s = s.replace("  LifeBuoy, Trophy, Wrench, Camera, FileBarChart, ClipboardCheck, Laptop, Award, Medal,", "  LifeBuoy, Trophy, Wrench, Laptop, School, UserRound, Users, Presentation, Settings,")
open(C, 'w').write(s)

T = D + 'franchiseStyles.js'
edit(T, [
("@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,800;1,900&display=swap');",
 "@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,800;1,900&display=swap');\n@font-face { font-family: 'Zing Rust'; src: url('https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/kfh1elso_zing.rust-demo-base.otf') format('opentype'); font-display: swap; }"),
("min-height: 100vh; background: var(--fr-bg); font-family: 'Montserrat', system-ui, sans-serif; color: #fff; overflow-x: hidden; }",
 "min-height: 100vh; background: var(--fr-bg); font-family: 'Montserrat', system-ui, sans-serif; color: #fff; overflow-x: clip; }"),
(".fr-h2 { font-weight: 900; font-style: italic; text-transform: uppercase; font-size: clamp(1.9rem, 4.3vw, 3.1rem); line-height: 1.02; letter-spacing: -0.01em; color: #fff; }",
 ".fr-h2 { font-family: 'Zing Rust', 'Anton', sans-serif; font-weight: 400; text-transform: uppercase; font-size: clamp(2.3rem, 5vw, 3.8rem); line-height: 0.98; letter-spacing: 0.01em; color: #fff; }"),
(".fr-h2 em, .fr-hero-h1 em { color: var(--fr-red); font-style: italic;", ".fr-h2 em, .fr-hero-h1 em { color: var(--fr-red); font-style: normal;"),
(".fr-hero-h1 { font-weight: 900; font-style: italic; text-transform: uppercase; font-size: clamp(2.5rem, 5.6vw, 4.5rem); line-height: 0.98; margin-top: 1.2rem; letter-spacing: -0.015em; }",
 ".fr-hero-h1 { font-family: 'Zing Rust', 'Anton', sans-serif; font-weight: 400; text-transform: uppercase; font-size: clamp(3rem, 6.6vw, 5.6rem); line-height: 0.92; margin-top: 1.2rem; letter-spacing: 0.01em; }"),
(".fr-panel-t { font-weight: 900; font-style: italic; text-transform: uppercase; font-size: 1.5rem; }",
 ".fr-panel-t { font-family: 'Zing Rust', 'Anton', sans-serif; font-weight: 400; text-transform: uppercase; font-size: 1.9rem; line-height: 1; }\n.fr-inc-list { display: grid; gap: 1.5rem; }\n.fr-tabpanel { position: relative; }\n.fr-tabpanel.red { background: linear-gradient(135deg, rgba(225,29,46,0.28), rgba(60,8,25,0.6)); border-color: rgba(248,113,113,0.75); box-shadow: 0 0 40px rgba(225,29,46,0.28); }\n.fr-tabpanel.red .fr-icon { background: radial-gradient(circle at 30% 30%, #F43F5E, #9F1239); box-shadow: 0 0 20px rgba(225,29,46,0.6); }"),
("/* Light reused sections sit on a framed band */", """/* Easy implementation */
.fr-easy { display: grid; grid-template-columns: 1fr auto 1fr; gap: 1.25rem; align-items: stretch; }
.fr-easy-have, .fr-easy-give { position: relative; border-radius: 24px; padding: 3.2rem 1.25rem 1.25rem; margin-top: 1.6rem; }
.fr-easy-have { border: 1.5px solid rgba(59,130,246,0.85); background: rgba(7,19,69,0.6); box-shadow: 0 0 36px rgba(59,130,246,0.35), inset 0 0 24px rgba(59,130,246,0.12); }
.fr-easy-give { background: linear-gradient(180deg, #FFF1F2, #FDE2E4); color: #0A1A5C; box-shadow: 0 0 36px rgba(225,29,46,0.3); }
.fr-easy-cap { position: absolute; top: -1.6rem; left: 1.25rem; right: 1.25rem; text-align: center; padding: 0.65rem 1rem; border-radius: 18px; background: var(--fr-bg2); border: 1.5px solid rgba(59,130,246,0.9); box-shadow: 0 0 22px rgba(59,130,246,0.45); }
.fr-easy-cap.red { background: linear-gradient(90deg, var(--fr-red), var(--fr-red2)); border-color: rgba(255,255,255,0.3); box-shadow: 0 0 22px rgba(225,29,46,0.55); color: #fff; }
.fr-easy-cap b { display: block; font-family: 'Zing Rust', 'Anton', sans-serif; font-weight: 400; font-size: 1.7rem; text-transform: uppercase; line-height: 1; letter-spacing: 0.02em; }
.fr-easy-cap span { display: block; font-size: 0.85rem; margin-top: 4px; opacity: 0.9; }
.fr-easy-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
.fr-easy-tile { border-radius: 16px; overflow: hidden; background: #EEF4FF; color: #0A1A5C; }
.fr-easy-tile.wide { grid-column: 1 / -1; }
.fr-easy-img { height: 120px; overflow: hidden; }
.fr-easy-tile.wide .fr-easy-img { height: 130px; }
.fr-easy-img img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.08); }
.fr-easy-lbl { display: flex; align-items: center; gap: 0.7rem; padding: 0.7rem 0.9rem; font-weight: 800; font-size: 0.95rem; line-height: 1.2; }
.fr-easy-ic { flex-shrink: 0; width: 44px; height: 44px; margin-top: -1.8rem; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #3B82F6, #1E3A8A); color: #fff; display: inline-flex; align-items: center; justify-content: center; border: 3px solid #EEF4FF; box-shadow: 0 6px 16px rgba(10,26,92,0.35); }
.fr-easy-ic.red { background: radial-gradient(circle at 30% 30%, #F43F5E, #B8121F); }
.fr-easy-ic.big { width: 84px; height: 84px; margin: 0 auto 0.6rem; border: 0; box-shadow: 0 10px 24px rgba(10,26,92,0.3); }
.fr-easy-icons { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.5rem 1rem; padding-top: 0.75rem; }
.fr-easy-icons > div { width: calc(33.33% - 1rem); min-width: 120px; text-align: center; }
.fr-easy-icons b { font-weight: 800; font-size: 0.95rem; color: #0A1A5C; line-height: 1.25; display: block; }
.fr-easy .fr-plus-big { align-self: center; }
@media (max-width: 900px) { .fr-easy { grid-template-columns: 1fr; } .fr-easy .fr-plus-big { text-align: center; line-height: 1; } .fr-easy-icons > div { width: calc(50% - 1rem); } }

/* Light reused sections sit on a framed band */"""),
])
print('ok')
