import { Check, ArrowRight, Handshake } from 'lucide-react';
import { BrochureButton } from './BrochureModal';
import {
  WHY_START, DIFFERENT, YOU_HAVE, WE_PROVIDE, INCLUDED, SERVICES, SKILL_CARDS, IMG, HERO_VIDEO,
  SPACE, TEACHERS, PARTNERS, STEPS,
} from './franchiseContent';

// Deck-style heading: red tick, heavy italic uppercase, white + red two-tone.
export const Head = ({ a, b, sub, center }) => (
  <div className={`fr-head ${center ? 'center' : ''}`}>
    <span className="fr-tickbar" />
    <h2 className="fr-h2">{a} <em>{b}</em></h2>
    {sub && <p className="fr-sub">{sub}</p>}
  </div>
);

const IconCard = ({ c, n, red }) => (
  <div className={`fr-card ${red ? 'red' : ''}`}>
    {n && <span className="fr-num">{String(n).padStart(2, '0')}</span>}
    <div className="fr-icon"><c.i size={24} /></div>
    <h3 className="fr-card-t">{c.t}</h3>
    {c.s && <p className="fr-card-s">{c.s}</p>}
  </div>
);

const Ticks = ({ items }) => (
  <ul className="fr-ticks">
    {items.map((x) => <li key={x}><span className="fr-tick"><Check size={12} strokeWidth={3.5} /></span>{x}</li>)}
  </ul>
);

const Strip = ({ icon: I, children }) => (
  <div className="fr-strip">{I && <I size={20} />}<span>{children}</span></div>
);

const Pixels = () => (
  <div className="fr-pixels" aria-hidden>
    {[[2, 8, 28], [6, 3, 18], [10, 12, 14], [88, 6, 26], [93, 14, 16], [84, 20, 12], [4, 86, 22], [95, 80, 20], [90, 90, 14]].map(([x, y, s], i) => (
      <span key={i} style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, background: i % 3 === 1 ? '#1D4ED8' : '#E11D2E' }} />
    ))}
  </div>
);

export const FrHero = ({ onApply }) => (
  <section className="fr-hero" data-testid="franchise-hero">
    <Pixels />
    <div className="fr-hero-grid">
      <div>
        <div className="fr-pill"><span className="fr-dot" /> OLL Franchise</div>
        <h1 className="fr-hero-h1" data-testid="franchise-hero-title">
          Start Your Own <em>Robotics &amp; AI</em> Learning Center
        </h1>
        <p className="fr-hero-tag">with OLL</p>
        <div className="fr-need" data-testid="franchise-hero-need">
          <p className="fr-need-copy">Launch your own Robotics &amp; AI Learning Center with OLL — a complete franchise opportunity designed to help you build a business in the rapidly evolving future-skills education space.</p>
        </div>
        <div className="fr-hero-actions">
          <button type="button" className="fr-cta" onClick={onApply} data-testid="franchise-hero-apply-btn">Apply for an OLL Franchise <ArrowRight size={18} /></button>
          <BrochureButton testid="franchise-hero-brochure-btn" />
          <div className="fr-invest" data-testid="franchise-investment"><span>Total Investment</span><b>₹2.5 Lakhs</b></div>
        </div>
      </div>
      <div className="fr-hero-art">
        <div className="fr-hero-photo">
          <video src={HERO_VIDEO} poster={IMG.buildKid} autoPlay muted loop playsInline preload="metadata" aria-label="Students learning robotics at an OLL center" data-testid="franchise-hero-video" />
        </div>
        <div className="fr-hero-chips">
          {SKILL_CARDS.map((s) => <span key={s.t}><s.i size={16} /> {s.t}</span>)}
        </div>
      </div>
    </div>
  </section>
);

export const FrWhy = () => (
  <section className="fr-sec" data-testid="franchise-why">
    <div className="fr-wrap">
      <Head a="Why Start a" b="Robotics & AI Center?"
        sub="Education is evolving beyond textbooks. Parents increasingly want children to develop practical skills in future technologies, technological confidence and problem-solving abilities. OLL helps you turn this opportunity into a structured learning business." />
      <div className="fr-grid five">{WHY_START.map((c, i) => <IconCard key={c.t} c={c} n={i + 1} red={i % 2 === 1} />)}</div>
    </div>
  </section>
);

export const FrDifferent = () => (
  <section className="fr-sec alt" data-testid="franchise-different">
    <Pixels />
    <div className="fr-wrap">
      <Head a="Complete" b="Ecosystem." sub="One ecosystem — not just a collection of kits. OLL brings together everything needed to deliver a structured future-skills program." />
      <div className="fr-eco">
        <div className="fr-eco-col">{DIFFERENT.slice(0, 4).map((c, i) => <IconCard key={c.t} c={c} red={i % 2 === 0} />)}</div>
        <div className="fr-eco-mid">
          <div className="fr-eco-circle"><img src={IMG.ecoKids} alt="Students building together" loading="lazy" /></div>
          <div className="fr-eco-label">A complete <em>ecosystem</em><small>for successful implementation and delivery</small></div>
        </div>
        <div className="fr-eco-col">{DIFFERENT.slice(4).map((c, i) => <IconCard key={c.t} c={c} red={i % 2 === 1} />)}</div>
      </div>
      <Strip>Seven pillars. One program. <em>Everything your center needs to deliver.</em></Strip>
    </div>
  </section>
);

export const FrEasySetup = () => (
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

export const FrServices = () => (
  <section className="fr-sec" data-testid="franchise-services">
    <div className="fr-wrap">
      <Head a="Services." b="Support That Runs With You." sub="Beyond equipment — the academic, digital and business systems that keep your center growing." />
      <div className="fr-rows">
        {SERVICES.map((c, i) => (
          <div key={c.t} className={`fr-card fr-row ${i % 2 ? 'red' : ''}`}>
            <span className="fr-num">{String(i + 1).padStart(2, '0')}</span>
            <div className="fr-row-h"><div className="fr-icon"><c.i size={24} /></div><h3 className="fr-card-t">{c.t}</h3></div>
            <Ticks items={c.items} />
          </div>
        ))}
      </div>
      <Strip>Infrastructure + Academics + Training + Support — <em>under one program.</em></Strip>
    </div>
  </section>
);

export const FrSpace = () => (
  <section className="fr-sec" data-testid="franchise-space">
    <div className="fr-wrap">
      <Head a="Space" b="Requirements." sub="Just 300–500 sq. ft. for 15–20 students — here's what makes a great OLL center." />
      <div className="fr-rows">
        {SPACE.map((c, i) => (
          <div key={c.t} className={`fr-card fr-row ${i % 2 ? 'red' : ''}`}>
            <span className="fr-num">{String(i + 1).padStart(2, '0')}</span>
            <div className="fr-row-h"><div className="fr-icon"><c.i size={24} /></div><h3 className="fr-card-t">{c.t}</h3></div>
            <Ticks items={c.items} />
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const FrWho = () => (
  <section className="fr-sec alt" data-testid="franchise-who">
    <Pixels />
    <div className="fr-wrap">
      <Head a="Teacher" b="Enablement." sub="Your teacher. Our training & framework. You don't need to be a robotics expert to build a strong teaching team." />
      <div className="fr-who">
        <div className="fr-photo-frame"><img src={IMG.teacher} alt="OLL trained educator" loading="lazy" /></div>
        <div className="fr-role">
          <h3>Who Can Teach at an OLL Center?</h3>
          <Ticks items={TEACHERS} />
          <p className="fr-note">Educators must meet OLL&apos;s qualification and selection requirements and complete the required training before teaching. <b>Your team brings the passion. OLL provides the curriculum, training framework and teaching resources.</b></p>
        </div>
      </div>
      <div className="fr-role red" style={{ marginTop: '1.25rem' }}>
        <h3>Who Can Become an OLL Franchise Partner?</h3>
        <p className="fr-role-p">You don&apos;t need to be a robotics engineer or an experienced educator to explore this opportunity. This franchise may be suitable for:</p>
        <div className="fr-partner-grid">{PARTNERS.map((p) => <span key={p}><Check size={14} strokeWidth={3} /> {p}</span>)}</div>
      </div>
    </div>
  </section>
);

export const FrSteps = ({ onApply }) => (
  <section className="fr-sec" data-testid="franchise-steps">
    <div className="fr-wrap">
      <Head center a="How Does It" b="Work?" sub="Five simple steps from enquiry to your first batch." />
      <ol className="fr-timeline">
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
      </ol>
      <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
        <button type="button" className="fr-cta" onClick={onApply} data-testid="franchise-steps-apply-btn">Start with Step 1 — Apply <ArrowRight size={18} /></button>
      </div>
    </div>
  </section>
);
