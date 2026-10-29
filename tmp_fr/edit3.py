def edit(p, pairs):
    s = open(p).read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:70], s.count(a))
        s = s.replace(a, b)
    open(p, 'w').write(s)

D = '/app/frontend/src/pages/franchise/'
S = D + 'FranchiseSections.jsx'
s = open(S).read()
# --- merge Easy Implementation with roles content
i = s.index('export const FrEasySetup = () => (')
j = s.index('export const FrIncluded = () => (')
s = s[:i] + '''export const FrEasySetup = () => (
  <section className="fr-sec" data-testid="franchise-easy-setup">
    <Pixels />
    <div className="fr-wrap">
      <Head a="Easy" b="Implementation." sub="You build the center. We enable the program. Run your center without creating curriculum, learning resources and teaching systems from scratch." />
      <div className="fr-easy">
        <div className="fr-easy-have" data-testid="franchise-you-have">
          <div className="fr-easy-cap"><b>You Manage</b><span>What the franchise partner brings.</span></div>
          <div className="fr-easy-tiles">
            {YOU_HAVE.map((t, i) => (
              <div key={t.t} className={`fr-easy-tile ${i === 2 ? 'wide' : ''}`}>
                <div className="fr-easy-img"><img src={t.img} alt={t.t} loading="lazy" /></div>
                <div className="fr-easy-lbl"><span className={`fr-easy-ic ${i % 2 ? 'red' : ''}`}><t.i size={20} /></span>
                  <div><b>{t.t}</b><small>{t.s}</small></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="fr-plus-big">+</div>
        <div className="fr-easy-give" data-testid="franchise-we-provide">
          <div className="fr-easy-cap red"><b>OLL Provides</b><span>Everything you need to run the program.</span></div>
          <ul className="fr-give-list">
            {WE_PROVIDE.map((t, i) => (
              <li key={t.t}><span className={`fr-easy-ic sm ${i % 2 ? 'red' : ''}`}><t.i size={18} /></span>{t.t}</li>
            ))}
          </ul>
        </div>
      </div>
      <Strip icon={Handshake}>Clear roles. <em>One shared mission.</em></Strip>
    </div>
  </section>
);

''' + s[j:]
# remove FrRoles
i = s.index('export const FrRoles = () => (')
j = s.index('export const FrSpace = () => (')
s = s[:i] + s[j:]
# Services & Space as wide rows
s = s.replace('''      <div className="fr-grid">
        {SERVICES.map((c, i) => (''', '''      <div className="fr-rows">
        {SERVICES.map((c, i) => (''')
s = s.replace('''      <div className="fr-grid">
        {SPACE.map((c, i) => (''', '''      <div className="fr-rows">
        {SPACE.map((c, i) => (''')
for name in ['SERVICES', 'SPACE']:
    a = f'''        {{{name}.map((c, i) => (
          <div key={{c.t}} className={{`fr-card ${{i % 2 ? 'red' : ''}}`}}>
            <span className="fr-num">{{String(i + 1).padStart(2, '0')}}</span>
            <div className="fr-icon"><c.i size={{24}} /></div>
            <h3 className="fr-card-t">{{c.t}}</h3>
            <Ticks items={{c.items}} />
          </div>'''
    assert a in s, name
    s = s.replace(a, f'''        {{{name}.map((c, i) => (
          <div key={{c.t}} className={{`fr-card fr-row ${{i % 2 ? 'red' : ''}}`}}>
            <span className="fr-num">{{String(i + 1).padStart(2, '0')}}</span>
            <div className="fr-row-h"><div className="fr-icon"><c.i size={{24}} /></div><h3 className="fr-card-t">{{c.t}}</h3></div>
            <Ticks items={{c.items}} />
          </div>''')
# Steps vertical milestones
i = s.index('      <ol className="fr-steps">')
j = s.index('      </ol>', i) + len('      </ol>')
s = s[:i] + '''      <ol className="fr-timeline">
        {STEPS.map((s, i) => (
          <li key={s.t} className={i % 2 ? 'right' : 'left'} data-testid={`franchise-step-${i + 1}`}>
            <div className={`fr-tl-node ${i % 2 ? 'red' : ''}`}>{String(i + 1).padStart(2, '0')}</div>
            <div className={`fr-tl-card ${i % 2 ? 'red' : ''}`}>
              <div className="fr-tl-k">Step {i + 1}</div>
              <h3>{s.t}</h3>
              <p>{s.s}</p>
            </div>
          </li>
        ))}
      </ol>''' + s[j:]
open(S, 'w').write(s)

C = D + 'franchiseContent.js'
edit(C, [
('''export const YOU_HAVE = [
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
];''', '''export const YOU_HAVE = [
  { i: School, t: 'Premises & Infrastructure', s: 'Providing suitable premises and completing the center infrastructure', img: '/franchise/setup-space.webp' },
  { i: UserRound, t: 'Educators & Staff', s: 'Recruiting and managing local educators and center staff', img: '/franchise/setup-educator.webp' },
  { i: Users, t: 'Admissions & Operations', s: 'Local admissions, parent communication and daily center operations', img: '/franchise/setup-batches.webp' },
];

export const WE_PROVIDE = [
  { i: Layers, t: 'Curriculum, academic framework and learning resources' },
  { i: Box, t: 'Equipment and kits included in the agreed package' },
  { i: Presentation, t: 'Teacher training, teaching SOPs and academic guidance' },
  { i: Laptop, t: 'LMS and center management software access' },
  { i: Paintbrush, t: 'Branding materials and digital center presence' },
  { i: Megaphone, t: 'Sales training, lead generation and customer management support, as agreed' },
  { i: Settings, t: 'Implementation guidance and ongoing support as per the franchise agreement' },
];'''),
])

edit(D + 'FranchiseLandingPage.jsx', [
('      <FrRoles />\n', ''),
('FrIncluded, FrServices, FrRoles, FrSpace,', 'FrIncluded, FrServices, FrSpace,'),
('      <RbSkillsCarousel testid="franchise-skills"', '      <div className="fr-themed">\n      <RbSkillsCarousel testid="franchise-skills"'),
('subtitle="Robotics, coding, AI, drones, 3D design and more — give children in your community the chance to explore the technologies shaping tomorrow." />',
 'subtitle="Robotics, coding, AI, drones, 3D design and more — give children in your community the chance to explore the technologies shaping tomorrow." />\n      </div>'),
('      <RbAboutOLL />', '      <div className="fr-themed"><RbAboutOLL /></div>'),
])

edit(D + 'franchiseStyles.js', [
("/* Light reused sections sit on a framed band */", """/* Wide rows: one-line pointers */
.fr-rows { display: grid; gap: 1.1rem; }
.fr-card.fr-row { display: grid; grid-template-columns: 280px 1fr; gap: 1.5rem; align-items: center; padding: 1.5rem 1.75rem; }
.fr-row-h { display: flex; align-items: center; gap: 0.9rem; }
.fr-row-h .fr-icon { margin: 0; flex-shrink: 0; }
.fr-card.fr-row .fr-ticks { margin: 0; grid-template-columns: 1fr; }
.fr-card.fr-row .fr-ticks li { white-space: nowrap; }
@media (max-width: 1100px) { .fr-card.fr-row { grid-template-columns: 1fr; gap: 0.9rem; } .fr-card.fr-row .fr-ticks li { white-space: normal; } }

/* Easy implementation (merged roles) */
.fr-easy-lbl b { display: block; font-size: 0.95rem; }
.fr-easy-lbl small { display: block; font-weight: 500; font-size: 0.8rem; color: #475569; margin-top: 2px; line-height: 1.35; }
.fr-give-list { list-style: none; margin: 0; padding: 0.5rem 0 0; display: grid; gap: 0.75rem; }
.fr-give-list li { display: flex; align-items: center; gap: 0.8rem; background: #fff; border-radius: 14px; padding: 0.7rem 0.9rem; font-weight: 700; font-size: 0.92rem; color: #0A1A5C; box-shadow: 0 6px 16px rgba(10,26,92,0.08); line-height: 1.35; }
.fr-easy-ic.sm { width: 40px; height: 40px; margin: 0; border: 0; }

/* Milestone timeline */
.fr-timeline { list-style: none; margin: 0 auto; padding: 0; max-width: 980px; position: relative; }
.fr-timeline::before { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 3px; transform: translateX(-50%); background: linear-gradient(180deg, var(--fr-glow), var(--fr-red)); box-shadow: 0 0 16px rgba(59,130,246,0.7); border-radius: 3px; }
.fr-timeline li { position: relative; display: flex; padding: 0 0 2.25rem; }
.fr-timeline li.left { justify-content: flex-start; }
.fr-timeline li.right { justify-content: flex-end; }
.fr-tl-node { position: absolute; left: 50%; top: 0.6rem; transform: translateX(-50%); width: 58px; height: 58px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Zing Rust','Anton',sans-serif; font-size: 1.5rem; background: radial-gradient(circle at 30% 30%, #3B82F6, #1E3A8A); border: 3px solid #fff; box-shadow: 0 0 0 6px rgba(59,130,246,0.25), 0 0 24px rgba(59,130,246,0.7); z-index: 2; }
.fr-tl-node.red { background: radial-gradient(circle at 30% 30%, #F43F5E, #9F1239); box-shadow: 0 0 0 6px rgba(225,29,46,0.25), 0 0 24px rgba(225,29,46,0.7); }
.fr-tl-card { width: calc(50% - 56px); padding: 1.3rem 1.5rem; border-radius: 18px; background: linear-gradient(180deg, rgba(37,99,235,0.22), rgba(7,19,69,0.85)); border: 1px solid rgba(59,130,246,0.75); box-shadow: 0 0 26px rgba(59,130,246,0.25); animation: fr-rise 0.6s ease both; }
.fr-tl-card.red { background: linear-gradient(180deg, rgba(225,29,46,0.3), rgba(60,8,25,0.65)); border-color: rgba(248,113,113,0.75); box-shadow: 0 0 26px rgba(225,29,46,0.3); }
.fr-tl-k { font-size: 0.68rem; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 800; color: #F87171; }
.fr-tl-card.red .fr-tl-k { color: #93C5FD; }
.fr-tl-card h3 { font-family: 'Zing Rust','Anton',sans-serif; font-weight: 400; text-transform: uppercase; font-size: 1.6rem; line-height: 1.05; margin-top: 0.25rem; }
.fr-tl-card p { font-size: 0.9rem; color: rgba(219,234,254,0.85); margin-top: 0.4rem; line-height: 1.55; }
@media (max-width: 760px) {
  .fr-timeline::before { left: 29px; }
  .fr-timeline li, .fr-timeline li.right { justify-content: flex-end; }
  .fr-tl-node { left: 29px; }
  .fr-tl-card { width: calc(100% - 76px); }
}

/* Reused sections re-skinned to the deck theme */
.fr-themed section { background: radial-gradient(ellipse at 100% 0%, rgba(225,29,46,0.22), transparent 50%), radial-gradient(ellipse at 0% 100%, rgba(37,99,235,0.3), transparent 55%), #071345 !important; }
.fr-themed .rb-orb { display: none; }
.fr-themed .rb-h2 { font-family: 'Zing Rust','Anton',sans-serif !important; font-weight: 400 !important; text-transform: uppercase; font-size: clamp(2.3rem, 5vw, 3.8rem) !important; line-height: 0.98 !important; letter-spacing: 0.01em; }
.fr-themed .rb-h2 span { color: var(--fr-red) !important; }
.fr-themed .rb-hand { font-family: 'Montserrat', sans-serif !important; font-weight: 800; text-transform: uppercase; letter-spacing: 0.22em; font-size: 0.8rem !important; color: #F87171 !important; }
.fr-themed .rb-h3 { font-family: 'Montserrat', sans-serif !important; font-weight: 800 !important; text-transform: uppercase; }
.fr-themed [data-testid="rb-team"], .fr-themed [data-testid="rb-media-kbc"], .fr-themed [data-testid="rb-media-shark-tank"] { border: 1px solid rgba(59,130,246,0.75) !important; box-shadow: 0 0 30px rgba(59,130,246,0.3) !important; background-color: rgba(10,26,92,0.6); }
.fr-themed [data-testid="franchise-skills"] > div { background: linear-gradient(180deg, rgba(37,99,235,0.25), rgba(7,19,69,0.9)) !important; border: 1px solid rgba(59,130,246,0.8); box-shadow: 0 0 50px rgba(59,130,246,0.35) !important; }
.fr-themed .rb-skill-card { border: 1px solid rgba(59,130,246,0.8) !important; box-shadow: 0 0 20px rgba(59,130,246,0.35) !important; }
.fr-themed .rb-skill-card:nth-child(even) { border-color: rgba(248,113,113,0.8) !important; box-shadow: 0 0 20px rgba(225,29,46,0.35) !important; }

/* Light reused sections sit on a framed band */"""),
])
print('ok')
