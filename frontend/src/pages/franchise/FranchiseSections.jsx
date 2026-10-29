import { useState } from 'react';
import { Check, ArrowRight, Building2, Users2 } from 'lucide-react';
import {
  HERO_PHOTOS, WHY_START, DIFFERENT, PARENT_VISIBILITY, INCLUDED, SERVICES,
  OLL_PROVIDES, PARTNER_MANAGES, SPACE, TEACHERS, PARTNERS, STEPS,
} from './franchiseContent';

const Head = ({ eyebrow, title, sub, dark }) => (
  <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
    <div className="rb-hand" style={{ color: dark ? '#FCA5A5' : '#DC2626', fontSize: '1.7rem' }}>{eyebrow}</div>
    <h2 className="rb-h2" style={{ fontSize: 'clamp(1.9rem, 4.2vw, 2.9rem)', lineHeight: 1.08, color: dark ? '#fff' : '#0A1F44' }}>{title}</h2>
    {sub && <p className="fr-sub" style={{ color: dark ? 'rgba(255,255,255,0.75)' : '#475569' }}>{sub}</p>}
  </div>
);

const IconCard = ({ c, dark }) => (
  <div className={`fr-card ${dark ? 'dark' : ''}`}>
    <div className="fr-icon"><c.i size={22} /></div>
    <h3 className="fr-card-t">{c.t}</h3>
    {c.s && <p className="fr-card-s">{c.s}</p>}
  </div>
);

const Ticks = ({ items, dark }) => (
  <ul className="fr-ticks">
    {items.map((x) => (
      <li key={x} style={{ color: dark ? 'rgba(226,232,240,0.9)' : '#334155' }}>
        <span className="fr-tick"><Check size={13} strokeWidth={3} /></span>{x}
      </li>
    ))}
  </ul>
);

export const FrHero = ({ onApply }) => (
  <section className="fr-hero" data-testid="franchise-hero">
    <div className="rb-orb rb-orb-red" style={{ width: 480, height: 480, top: -160, right: -100 }} />
    <div className="rb-orb rb-orb-light" style={{ width: 420, height: 420, bottom: -180, left: -120 }} />
    <div className="fr-hero-grid">
      <div>
        <div className="fr-pill"><span className="fr-dot" /> Apply for an OLL Franchise</div>
        <h1 className="fr-hero-h1" data-testid="franchise-hero-title">
          Start Your Own <span style={{ color: '#FCA5A5' }}>Robotics &amp; AI</span> Learning Center with OLL
        </h1>
        <div className="fr-need" data-testid="franchise-hero-need">
          <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.6rem', lineHeight: 1 }}>all you need is?</div>
          <div className="fr-need-row">
            <span><Building2 size={18} /> 1 furnished room <b className="fr-plus">+</b></span>
            <span><Users2 size={18} /> 1 teacher</span>
          </div>
          <p>Rest everything is done by OLL.</p>
        </div>
        <p className="fr-hero-copy">
          Launch your own Robotics &amp; AI Learning Center with OLL — a complete franchise opportunity designed to help you build a business in the rapidly evolving future-skills education space.
        </p>
        <div className="fr-hero-actions">
          <button type="button" className="fr-cta" onClick={onApply} data-testid="franchise-hero-apply-btn">Apply for an OLL Franchise <ArrowRight size={18} /></button>
          <div className="fr-invest" data-testid="franchise-investment">
            <span>Total Investment</span>
            <b>₹2.5 Lakhs</b>
          </div>
        </div>
      </div>
      <div className="fr-collage" aria-hidden>
        {HERO_PHOTOS.map((src, i) => <img key={src} src={src} alt="" className={`fr-col-${i}`} />)}
        <div className="fr-badge">
          <div className="rb-num" style={{ fontSize: '1.9rem', color: '#DC2626', lineHeight: 1 }}>5</div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0A1F44', lineHeight: 1.2 }}>future skills<br />one ecosystem</div>
        </div>
      </div>
    </div>
  </section>
);

export const FrWhy = () => (
  <section className="fr-sec" data-testid="franchise-why">
    <div className="fr-wrap">
      <Head eyebrow="why now" title={<>Why Start a <span className="rb-stroke">Robotics &amp; AI Center?</span></>}
        sub="Education is evolving beyond textbooks. Schools and parents increasingly want children to develop practical skills in future technologies, technological confidence and problem-solving abilities. OLL helps you turn this opportunity into a structured learning business." />
      <div className="fr-grid">{WHY_START.map((c) => <IconCard key={c.t} c={c} />)}</div>
    </div>
  </section>
);

export const FrDifferent = () => (
  <section className="fr-sec fr-dark" data-testid="franchise-different">
    <div className="rb-orb rb-orb-red" style={{ width: 420, height: 420, top: -160, left: -120 }} />
    <div className="fr-wrap">
      <Head dark eyebrow="what makes OLL different" title={<>One Ecosystem. <span style={{ color: '#FCA5A5' }}>Not Just a Collection of Kits.</span></>}
        sub="OLL brings together the essential elements needed to deliver a structured future-skills learning program." />
      <div className="fr-grid">{DIFFERENT.map((c) => <IconCard key={c.t} c={c} dark />)}</div>
      <p className="fr-quote">Your investment builds a complete learning ecosystem — not merely a collection of equipment.</p>
    </div>
  </section>
);

export const FrParents = () => (
  <section className="fr-sec" style={{ background: '#FFF7F7' }} data-testid="franchise-parent-visibility">
    <div className="fr-wrap fr-split">
      <div>
        <div className="rb-hand" style={{ color: '#DC2626', fontSize: '1.7rem' }}>parents see the progress</div>
        <h2 className="rb-h2" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.7rem)', lineHeight: 1.08, color: '#0A1F44' }}>Make Learning <span className="rb-stroke">Visible to Parents</span></h2>
        <p className="fr-sub" style={{ margin: '1rem 0 0', textAlign: 'left' }}>
          Parents should be able to see what their children are learning and creating. Every project becomes an opportunity to demonstrate learning outcomes and communicate the value of your center.
        </p>
      </div>
      <div className="fr-chiplist">
        {PARENT_VISIBILITY.map((c) => <div key={c.t} className="fr-vis"><c.i size={18} /> {c.t}</div>)}
      </div>
    </div>
  </section>
);

export const FrIncluded = () => {
  const [tab, setTab] = useState(INCLUDED[0].key);
  const cur = INCLUDED.find((x) => x.key === tab);
  return (
    <section className="fr-sec" data-testid="franchise-included">
      <div className="fr-wrap">
        <Head eyebrow="what's in the box" title={<>What&apos;s Included in <span className="rb-stroke">Your Franchise?</span></>} />
        <div className="fr-tabs" role="tablist">
          {INCLUDED.map((x, i) => (
            <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} onClick={() => setTab(x.key)}
              className={`fr-tab ${tab === x.key ? 'on' : ''}`} data-testid={`franchise-included-tab-${x.key}`}>
              <span className="fr-tab-n">0{i + 1}</span> {x.t}
            </button>
          ))}
        </div>
        <div className="fr-tabpanel" data-testid="franchise-included-panel">
          <div className="fr-icon big"><cur.i size={28} /></div>
          <div style={{ flex: 1 }}>
            <h3 className="rb-h2" style={{ fontSize: '1.6rem', color: '#0A1F44' }}>{cur.t}</h3>
            <p style={{ color: '#64748B', marginTop: 4 }}>{cur.s}</p>
            <div className="fr-items">{cur.items.map((x) => <span key={x}><Check size={14} strokeWidth={3} /> {x}</span>)}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const FrServices = () => (
  <section className="fr-sec" style={{ background: '#F8FAFC' }} data-testid="franchise-services">
    <div className="fr-wrap">
      <Head eyebrow="and the services" title={<>Support that <span className="rb-stroke">runs with you</span></>} sub="Beyond equipment — the academic, digital and business systems that keep your center growing." />
      <div className="fr-grid">
        {SERVICES.map((c) => (
          <div key={c.t} className="fr-card">
            <div className="fr-icon"><c.i size={22} /></div>
            <h3 className="fr-card-t">{c.t}</h3>
            <Ticks items={c.items} />
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const FrRoles = () => (
  <section className="fr-sec fr-dark" data-testid="franchise-roles">
    <div className="rb-orb rb-orb-light" style={{ width: 420, height: 420, bottom: -180, right: -120 }} />
    <div className="fr-wrap">
      <Head dark eyebrow="clear roles. one shared mission." title={<>You Build the Center. <span style={{ color: '#FCA5A5' }}>We Enable the Program.</span></>}
        sub="OLL's model is designed to help franchise partners run their centers without having to create curriculum, learning resources and teaching systems from scratch." />
      <div className="fr-roles">
        <div className="fr-role oll"><h3>What OLL Provides</h3><Ticks items={OLL_PROVIDES} dark /></div>
        <div className="fr-role you"><h3>What the Franchise Partner Manages</h3><Ticks items={PARTNER_MANAGES} dark /></div>
      </div>
    </div>
  </section>
);

export const FrSpace = () => (
  <section className="fr-sec" data-testid="franchise-space">
    <div className="fr-wrap">
      <Head eyebrow="the room" title={<>Space <span className="rb-stroke">Requirements</span></>} sub="Just 300–500 sq. ft. for 15–20 students — here's what makes a great OLL center." />
      <div className="fr-grid">
        {SPACE.map((c) => (
          <div key={c.t} className="fr-card">
            <div className="fr-icon"><c.i size={22} /></div>
            <h3 className="fr-card-t">{c.t}</h3>
            <Ticks items={c.items} />
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const FrWho = () => (
  <section className="fr-sec" style={{ background: '#F8FAFC' }} data-testid="franchise-who">
    <div className="fr-wrap fr-roles light">
      <div className="fr-role light">
        <div className="rb-hand" style={{ color: '#DC2626', fontSize: '1.5rem' }}>your team</div>
        <h3>Who Can Teach at an OLL Center?</h3>
        <p className="fr-role-p">You don&apos;t need to be a robotics expert to build a strong teaching team. We welcome passionate educators and aspiring teachers interested in STEM education and helping children learn by doing.</p>
        <Ticks items={TEACHERS} />
        <p className="fr-note">Educators must meet OLL&apos;s qualification and selection requirements and complete the required training before teaching. <b>Your team brings the passion. OLL provides the curriculum, training framework and teaching resources.</b></p>
      </div>
      <div className="fr-role light">
        <div className="rb-hand" style={{ color: '#DC2626', fontSize: '1.5rem' }}>you</div>
        <h3>Who Can Become an OLL Franchise Partner?</h3>
        <p className="fr-role-p">You don&apos;t need to be a robotics engineer or an experienced educator to explore this opportunity. This franchise may be suitable for:</p>
        <Ticks items={PARTNERS} />
      </div>
    </div>
  </section>
);

export const FrSteps = ({ onApply }) => (
  <section className="fr-sec" data-testid="franchise-steps">
    <div className="fr-wrap">
      <Head eyebrow="five simple steps" title={<>How Does It <span className="rb-stroke">Work?</span></>} />
      <ol className="fr-steps">
        {STEPS.map((s, i) => (
          <li key={s.t} data-testid={`franchise-step-${i + 1}`}>
            <div className="fr-step-n">{i + 1}</div>
            <div className="fr-step-k">Step {i + 1}</div>
            <h3>{s.t}</h3>
            <p>{s.s}</p>
          </li>
        ))}
      </ol>
      <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
        <button type="button" className="fr-cta" onClick={onApply} data-testid="franchise-steps-apply-btn">Start with Step 1 — Apply <ArrowRight size={18} /></button>
      </div>
    </div>
  </section>
);
