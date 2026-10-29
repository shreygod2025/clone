import { PlayCircle, Star, Quote as QuoteIcon } from 'lucide-react';

// ── Parent & student testimonials (video card grid) ────────────────────────
const TESTIMONIALS = [
  {
    role: 'parent', label: 'PARENT', name: 'OLL Parents',
    quote: '"Our kids come home buzzing about what they built."',
    video: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/39v27qp3_Testimonial%20Parents.mp4',
    thumbYT: null,
  },
  {
    role: 'student', label: 'STUDENT', name: 'Young Builder · Grade 5',
    quote: '"I made a robot that follows a line!"',
    video: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/yl1ydmda_IMG_7029.MOV',
    thumbYT: null,
  },
  {
    role: 'student', label: 'STUDENT', name: 'Young Coder · Grade 7',
    quote: '"I wrote my first Python game in class."',
    video: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/4boxtvd2_IMG_7035.MOV',
    thumbYT: null,
  },
  {
    role: 'student', label: 'STUDENT', name: 'Young Creator · Grade 9',
    quote: '"3D-printed my own phone stand this week!"',
    video: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/vo8r3dzk_IMG_7045.MOV',
    thumbYT: null,
  },
];

const WRITTEN_QUOTES = [
  { quote: 'My son went from gaming all weekend to spending Saturdays designing his own game. The shift in 3 months has been unreal.', name: 'Anita S.', context: 'Grade 5 parent' },
  { quote: 'He builds robots at home now with parts he saves up for. The class lit a fire we didn\u2019t know was there.', name: 'Rajesh M.', context: 'Grade 8 parent' },
  { quote: 'Best investment beyond her academics. She actually looks forward to Saturdays.', name: 'Priya K.', context: 'Grade 3 parent' },
];

// Homepage "Hear it from our parents & students" block — rating card, video + written testimonials.
export const ParentsFeedback = () => (
  <>
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        .home-h2 { font-family: 'Montserrat', sans-serif; font-weight: 300; font-size: clamp(2rem, 4.4vw, 3rem); line-height: 1.1; color: #0A1F44; margin-top: 0.4rem; letter-spacing: -0.005em; }
        .home-sub { font-family: 'Montserrat', sans-serif; font-weight: 300; font-size: 1rem; max-width: 640px; margin: 0.9rem auto 0; color: #475569; line-height: 1.6; }
        .home-script-heading { font-family: 'Caveat', 'Playfair Display', cursive; font-size: clamp(2rem, 4.4vw, 3rem); color: #DC2626; line-height: 1; font-weight: 700; }
    `}</style>
    {/* ── PARENTS FEEDBACK · rating card + video testimonials + written quotes ── */}
    <section data-testid="homepage-parents-feedback" style={{
      position: 'relative',
      padding: '5rem 1.25rem 4rem',
      background: '#FFFFFF',
    }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>

        {/* Rating summary card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '1.25rem',
            boxShadow: '0 20px 40px rgba(15,30,80,0.08)',
            padding: '2rem 2.25rem',
            maxWidth: 780,
            margin: '0 auto 3rem',
            display: 'grid',
            gridTemplateColumns: '220px 1fr',
            gap: '2rem',
            alignItems: 'center',
          }}
          className="home-rating-card"
          data-testid="home-rating-card"
        >
          <style>{`@media (max-width: 640px) { .home-rating-card { grid-template-columns: 1fr !important; gap: 1rem !important; padding: 1.5rem !important; } }`}</style>
          <div>
            <div style={{ fontFamily: "'Zing Rust', 'Anton', sans-serif", fontSize: 'clamp(3.5rem, 6vw, 5rem)', lineHeight: 1, color: '#DC2626', fontWeight: 900, letterSpacing: '-0.02em' }}>
              4.75<span style={{ fontSize: '0.4em', color: '#94A3B8', marginLeft: 6 }}>/5</span>
            </div>
            <div style={{ marginTop: '0.4rem', fontFamily: "'Montserrat', sans-serif", fontSize: '0.7rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: '#DC2626' }}>Parent Rating</div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.6rem' }}>
              {[0,1,2,3,4].map((i) => <Star key={i} size={20} style={{ color: '#DC2626', fill: '#DC2626' }} />)}
              <span style={{ marginLeft: 8, color: '#64748B', fontSize: '0.85rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 300 }}>based on 500+ reviews</span>
            </div>
            {[{ s: 5, p: 82 }, { s: 4, p: 14 }, { s: 3, p: 3 }, { s: 2, p: 1 }].map((r) => (
              <div key={r.s} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 44px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>{r.s}★</div>
                <div style={{ height: 8, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.p}%`, background: 'linear-gradient(90deg, #DC2626, #0A1F44)', borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, textAlign: 'right' }}>{r.p}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section headline */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.78rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: '#DC2626', marginBottom: '0.5rem' }}>
            // Real voices · real builds
          </div>
          <h2 className="home-h2" style={{ color: '#0F1E33' }}>
            Hear it from our <span style={{ color: '#0F1E33' }}>parents &amp; students</span>
          </h2>
        </div>

        {/* Video testimonials grid */}
        <div className="home-testimonial-grid" data-testid="home-testimonial-grid">
          <style>{`
            .home-testimonial-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
            @media (max-width: 1000px) { .home-testimonial-grid { grid-template-columns: repeat(2, 1fr); } }
            @media (max-width: 560px)  { .home-testimonial-grid { grid-template-columns: 1fr; } }
            .home-tcard { position: relative; aspect-ratio: 4/5; border-radius: 1.1rem; overflow: hidden; background: #0A1F44; box-shadow: 0 18px 40px rgba(15,30,80,0.15); cursor: pointer; text-decoration: none; transition: transform 0.35s ease, box-shadow 0.35s ease; }
            .home-tcard:hover { transform: translateY(-6px); box-shadow: 0 28px 56px rgba(15,30,80,0.25); }
            .home-tcard video, .home-tcard img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
            .home-tcard::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.90) 100%); pointer-events: none; }
            .home-tbadge { position: absolute; top: 14px; left: 14px; z-index: 2; font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 0.68rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 5px 12px; border-radius: 999px; color: #fff; }
            .home-tbadge.parent { background: #DC2626; }
            .home-tbadge.student { background: #0F1E33; }
            .home-tplay { position: absolute; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center; color: #fff; opacity: 0.9; transition: transform 0.3s ease, opacity 0.3s ease; }
            .home-tcard:hover .home-tplay { transform: scale(1.08); opacity: 1; }
            .home-tcopy { position: absolute; bottom: 16px; left: 18px; right: 18px; z-index: 2; color: #fff; font-family: 'Montserrat', sans-serif; }
            .home-tname { font-size: 1.05rem; font-weight: 700; line-height: 1.2; }
            .home-tquote { margin-top: 4px; font-size: 0.82rem; color: rgba(255,255,255,0.85); font-style: italic; line-height: 1.4; }
          `}</style>
          {TESTIMONIALS.map((t, idx) => {
            const isYT = !!t.thumbYT;
            const props = isYT
              ? { as: 'a', href: `https://youtu.be/${t.thumbYT}`, target: '_blank', rel: 'noreferrer' }
              : {};
            return (
              <a
                key={t.name}
                href={isYT ? `https://youtu.be/${t.thumbYT}` : undefined}
                target={isYT ? '_blank' : undefined}
                rel={isYT ? 'noreferrer' : undefined}
                className="home-tcard"
                data-testid={`home-testimonial-${idx}`}
                {...(!isYT ? { onClick: (e) => {
                  const vid = e.currentTarget.querySelector('video');
                  if (!vid) return;
                  // First click always unmutes + plays; subsequent clicks toggle play/pause with sound on
                  if (vid.muted) {
                    vid.muted = false;
                    vid.currentTime = 0;
                    const p = vid.play();
                    if (p && p.catch) p.catch(() => {});
                  } else if (vid.paused) {
                    const p = vid.play();
                    if (p && p.catch) p.catch(() => {});
                  } else {
                    vid.pause();
                  }
                }} : {})}
              >
                <span className={`home-tbadge ${t.role}`}>{t.label}</span>
                {isYT ? (
                  <img src={`https://i.ytimg.com/vi/${t.thumbYT}/hqdefault.jpg`} alt={t.name} loading="lazy" />
                ) : (
                  <video src={t.video} autoPlay muted loop playsInline />
                )}
                <div className="home-tplay"><PlayCircle size={54} strokeWidth={1.5} /></div>
                <div className="home-tcopy">
                  <div className="home-tname">{t.name}</div>
                  <div className="home-tquote">{t.quote}</div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Written quote cards */}
        <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }} data-testid="home-written-quotes">
          {WRITTEN_QUOTES.map((q) => (
            <div key={q.name} style={{
              background: '#FFFFFF',
              border: '1px solid #F1F5F9',
              borderRadius: '1rem',
              padding: '1.75rem 1.5rem',
              boxShadow: '0 10px 24px rgba(15,30,80,0.05)',
            }}>
              <QuoteIcon size={22} style={{ color: '#DC2626' }} />
              <p style={{ marginTop: '1rem', fontFamily: "'Montserrat', sans-serif", fontStyle: 'italic', color: '#334155', fontSize: '0.95rem', lineHeight: 1.6 }}>
                &ldquo;{q.quote}&rdquo;
              </p>
              <div style={{ marginTop: '1.15rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                {[0,1,2,3,4].map((i) => <Star key={i} size={15} style={{ color: '#DC2626', fill: '#DC2626' }} />)}
              </div>
              <div style={{ marginTop: '0.5rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#0F1E33' }}>
                {q.name}<span style={{ color: '#94A3B8', fontWeight: 500 }}>, {q.context}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </>
);
