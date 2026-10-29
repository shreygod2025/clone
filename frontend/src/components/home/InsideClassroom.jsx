import { useEffect, useState } from 'react';
import { Play, Video, Sparkles, X } from 'lucide-react';

// Classroom media — real photos & videos from OLL classrooms (mirrors Future Skills page)
const CLASSROOM_MEDIA = [
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/5h69is60_20260504_122331.mp4', label: 'Hands-on build', caption: 'Kids assembling their first IoT & AI lab kit' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/h11kmu1i_20260504_122503.jpg', label: 'Live class', caption: 'Working through a circuit module step by step' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/gwljm6r9_20260504_122607.jpg', label: 'Build station', caption: 'Pair-builds with the OLL IoT & AI Lab Kit' },
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/04pgqymv_20260504_123958.mp4', label: 'In action', caption: 'Real class footage — what a session feels like' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/tqatbciw_20260504_124243.jpg', label: 'Manipulative station', caption: 'Kids exploring components together' },
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/9p89o2y6_20260504_154936.mp4', label: 'Class showcase', caption: 'Students presenting what they built today' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/rhwyg94z_20260504_163950.jpg', label: 'Batch of builders', caption: 'End-of-class group photo — the whole crew' },
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/geb6vgey_VID20260504135039.mp4', label: 'Build moment', caption: 'Mid-class hands-on — heads-down focus' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/ctig02to_IMG-20260504-WA0020.jpg', label: 'Educator-led', caption: 'Trainers walking kids through their first build' },
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/e7dknsgn_VID20260504155236.mp4', label: 'In progress', caption: 'Kids deep in their build — a real session glimpse' },
];

// Homepage "Inside an OLL classroom" auto-scrolling ribbon with lightbox.
export const InsideClassroom = () => {
  const [mediaOpen, setMediaOpen] = useState(null);
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        .home-h2 { font-family: 'Montserrat', sans-serif; font-weight: 300; font-size: clamp(2rem, 4.4vw, 3rem); line-height: 1.1; color: #0A1F44; margin-top: 0.4rem; letter-spacing: -0.005em; }
        .home-sub { font-family: 'Montserrat', sans-serif; font-weight: 300; font-size: 1rem; max-width: 640px; margin: 0.9rem auto 0; color: #475569; line-height: 1.6; }
        .home-script-heading { font-family: 'Caveat', 'Playfair Display', cursive; font-size: clamp(2rem, 4.4vw, 3rem); color: #DC2626; line-height: 1; font-weight: 700; }
      `}</style>
      {/* ── INSIDE AN OLL CLASSROOM · horizontal auto-scroll (uneven cards) ── */}
      <section data-testid="homepage-inside-classroom" style={{
        position: 'relative', overflow: 'hidden',
        padding: '5rem 0 5.5rem',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
      }}>
        <style>{`
          @keyframes home-class-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .home-class-wrap { position: relative; overflow: hidden; padding: 14px 0; mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent); }
          .home-class-track { display: inline-flex; gap: 1.15rem; padding: 4px 1rem; align-items: center; animation: home-class-scroll 70s linear infinite; will-change: transform; width: max-content; }
          .home-class-track:hover { animation-play-state: paused; }
          .home-class-card {
            flex-shrink: 0; position: relative; overflow: hidden; border-radius: 20px; cursor: pointer;
            background: linear-gradient(180deg, #0A1F44 0%, #1E3A5F 100%);
            border: 2px solid rgba(96,165,250,0.16);
            box-shadow: 0 22px 44px rgba(10,31,68,0.16);
            transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
          }
          .home-class-card:hover { transform: translateY(-6px); box-shadow: 0 30px 60px rgba(10,31,68,0.28); border-color: #DC2626; }
          .home-class-card img, .home-class-card video {
            position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
            transition: transform 0.55s ease, opacity 0.35s ease;
          }
          .home-class-card:hover img { transform: scale(1.06); }
          .home-class-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 45%, rgba(10,31,68,0.92) 100%); pointer-events: none; }
          .home-class-pill { position: absolute; top: 12px; left: 12px; z-index: 2; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-family: 'Proxima Nova','Montserrat',sans-serif; font-size: 0.62rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #fff; backdrop-filter: blur(6px); border: 1px solid; }
          .home-class-pill.video { background: rgba(220,38,38,0.72); border-color: #DC2626; }
          .home-class-pill.photo { background: rgba(30,58,95,0.72); border-color: #60A5FA; }
          .home-class-play { position: absolute; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center; pointer-events: none; }
          .home-class-play > div { width: 60px; height: 60px; border-radius: 999px; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; box-shadow: 0 12px 28px rgba(0,0,0,0.35); transition: transform 0.3s ease, background 0.3s ease, border-color 0.3s ease; }
          .home-class-card:hover .home-class-play > div { transform: scale(1.12); background: #DC2626; border-color: #DC2626; }
          .home-class-cap { position: absolute; bottom: 14px; left: 16px; right: 16px; z-index: 2; color: #fff; font-family: 'Proxima Nova','Montserrat',sans-serif; }
          .home-class-cap-title { font-size: 0.98rem; font-weight: 800; line-height: 1.2; }
          .home-class-cap-sub { margin-top: 3px; font-size: 0.76rem; color: rgba(191,219,254,0.9); font-weight: 300; line-height: 1.4; }
          /* Uneven sizes — cycled per card index so the ribbon looks organic */
          .home-class-size-0 { width: 300px; height: 400px; }
          .home-class-size-1 { width: 380px; height: 280px; }
          .home-class-size-2 { width: 260px; height: 340px; }
          .home-class-size-3 { width: 420px; height: 320px; }
          .home-class-size-4 { width: 320px; height: 420px; }
          @media (max-width: 640px) {
            .home-class-size-0 { width: 200px; height: 280px; }
            .home-class-size-1 { width: 240px; height: 200px; }
            .home-class-size-2 { width: 180px; height: 240px; }
            .home-class-size-3 { width: 260px; height: 220px; }
            .home-class-size-4 { width: 210px; height: 290px; }
            .home-class-cap-title { font-size: 0.8rem !important; }
            .home-class-cap-sub { display: none; }
            .home-class-play > div { width: 46px; height: 46px; }
          }
        `}</style>

        <div style={{ textAlign: 'center', maxWidth: 1180, margin: '0 auto 2.5rem', padding: '0 1.25rem' }}>
          <div className="home-script-heading">what learning looks like</div>
          <h2 className="home-h2">
            Inside an <span style={{ WebkitTextStroke: '2px #0A1F44', WebkitTextFillColor: 'transparent', color: 'transparent' }}>OLL classroom.</span>
          </h2>
          <p className="home-sub">Not slides. Not lectures. Real components, real builds, real kids getting their hands dirty.</p>
          <div style={{ marginTop: '0.75rem', fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic' }}>
            Tap any card to play / view
          </div>
        </div>

        <div className="home-class-wrap" data-testid="home-classroom-slider">
          <div className="home-class-track">
            {[...CLASSROOM_MEDIA, ...CLASSROOM_MEDIA].map((m, i) => {
              const originalIdx = i % CLASSROOM_MEDIA.length;
              const sizeClass = `home-class-size-${i % 5}`;
              return (
                <div
                  key={`${m.src}-${i}`}
                  className={`home-class-card ${sizeClass}`}
                  onClick={() => setMediaOpen(m)}
                  data-testid={i < CLASSROOM_MEDIA.length ? `home-classroom-card-${originalIdx}` : undefined}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMediaOpen(m); } }}
                  aria-label={`View ${m.label}`}
                >
                  {m.type === 'video' ? (
                    <video src={m.src} muted playsInline preload="metadata" style={{ pointerEvents: 'none' }} />
                  ) : (
                    <img src={m.src} alt={m.label} loading="lazy" />
                  )}
                  <div className="home-class-overlay" />
                  <span className={`home-class-pill ${m.type}`}>
                    {m.type === 'video' ? <Video size={11} /> : <Sparkles size={11} />}
                    {m.type === 'video' ? 'Video' : 'Photo'}
                  </span>
                  {m.type === 'video' && (
                    <div className="home-class-play">
                      <div><Play size={22} fill="#fff" strokeWidth={0} style={{ marginLeft: 2 }} /></div>
                    </div>
                  )}
                  <div className="home-class-cap">
                    <div className="home-class-cap-title">{m.label}</div>
                    <div className="home-class-cap-sub">{m.caption}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic' }}>
          {CLASSROOM_MEDIA.length} moments · captured at our centres in May 2026
        </div>
      </section>
      <MediaLightbox media={mediaOpen} onClose={() => setMediaOpen(null)} />
    </>
  );
};

export const MediaLightbox = ({ media, onClose, kicker }) => {
  useEffect(() => {
    if (!media) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [media, onClose]);
  return (
    <>
      {/* ── Classroom media lightbox modal ────────────────────────────── */}
      {media && (
        <div
          data-testid="home-classroom-lightbox"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(6,12,30,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(8px)' }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            data-testid="home-classroom-lightbox-close"
            aria-label="Close"
            style={{ position: 'absolute', top: 20, right: 20, width: 42, height: 42, borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
          <div style={{ position: 'relative', width: '100%', maxWidth: 960, borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.55)', background: '#0A1F44' }}>
            {media.type === 'video' ? (
              <video src={media.src} controls autoPlay playsInline style={{ width: '100%', maxHeight: '80vh', background: '#000', display: 'block' }} />
            ) : (
              <img src={media.src} alt={media.label} style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', background: '#000', display: 'block' }} />
            )}
            <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(180deg, rgba(10,31,68,0.4), #0A1F44)', color: '#fff' }}>
              <div style={{ fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FCA5A5' }}>
                {kicker || (media.type === 'video' ? 'Class footage' : 'Class moment')}
              </div>
              <div style={{ fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '1.15rem', fontWeight: 800, marginTop: 4 }}>{media.label}</div>
              <div style={{ fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.9rem', marginTop: 4, color: 'rgba(191,219,254,0.9)' }}>{media.caption}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
