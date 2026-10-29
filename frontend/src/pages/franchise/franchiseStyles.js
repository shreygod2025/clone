export const FRANCHISE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,800;1,900&display=swap');
@font-face { font-family: 'Zing Rust'; src: url('https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/kfh1elso_zing.rust-demo-base.otf') format('opentype'); font-display: swap; }
.fr-page, .fr-vars { --fr-bg: #0A1A5C; --fr-bg2: #071345; --fr-blue: #2563EB; --fr-glow: #3B82F6; --fr-red: #E11D2E; --fr-red2: #B8121F;
}
.fr-page { min-height: 100vh; background: var(--fr-bg); font-family: 'Montserrat', system-ui, sans-serif; color: #fff; overflow-x: clip; }
.fr-wrap { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; }
.fr-sec { position: relative; overflow: hidden; padding: 5.5rem 1.25rem;
  background: radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.28), transparent 60%), var(--fr-bg); }
.fr-sec.alt { background: radial-gradient(ellipse at 100% 0%, rgba(225,29,46,0.22), transparent 50%), radial-gradient(ellipse at 0% 100%, rgba(37,99,235,0.3), transparent 55%), var(--fr-bg2); }
.fr-pixels span { position: absolute; z-index: 0; opacity: 0.85; box-shadow: 0 0 18px currentColor; }

/* Headings — deck style */
.fr-head { margin-bottom: 2.75rem; max-width: 820px; }
.fr-head.center { margin-left: auto; margin-right: auto; text-align: center; }
.fr-tickbar { display: inline-block; width: 44px; height: 4px; background: var(--fr-red); border-radius: 2px; margin-bottom: 0.8rem; }
.fr-h2 { font-family: 'Zing Rust', 'Anton', sans-serif; font-weight: 400; text-transform: uppercase; font-size: clamp(2.3rem, 5vw, 3.8rem); line-height: 0.98; letter-spacing: 0.01em; color: #fff; }
.fr-h2 em, .fr-hero-h1 em { color: var(--fr-red); font-style: normal; text-shadow: 0 0 24px rgba(225,29,46,0.35); }
.fr-sub { font-size: 1rem; line-height: 1.65; color: rgba(219,234,254,0.82); margin-top: 0.9rem; }

/* Nav */
.fr-nav-wrap { position: sticky; top: 0; z-index: 50; padding: 12px 1rem 0; }
.fr-nav { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 9px 12px 9px 20px; background: rgba(255,255,255,0.95); backdrop-filter: blur(16px); border-radius: 999px; box-shadow: 0 12px 34px rgba(3,10,40,0.45), 0 0 0 1px rgba(59,130,246,0.35); }
.fr-nav-invest { font-size: 0.8rem; color: #475569; font-weight: 600; }
.fr-nav-invest b { color: var(--fr-red); }
@media (max-width: 640px) { .fr-nav-invest { display: none; } }

/* CTA */
.fr-cta { display: inline-flex; align-items: center; gap: 0.55rem; padding: 1rem 1.7rem; border-radius: 999px; border: 1px solid rgba(255,255,255,0.25); cursor: pointer; background: linear-gradient(90deg, var(--fr-red), var(--fr-red2)); color: #fff; font-weight: 800; font-size: 0.92rem; letter-spacing: 0.03em; text-transform: uppercase; box-shadow: 0 0 0 4px rgba(225,29,46,0.18), 0 18px 40px rgba(225,29,46,0.45); transition: transform 0.2s ease, box-shadow 0.2s ease; }
.fr-cta:hover { transform: translateY(-2px); box-shadow: 0 0 0 6px rgba(225,29,46,0.22), 0 24px 50px rgba(225,29,46,0.6); }
.fr-cta:disabled { opacity: 0.7; cursor: wait; }
.fr-cta.sm { padding: 0.65rem 1.15rem; font-size: 0.78rem; }
.fr-ghost { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.95rem 1.4rem; border-radius: 999px; cursor: pointer; background: rgba(7,19,69,0.6); color: #fff; border: 1.5px solid rgba(59,130,246,0.85); font-weight: 800; font-size: 0.85rem; letter-spacing: 0.03em; text-transform: uppercase; box-shadow: 0 0 20px rgba(59,130,246,0.35); transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease; font-family: inherit; }
.fr-ghost:hover { transform: translateY(-2px); background: rgba(37,99,235,0.35); box-shadow: 0 0 30px rgba(59,130,246,0.6); }
.fr-ghost.dark { background: #fff; color: #0A1A5C; border-color: rgba(10,26,92,0.25); box-shadow: none; }
.fr-ghost.dark:hover { background: #EEF4FF; }
.fr-ghost.sm { padding: 0.6rem 1rem; font-size: 0.75rem; }
.fr-select { display: flex; align-items: center; gap: 8px; width: 100%; border: 1px solid #CBD5E1; border-radius: 12px; padding: 0.75rem 0.9rem; font-size: 0.95rem; font-weight: 500; color: #0A1A5C; background: #F8FAFC; text-align: left; cursor: pointer; font-family: inherit; text-transform: none; letter-spacing: 0; transition: border-color 0.2s, box-shadow 0.2s; }
.fr-select.ph span { color: #94A3B8; }
.fr-select:focus, .fr-select[data-state="open"] { outline: none; border-color: #E11D2E; box-shadow: 0 0 0 3px rgba(225,29,46,0.12); }
.fr-modal-form { display: grid; gap: 0.85rem; font-family: 'Montserrat', sans-serif; }
.fr-modal-form .fr-field input { width: 100%; border: 1px solid #CBD5E1; border-radius: 12px; padding: 0.75rem 0.9rem; font-size: 0.95rem; color: #0A1A5C; background: #F8FAFC; outline: none; font-family: inherit; }
.fr-modal-form .fr-field input:focus { border-color: #E11D2E; box-shadow: 0 0 0 3px rgba(225,29,46,0.12); }

/* Centers */
.fr-centers { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
.fr-center { border-radius: 18px; padding: 1.25rem; background: linear-gradient(180deg, rgba(37,99,235,0.2), rgba(7,19,69,0.85)); border: 1px solid rgba(59,130,246,0.75); box-shadow: 0 0 22px rgba(59,130,246,0.22); display: flex; flex-direction: column; transition: transform 0.3s ease, box-shadow 0.3s ease; }
.fr-center:hover { transform: translateY(-4px); box-shadow: 0 0 36px rgba(59,130,246,0.45); }
.fr-center.red { background: linear-gradient(180deg, rgba(225,29,46,0.28), rgba(60,8,25,0.65)); border-color: rgba(248,113,113,0.75); box-shadow: 0 0 22px rgba(225,29,46,0.25); }
.fr-center-top { display: flex; gap: 0.75rem; align-items: flex-start; }
.fr-center-pin { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: radial-gradient(circle at 30% 30%, #3B82F6, #1E3A8A); box-shadow: 0 0 16px rgba(59,130,246,0.6); }
.fr-center.red .fr-center-pin { background: radial-gradient(circle at 30% 30%, #F43F5E, #9F1239); box-shadow: 0 0 16px rgba(225,29,46,0.6); }
.fr-center h3 { font-family: 'Zing Rust','Anton',sans-serif; font-weight: 400; text-transform: uppercase; font-size: 1.45rem; line-height: 1.05; }
.fr-center-top p { font-size: 0.82rem; color: #93C5FD; font-weight: 700; margin-top: 2px; }
.fr-center.red .fr-center-top p { color: #FCA5A5; }
.fr-center-addr { font-size: 0.82rem; color: rgba(219,234,254,0.78); margin-top: 0.75rem; line-height: 1.5; flex: 1; }
.fr-center-actions { display: flex; gap: 0.5rem; margin-top: 0.9rem; }
.fr-center-actions a { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 999px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #fff; text-decoration: none; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.06); }
.fr-center-actions a:hover { background: rgba(255,255,255,0.16); }

/* Mobile polish */
@media (max-width: 640px) {
  .fr-sec { padding: 3.5rem 1rem; }
  .fr-head { margin-bottom: 1.75rem; }
  .fr-h2 { font-size: 2.2rem; }
  .fr-sub { font-size: 0.92rem; }
  .fr-hero { padding: 5.75rem 1rem 2.5rem; }
  .fr-hero-h1 { font-size: 2.9rem; }
  .fr-hero-tag { font-size: 0.75rem; letter-spacing: 0.3em; }
  .fr-need-row span { font-size: 1rem; }
  .fr-hero-actions { gap: 0.75rem; }
  .fr-hero-actions .fr-cta, .fr-hero-actions .fr-ghost { width: 100%; justify-content: center; }
  .fr-invest { border-left: 0; padding-left: 0; flex-direction: row; align-items: baseline; gap: 0.6rem; }
  .fr-hero-chips { flex-direction: row; flex-wrap: wrap; position: static; margin-top: 0.75rem; }
  .fr-hero-chips span { font-size: 0.66rem; padding: 6px 9px; }
  .fr-hero-copy { margin-top: 1.5rem; font-size: 0.88rem; }
  .fr-nav { padding: 7px 8px 7px 14px; }
  .fr-nav img { height: 28px !important; }
  .fr-nav .fr-ghost { display: none; }
  .fr-grid, .fr-grid.five { grid-template-columns: 1fr; gap: 0.9rem; }
  .fr-card { padding: 1.3rem 1.1rem 1.1rem; }
  .fr-card.fr-row { padding: 1.3rem 1.1rem; }
  .fr-tabpanel { padding: 1.2rem; gap: 0.9rem; }
  .fr-panel-t { font-size: 1.5rem; }
  .fr-items { grid-template-columns: 1fr; }
  .fr-icon.big { width: 56px; height: 56px; }
  .fr-strip { border-radius: 16px; font-size: 0.86rem; padding: 0.85rem 1rem; }
  .fr-easy-have, .fr-easy-give { padding: 3rem 0.8rem 0.9rem; }
  .fr-easy-cap b { font-size: 1.4rem; }
  .fr-give-list li { font-size: 0.85rem; }
  .fr-eco-circle { max-width: 240px; }
  .fr-centers { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-left: 1rem; gap: 0.8rem; padding-bottom: 0.75rem; margin: 0 -1rem; padding-left: 1rem; padding-right: 1rem; scrollbar-width: none; }
  .fr-centers::-webkit-scrollbar { display: none; }
  .fr-center { flex: 0 0 82%; scroll-snap-align: start; }
  .fr-tl-card { padding: 1rem 1.1rem; }
  .fr-tl-card h3 { font-size: 1.35rem; }
  .fr-form-card { padding: 1.2rem; border-radius: 18px; }
  .fr-field input, .fr-field textarea, .fr-select { font-size: 16px; }
  .fr-chip { padding: 0.55rem 0.85rem; }
  .fr-final { gap: 2rem; }
  .fr-themed section { padding-left: 1rem !important; padding-right: 1rem !important; }
  .fr-themed .rb-skill-card { flex: 0 0 150px !important; border-radius: 16px !important; }
  .fr-themed .rb-skills-track { animation-duration: 18s !important; gap: 0.7rem !important; }
  .fr-themed .rb-skill-label { font-size: 0.8rem !important; }
  .fr-themed .rb-skill-card:nth-child(n) { height: 200px !important; margin-top: 0 !important; }
  .fr-themed .rb-skill-card:nth-child(even) { height: 230px !important; }
}

/* Hero */
.fr-hero { position: relative; overflow: hidden; margin-top: -64px; padding: 8rem 1.25rem 4rem;
  background: radial-gradient(ellipse at 80% 30%, rgba(37,99,235,0.45), transparent 55%), radial-gradient(ellipse at 10% 90%, rgba(225,29,46,0.25), transparent 50%), var(--fr-bg2); }
.fr-hero-grid { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 3rem; align-items: center; }
.fr-pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 6px; background: var(--fr-red); color: #fff; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; transform: skewX(-8deg); }
.fr-dot { width: 7px; height: 7px; border-radius: 50%; background: #fff; animation: fr-pulse 2s infinite; }
@keyframes fr-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
.fr-hero-h1 { font-family: 'Zing Rust', 'Anton', sans-serif; font-weight: 400; text-transform: uppercase; font-size: clamp(3rem, 6.6vw, 5.6rem); line-height: 0.92; margin-top: 1.2rem; letter-spacing: 0.01em; }
.fr-hero-tag { font-weight: 800; letter-spacing: 0.4em; text-transform: uppercase; color: rgba(219,234,254,0.8); font-size: 0.9rem; margin-top: 0.6rem; }
.fr-need { margin-top: 1.6rem; padding: 1.1rem 1.3rem; border-radius: 16px; background: rgba(10,26,92,0.6); border: 1px solid rgba(59,130,246,0.6); box-shadow: 0 0 30px rgba(59,130,246,0.25), inset 0 0 20px rgba(59,130,246,0.12); max-width: 520px; animation: fr-rise 0.8s ease 0.2s both; }
.fr-need-k { font-weight: 900; font-style: italic; text-transform: uppercase; color: var(--fr-red); font-size: 0.95rem; letter-spacing: 0.04em; }
.fr-need-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; margin-top: 0.45rem; }
.fr-need-row span { white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; font-weight: 800; font-size: 1.15rem; }
.fr-need-row .fr-plus { color: var(--fr-red); font-size: 1.4rem; margin-left: 4px; }
.fr-need p { margin-top: 0.3rem; color: rgba(219,234,254,0.85); font-size: 0.95rem; }
.fr-need .fr-need-copy { margin: 0; font-size: 1rem; line-height: 1.65; color: rgba(226,232,240,0.92); }
.fr-hero-actions { margin-top: 1.75rem; display: flex; flex-wrap: wrap; align-items: center; gap: 1.25rem; }
.fr-invest { display: flex; flex-direction: column; padding-left: 1.25rem; border-left: 3px solid var(--fr-red); }
.fr-invest span { font-size: 0.68rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(219,234,254,0.75); font-weight: 700; }
.fr-invest b { font-weight: 900; font-style: italic; font-size: 2rem; line-height: 1.05; }
.fr-hero-art { position: relative; animation: fr-rise 0.9s ease 0.15s both; }
.fr-hero-photo { position: relative; border-radius: 26px; overflow: hidden; border: 2px solid rgba(59,130,246,0.8); box-shadow: 0 0 0 6px rgba(37,99,235,0.15), 0 0 50px rgba(59,130,246,0.45), 0 40px 80px rgba(0,0,0,0.5); aspect-ratio: 4 / 4.4; max-height: 540px; margin-left: auto; }
.fr-hero-photo img, .fr-hero-photo video { width: 100%; height: 100%; object-fit: cover; object-position: center 30%; display: block; }
.fr-hero-chips { position: absolute; left: -1.5rem; bottom: 1.5rem; display: flex; flex-direction: column; gap: 6px; }
.fr-hero-chips span { display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; background: rgba(7,19,69,0.92); border: 1px solid rgba(59,130,246,0.7); box-shadow: 0 0 16px rgba(59,130,246,0.35); width: fit-content; }
.fr-hero-chips span:nth-child(odd) { background: var(--fr-red); border-color: rgba(255,255,255,0.35); box-shadow: 0 0 16px rgba(225,29,46,0.45); }
.fr-hero-copy { position: relative; z-index: 1; max-width: 1200px; margin: 2.5rem auto 0; color: rgba(219,234,254,0.8); line-height: 1.65; font-size: 0.98rem; padding: 1rem 1.25rem; border-radius: 14px; border: 1px solid rgba(59,130,246,0.35); background: rgba(10,26,92,0.5); }
@keyframes fr-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@media (max-width: 900px) {
  .fr-hero { padding: 6.5rem 1.25rem 3rem; }
  .fr-hero-grid { grid-template-columns: 1fr; gap: 2.5rem; }
  .fr-hero-chips { position: static; flex-direction: row; flex-wrap: wrap; margin-top: 0.85rem; }
  .fr-hero-photo { aspect-ratio: 4 / 4; }
}

/* Glow cards */
.fr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.1rem; }
.fr-grid.five { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.fr-card { position: relative; border-radius: 18px; padding: 1.6rem 1.4rem 1.4rem; background: linear-gradient(180deg, rgba(37,99,235,0.18), rgba(10,26,92,0.7)); border: 1px solid rgba(59,130,246,0.7); box-shadow: 0 0 24px rgba(59,130,246,0.22), inset 0 0 22px rgba(59,130,246,0.1); transition: transform 0.3s ease, box-shadow 0.3s ease; }
.fr-card.red { background: linear-gradient(180deg, rgba(225,29,46,0.32), rgba(80,10,30,0.55)); border-color: rgba(248,113,113,0.75); box-shadow: 0 0 24px rgba(225,29,46,0.28), inset 0 0 22px rgba(225,29,46,0.12); }
.fr-card:hover { transform: translateY(-5px); box-shadow: 0 0 40px rgba(59,130,246,0.45), inset 0 0 22px rgba(59,130,246,0.15); }
.fr-card.red:hover { box-shadow: 0 0 40px rgba(225,29,46,0.5), inset 0 0 22px rgba(225,29,46,0.15); }
.fr-num { position: absolute; top: -13px; left: 16px; min-width: 32px; height: 26px; padding: 0 6px; border-radius: 999px; background: var(--fr-bg2); border: 2px solid var(--fr-glow); font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.fr-card.red .fr-num { border-color: #F87171; }
.fr-icon { width: 52px; height: 52px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #3B82F6, #1E3A8A); color: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 0.95rem; box-shadow: 0 0 20px rgba(59,130,246,0.55); }
.fr-card.red .fr-icon { background: radial-gradient(circle at 30% 30%, #F43F5E, #9F1239); box-shadow: 0 0 20px rgba(225,29,46,0.6); }
.fr-icon.big { width: 72px; height: 72px; flex-shrink: 0; margin: 0; }
.fr-card-t { font-weight: 800; font-size: 1.02rem; line-height: 1.25; text-transform: uppercase; letter-spacing: 0.01em; }
.fr-card-s { font-size: 0.88rem; color: rgba(219,234,254,0.8); margin-top: 0.45rem; line-height: 1.55; }
.fr-ticks { list-style: none; padding: 0; margin: 0.8rem 0 0; display: grid; gap: 0.5rem; }
.fr-ticks li { display: flex; gap: 0.55rem; font-size: 0.88rem; line-height: 1.45; color: rgba(226,232,240,0.9); }
.fr-tick { flex-shrink: 0; width: 19px; height: 19px; border-radius: 50%; background: var(--fr-red); color: #fff; display: inline-flex; align-items: center; justify-content: center; margin-top: 1px; box-shadow: 0 0 10px rgba(225,29,46,0.5); }
.fr-strip { margin-top: 2.25rem; display: flex; align-items: center; justify-content: center; gap: 0.8rem; text-align: center; padding: 1rem 1.5rem; border-radius: 999px; border: 1px solid rgba(59,130,246,0.75); background: rgba(7,19,69,0.75); box-shadow: 0 0 26px rgba(59,130,246,0.3); font-weight: 700; font-size: 0.98rem; }
.fr-strip em { color: #F87171; font-style: normal; }

/* Skill cards */
.fr-skill-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.9rem; }
.fr-skill { border-radius: 16px; overflow: hidden; border: 1px solid rgba(59,130,246,0.75); box-shadow: 0 0 26px rgba(59,130,246,0.35); transition: transform 0.3s ease, box-shadow 0.3s ease; }
.fr-skill.red { border-color: rgba(248,113,113,0.8); box-shadow: 0 0 26px rgba(225,29,46,0.35); }
.fr-skill:hover { transform: translateY(-6px) scale(1.02); }
.fr-skill img { display: block; width: 100%; height: auto; }
@media (max-width: 900px) { .fr-skill-grid { grid-template-columns: repeat(2, 1fr); } .fr-skill:last-child { grid-column: 1 / -1; max-width: 50%; justify-self: center; } }

/* Ecosystem */
.fr-eco { display: grid; grid-template-columns: 1fr 0.9fr 1fr; gap: 1.25rem; align-items: center; }
.fr-eco-col { display: grid; gap: 1rem; }
.fr-eco-col .fr-card { padding: 1rem 1.1rem; display: grid; grid-template-columns: auto 1fr; column-gap: 0.9rem; align-items: center; }
.fr-eco-col .fr-icon { margin: 0; grid-row: span 2; width: 46px; height: 46px; }
.fr-eco-col .fr-card-s { margin-top: 0.2rem; }
.fr-eco-mid { text-align: center; }
.fr-eco-circle { width: 100%; max-width: 340px; aspect-ratio: 1; margin: 0 auto; border-radius: 50%; overflow: hidden; border: 3px solid rgba(59,130,246,0.9); box-shadow: 0 0 0 10px rgba(37,99,235,0.15), 0 0 60px rgba(59,130,246,0.55); }
.fr-eco-circle img { width: 100%; height: 100%; object-fit: cover; }
.fr-eco-label { margin-top: 1.2rem; font-weight: 900; font-style: italic; text-transform: uppercase; font-size: 1.35rem; }
.fr-eco-label em { color: var(--fr-red); }
.fr-eco-label small { display: block; font-style: normal; font-weight: 500; text-transform: none; font-size: 0.85rem; color: rgba(219,234,254,0.75); margin-top: 0.3rem; }
@media (max-width: 960px) { .fr-eco { grid-template-columns: 1fr; } .fr-eco-mid { order: -1; } }

/* Parents */
.fr-split { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 3rem; align-items: center; }
.fr-chiplist { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; margin-top: -1rem; }
.fr-vis { display: flex; align-items: center; gap: 0.6rem; border-radius: 14px; padding: 0.9rem 1rem; font-weight: 700; font-size: 0.88rem; background: rgba(37,99,235,0.15); border: 1px solid rgba(59,130,246,0.6); box-shadow: 0 0 16px rgba(59,130,246,0.18); }
.fr-vis:nth-child(even) { background: rgba(225,29,46,0.18); border-color: rgba(248,113,113,0.6); }
.fr-vis-n { font-size: 0.7rem; font-weight: 900; color: #F87171; }
.fr-vis svg { flex-shrink: 0; color: #93C5FD; }
.fr-photo-frame { border-radius: 22px; overflow: hidden; border: 2px solid rgba(59,130,246,0.8); box-shadow: 0 0 50px rgba(59,130,246,0.4), 0 30px 60px rgba(0,0,0,0.45); }
.fr-photo-frame img { display: block; width: 100%; height: 100%; object-fit: cover; }
@media (max-width: 860px) { .fr-split { grid-template-columns: 1fr; gap: 2rem; } .fr-chiplist { grid-template-columns: 1fr; } }

/* Included tabs */
.fr-tabs { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1.4rem; }
.fr-tab { display: inline-flex; align-items: center; gap: 8px; padding: 0.75rem 1.15rem; border-radius: 12px; border: 1px solid rgba(59,130,246,0.6); background: rgba(7,19,69,0.7); color: #DBEAFE; font-weight: 800; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.03em; cursor: pointer; transition: background-color 0.2s, box-shadow 0.2s, border-color 0.2s; font-family: inherit; }
.fr-tab:hover { box-shadow: 0 0 18px rgba(59,130,246,0.45); }
.fr-tab.on { background: var(--fr-red); border-color: rgba(255,255,255,0.4); color: #fff; box-shadow: 0 0 24px rgba(225,29,46,0.55); }
.fr-tab-n { font-weight: 900; font-style: italic; color: #F87171; }
.fr-tab.on .fr-tab-n { color: #fff; }
.fr-tabpanel { display: flex; gap: 1.5rem; align-items: flex-start; border-radius: 22px; padding: 2rem; background: linear-gradient(135deg, rgba(37,99,235,0.2), rgba(7,19,69,0.85)); border: 1px solid rgba(59,130,246,0.75); box-shadow: 0 0 40px rgba(59,130,246,0.3); animation: fr-rise 0.4s ease both; }
.fr-panel-t { font-family: 'Zing Rust', 'Anton', sans-serif; font-weight: 400; text-transform: uppercase; font-size: 1.9rem; line-height: 1; }
.fr-inc-list { display: grid; gap: 1.5rem; }
.fr-tabpanel { position: relative; }
.fr-tabpanel.red { background: linear-gradient(135deg, rgba(225,29,46,0.28), rgba(60,8,25,0.6)); border-color: rgba(248,113,113,0.75); box-shadow: 0 0 40px rgba(225,29,46,0.28); }
.fr-tabpanel.red .fr-icon { background: radial-gradient(circle at 30% 30%, #F43F5E, #9F1239); box-shadow: 0 0 20px rgba(225,29,46,0.6); }
.fr-panel-s { color: rgba(219,234,254,0.75); margin-top: 4px; }
.fr-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.65rem 1.25rem; margin-top: 1.25rem; }
.fr-items span { display: flex; gap: 0.5rem; align-items: flex-start; font-size: 0.9rem; color: rgba(226,232,240,0.92); }
.fr-items svg { color: #F87171; flex-shrink: 0; margin-top: 3px; }
@media (max-width: 640px) { .fr-tabpanel { flex-direction: column; padding: 1.4rem; } }

/* Roles */
.fr-roles { display: grid; grid-template-columns: 1fr auto 1fr; gap: 1.25rem; align-items: center; }
.fr-role { border-radius: 20px; padding: 1.9rem; background: linear-gradient(180deg, rgba(37,99,235,0.2), rgba(7,19,69,0.8)); border: 1px solid rgba(59,130,246,0.75); box-shadow: 0 0 30px rgba(59,130,246,0.25); }
.fr-role.oll, .fr-role.red { background: linear-gradient(180deg, rgba(225,29,46,0.3), rgba(60,8,25,0.6)); border-color: rgba(248,113,113,0.75); box-shadow: 0 0 30px rgba(225,29,46,0.3); }
.fr-role-k { display: inline-block; padding: 4px 12px; border-radius: 999px; background: var(--fr-bg2); border: 1px solid rgba(255,255,255,0.3); font-size: 0.7rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 0.7rem; }
.fr-role h3 { font-weight: 900; font-style: italic; text-transform: uppercase; font-size: 1.2rem; line-height: 1.2; }
.fr-role-p { color: rgba(219,234,254,0.82); margin-top: 0.6rem; line-height: 1.6; font-size: 0.92rem; }
.fr-plus-big { font-size: 3.5rem; font-weight: 900; color: #fff; text-shadow: 0 0 24px rgba(59,130,246,0.9); }
.fr-note { margin-top: 1.2rem; padding: 0.9rem 1rem; border-radius: 12px; background: rgba(7,19,69,0.7); border: 1px dashed rgba(147,197,253,0.5); color: rgba(219,234,254,0.85); font-size: 0.85rem; line-height: 1.55; }
.fr-who { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 1.25rem; align-items: stretch; }
.fr-partner-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.6rem 1.2rem; margin-top: 1rem; }
.fr-partner-grid span { display: flex; gap: 0.5rem; font-size: 0.92rem; font-weight: 600; }
.fr-partner-grid svg { color: #fff; flex-shrink: 0; margin-top: 3px; }
@media (max-width: 860px) { .fr-roles, .fr-who { grid-template-columns: 1fr; } .fr-plus-big { text-align: center; line-height: 1; } }

/* Steps — chevrons */
.fr-steps { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.8rem; }
.fr-steps li { position: relative; padding: 1.4rem 1.1rem; border-radius: 16px; background: linear-gradient(180deg, rgba(37,99,235,0.22), rgba(7,19,69,0.8)); border: 1px solid rgba(59,130,246,0.75); box-shadow: 0 0 22px rgba(59,130,246,0.25); }
.fr-steps li.red { background: linear-gradient(180deg, rgba(225,29,46,0.32), rgba(60,8,25,0.6)); border-color: rgba(248,113,113,0.75); box-shadow: 0 0 22px rgba(225,29,46,0.3); }
.fr-step-n { font-weight: 900; font-style: italic; font-size: 2.2rem; line-height: 1; color: rgba(255,255,255,0.95); text-shadow: 0 0 18px rgba(59,130,246,0.8); }
.fr-steps li.red .fr-step-n { text-shadow: 0 0 18px rgba(225,29,46,0.8); }
.fr-steps h3 { font-weight: 800; text-transform: uppercase; font-size: 0.95rem; margin-top: 0.7rem; line-height: 1.25; }
.fr-steps p { font-size: 0.84rem; color: rgba(219,234,254,0.8); margin-top: 0.4rem; line-height: 1.5; }
@media (max-width: 960px) { .fr-steps { grid-template-columns: 1fr; } }

/* Final + form */
.fr-final { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; }
.fr-final-kid { margin-top: 1.75rem; max-width: 300px; aspect-ratio: 4 / 4.2; }
@media (max-width: 900px) { .fr-final { grid-template-columns: 1fr; } .fr-final-kid { display: none; } }
.fr-form-card { scroll-margin-top: 90px; background: #fff; color: #0A1A5C; border-radius: 22px; padding: 1.75rem; border: 2px solid rgba(59,130,246,0.8); box-shadow: 0 0 50px rgba(59,130,246,0.45), 0 30px 70px rgba(0,0,0,0.45); }
.fr-form-card .rb-h2 { color: #0A1A5C !important; }
.fr-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; }
@media (max-width: 560px) { .fr-form-grid { grid-template-columns: 1fr; } }
.fr-field { display: flex; flex-direction: column; gap: 6px; font-size: 0.78rem; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.03em; }
.fr-field input, .fr-field textarea { width: 100%; border: 1px solid #CBD5E1; border-radius: 12px; padding: 0.75rem 0.9rem; font-size: 0.95rem; font-weight: 500; color: #0A1A5C; background: #F8FAFC; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s; font-family: inherit; text-transform: none; letter-spacing: 0; }
.fr-field input:focus, .fr-field textarea:focus { border-color: var(--fr-red); background: #fff; box-shadow: 0 0 0 3px rgba(225,29,46,0.12); }
.fr-chip-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.fr-chip { padding: 0.6rem 1rem; border-radius: 999px; border: 1px solid #CBD5E1; background: #fff; font-weight: 700; font-size: 0.82rem; color: #334155; cursor: pointer; transition: background-color 0.2s, color 0.2s, border-color 0.2s; font-family: inherit; text-transform: none; letter-spacing: 0; }
.fr-chip.on { background: #0A1A5C; color: #fff; border-color: #0A1A5C; }

/* Easy implementation */
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
.fr-easy-img img { width: 100%; height: 100%; object-fit: cover; object-position: center 75%; transform: scale(1.18); transform-origin: center 80%; }
.fr-easy-lbl { display: flex; align-items: center; gap: 0.7rem; padding: 0.7rem 0.9rem; font-weight: 800; font-size: 0.95rem; line-height: 1.2; }
.fr-easy-ic { flex-shrink: 0; width: 54px; height: 54px; margin-top: -2.2rem; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #3B82F6, #1E3A8A); color: #fff; display: inline-flex; align-items: center; justify-content: center; border: 3px solid #EEF4FF; box-shadow: 0 6px 16px rgba(10,26,92,0.35); }
.fr-easy-ic.red { background: radial-gradient(circle at 30% 30%, #F43F5E, #B8121F); }
.fr-easy-ic.big { width: 84px; height: 84px; margin: 0 auto 0.6rem; border: 0; box-shadow: 0 10px 24px rgba(10,26,92,0.3); }
.fr-easy-icons { display: flex; flex-wrap: wrap; justify-content: center; align-content: center; height: 100%; gap: 2rem 1rem; padding: 1rem 0; }
.fr-easy-icons > div { width: calc(33.33% - 1rem); min-width: 120px; text-align: center; }
.fr-easy-icons b { font-weight: 800; font-size: 0.95rem; color: #0A1A5C; line-height: 1.25; display: block; }
.fr-easy .fr-plus-big { align-self: center; }
@media (max-width: 900px) { .fr-easy { grid-template-columns: 1fr; } .fr-easy .fr-plus-big { text-align: center; line-height: 1; } .fr-easy-icons > div { width: calc(50% - 1rem); } }

/* Wide rows: one-line pointers */
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

.fr-easy-have { display: flex; flex-direction: column; }
.fr-easy-tiles { grid-template-columns: 1fr; grid-auto-rows: 1fr; flex: 1; }
.fr-easy-tile, .fr-easy-tile.wide { display: grid; grid-template-columns: 42% 1fr; align-items: stretch; }
.fr-easy-tile .fr-easy-img, .fr-easy-tile.wide .fr-easy-img { height: auto; min-height: 118px; }
.fr-easy-tile .fr-easy-lbl { padding: 0.9rem 1rem; }
.fr-easy-tile .fr-easy-ic { margin: 0; width: 46px; height: 46px; }
@media (max-width: 520px) { .fr-easy-tile, .fr-easy-tile.wide { grid-template-columns: 1fr; } .fr-easy-tile .fr-easy-img { min-height: 130px; } }
.fr-timeline li:last-child { padding-bottom: 0; }

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
  .fr-timeline li, .fr-timeline li.left, .fr-timeline li.right { justify-content: flex-end; }
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

/* Light reused sections sit on a framed band */
.fr-light-band { background: #fff; color: #0A1F44; }

/* Sticky mobile CTA */
.fr-sticky { display: none; }
@media (max-width: 768px) {
  .fr-sticky { display: flex; transform: translateY(110%); transition: transform 0.3s ease; position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); background: rgba(7,19,69,0.96); backdrop-filter: blur(12px); border-top: 1px solid rgba(59,130,246,0.6); box-shadow: 0 -8px 30px rgba(59,130,246,0.3); }
  .fr-sticky.on { transform: none; }
  .fr-sticky .fr-cta { white-space: nowrap; padding: 0.7rem 1rem; }
  .fr-sticky small { white-space: nowrap; }
  .fr-sticky small { display: block; font-size: 0.62rem; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(219,234,254,0.7); }
  .fr-sticky b { font-size: 1.1rem; font-style: italic; font-weight: 900; }
  .fr-page { padding-bottom: 70px; }
}
`;
