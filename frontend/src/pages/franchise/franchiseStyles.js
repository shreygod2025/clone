export const FRANCHISE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@font-face { font-family: 'Zing Rust'; src: url('https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/kfh1elso_zing.rust-demo-base.otf') format('opentype'); font-display: swap; }
.fr-page { min-height: 100vh; background: #fff; font-family: 'Inter', system-ui, sans-serif; color: #0A1F44; overflow-x: hidden; }
.fr-wrap { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; }
.fr-sec { position: relative; overflow: hidden; padding: 5.5rem 1.25rem; }
.fr-dark { background: linear-gradient(180deg, #0A1F44 0%, #10193A 100%); color: #fff; }
.fr-sub { font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 300; font-size: 1.02rem; line-height: 1.65; max-width: 760px; margin: 0.9rem auto 0; }

/* Nav */
.fr-nav-wrap { position: sticky; top: 0; z-index: 50; padding: 12px 1rem 0; }
.fr-nav { max-width: 1180px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 10px 14px 10px 22px; background: rgba(255,255,255,0.88); backdrop-filter: blur(16px); border: 1px solid #E2E8F0; border-radius: 999px; box-shadow: 0 12px 30px rgba(15,30,80,0.10); }
.fr-nav-invest { font-size: 0.8rem; color: #64748B; }
.fr-nav-invest b { color: #0A1F44; }
@media (max-width: 640px) { .fr-nav-invest { display: none; } }

/* CTA */
.fr-cta { display: inline-flex; align-items: center; gap: 0.55rem; padding: 0.95rem 1.6rem; border-radius: 999px; border: 0; cursor: pointer; background: linear-gradient(90deg, #DC2626, #B91C1C); color: #fff; font-weight: 800; font-size: 0.92rem; letter-spacing: 0.02em; box-shadow: 0 18px 36px rgba(220,38,38,0.35); transition: transform 0.2s ease, box-shadow 0.2s ease; }
.fr-cta:hover { transform: translateY(-2px); box-shadow: 0 24px 44px rgba(220,38,38,0.5); }
.fr-cta:disabled { opacity: 0.7; cursor: wait; }
.fr-cta.sm { padding: 0.65rem 1.15rem; font-size: 0.82rem; }

/* Hero */
.fr-hero { position: relative; overflow: hidden; margin: -64px 0 0; padding: 8.5rem 1.25rem 5.5rem; background: radial-gradient(ellipse at 85% 10%, rgba(220,38,38,0.32), transparent 55%), linear-gradient(160deg, #0A1F44 0%, #10193A 60%, #2A1030 100%); color: #fff; }
.fr-hero-grid { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 3.5rem; align-items: center; }
.fr-pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(252,165,165,0.5); color: #FCA5A5; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; }
.fr-dot { width: 7px; height: 7px; border-radius: 50%; background: #F87171; animation: fr-pulse 2s infinite; }
@keyframes fr-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
.fr-hero-h1 { font-family: 'Zing Rust','Anton',sans-serif; text-transform: uppercase; font-weight: 400; font-size: clamp(2.5rem, 5.6vw, 4.6rem); line-height: 0.98; margin-top: 1.1rem; letter-spacing: 0.005em; }
.fr-need { margin-top: 1.6rem; padding: 1.1rem 1.3rem; border-radius: 1.1rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); backdrop-filter: blur(14px); max-width: 520px; animation: fr-rise 0.8s ease 0.2s both; }
.fr-need-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; margin-top: 0.5rem; }
.fr-need-row span { display: inline-flex; align-items: center; gap: 6px; font-weight: 800; font-size: 1.15rem; }
.fr-need-row .fr-plus { color: #FCA5A5; font-size: 1.4rem; }
.fr-need p { margin-top: 0.35rem; color: rgba(226,232,240,0.85); font-size: 0.95rem; }
.fr-hero-copy { margin-top: 1.25rem; max-width: 560px; color: rgba(226,232,240,0.85); font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 300; line-height: 1.65; }
.fr-hero-actions { margin-top: 1.75rem; display: flex; flex-wrap: wrap; align-items: center; gap: 1.25rem; }
.fr-invest { display: flex; flex-direction: column; padding-left: 1.25rem; border-left: 2px solid rgba(252,165,165,0.5); }
.fr-invest span { font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: #FCA5A5; font-weight: 700; }
.fr-invest b { font-family: 'Zing Rust','Anton',sans-serif; font-weight: 400; font-size: 2.2rem; line-height: 1; }
.fr-collage { position: relative; height: 480px; }
.fr-collage img { position: absolute; object-fit: cover; border-radius: 22px; border: 3px solid rgba(255,255,255,0.12); box-shadow: 0 30px 60px rgba(0,0,0,0.45); animation: fr-rise 0.9s ease both; }
.fr-col-0 { width: 72%; height: 62%; top: 0; right: 0; animation-delay: 0.1s !important; }
.fr-col-1 { width: 52%; height: 46%; bottom: 0; left: 0; animation-delay: 0.3s !important; }
.fr-col-2 { width: 40%; height: 40%; bottom: 6%; right: 4%; animation-delay: 0.5s !important; }
.fr-badge { position: absolute; top: 46%; left: 4%; background: #fff; border-radius: 16px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; box-shadow: 0 18px 40px rgba(0,0,0,0.3); animation: fr-rise 0.9s ease 0.7s both; }
@keyframes fr-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@media (max-width: 900px) {
  .fr-hero { padding: 7rem 1.25rem 4rem; }
  .fr-hero-grid { grid-template-columns: 1fr; gap: 2.5rem; }
  .fr-collage { height: 320px; }
}

/* Cards */
.fr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
.fr-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 1.15rem; padding: 1.5rem; box-shadow: 0 6px 24px rgba(15,30,80,0.05); transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; }
.fr-card:hover { transform: translateY(-4px); box-shadow: 0 18px 40px rgba(15,30,80,0.12); border-color: rgba(220,38,38,0.35); }
.fr-card.dark { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.10); backdrop-filter: blur(12px); box-shadow: none; }
.fr-card.dark .fr-card-t { color: #fff; }
.fr-card.dark .fr-card-s { color: rgba(226,232,240,0.75); }
.fr-icon { width: 46px; height: 46px; border-radius: 12px; background: rgba(220,38,38,0.09); color: #DC2626; display: flex; align-items: center; justify-content: center; margin-bottom: 0.9rem; }
.fr-icon.big { width: 64px; height: 64px; border-radius: 18px; flex-shrink: 0; margin: 0; }
.fr-card.dark .fr-icon { background: rgba(252,165,165,0.12); color: #FCA5A5; }
.fr-card-t { font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 700; font-size: 1.05rem; color: #0A1F44; line-height: 1.2; }
.fr-card-s { font-size: 0.9rem; color: #475569; margin-top: 0.4rem; line-height: 1.55; }
.fr-ticks { list-style: none; padding: 0; margin: 0.75rem 0 0; display: grid; gap: 0.5rem; }
.fr-ticks li { display: flex; gap: 0.55rem; font-size: 0.9rem; line-height: 1.45; }
.fr-tick { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: #DC2626; color: #fff; display: inline-flex; align-items: center; justify-content: center; margin-top: 1px; }
.fr-quote { max-width: 760px; margin: 2.5rem auto 0; text-align: center; font-family: 'Caveat', cursive; font-size: 1.9rem; line-height: 1.2; color: #FCA5A5; }

/* Parent visibility */
.fr-split { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; }
.fr-chiplist { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.fr-vis { display: flex; align-items: center; gap: 0.6rem; background: #fff; border: 1px solid #FECACA; border-radius: 14px; padding: 1rem; font-weight: 600; font-size: 0.92rem; color: #0A1F44; box-shadow: 0 6px 18px rgba(220,38,38,0.06); }
.fr-vis svg { color: #DC2626; flex-shrink: 0; }
@media (max-width: 800px) { .fr-split { grid-template-columns: 1fr; gap: 2rem; } .fr-chiplist { grid-template-columns: 1fr; } }

/* Included tabs */
.fr-tabs { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; margin-bottom: 1.5rem; }
.fr-tab { display: inline-flex; align-items: center; gap: 8px; padding: 0.7rem 1.1rem; border-radius: 999px; border: 1px solid #E2E8F0; background: #fff; color: #334155; font-weight: 700; font-size: 0.88rem; cursor: pointer; transition: background-color 0.2s, color 0.2s, border-color 0.2s; }
.fr-tab:hover { border-color: #DC2626; }
.fr-tab.on { background: #0A1F44; color: #fff; border-color: #0A1F44; }
.fr-tab-n { font-family: 'Caveat', cursive; font-size: 1.2rem; color: #DC2626; }
.fr-tab.on .fr-tab-n { color: #FCA5A5; }
.fr-tabpanel { display: flex; gap: 1.5rem; align-items: flex-start; background: linear-gradient(135deg, #fff 0%, #FFF7F7 100%); border: 1px solid #E2E8F0; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 20px 50px rgba(15,30,80,0.08); animation: fr-rise 0.4s ease both; }
.fr-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.6rem 1.25rem; margin-top: 1.25rem; }
.fr-items span { display: flex; gap: 0.5rem; align-items: flex-start; font-size: 0.92rem; color: #334155; }
.fr-items svg { color: #DC2626; flex-shrink: 0; margin-top: 3px; }
@media (max-width: 640px) { .fr-tabpanel { flex-direction: column; padding: 1.4rem; } }

/* Roles */
.fr-roles { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
.fr-role { border-radius: 1.4rem; padding: 2rem; border: 1px solid rgba(255,255,255,0.12); }
.fr-role.oll { background: rgba(255,255,255,0.05); }
.fr-role.you { background: rgba(220,38,38,0.12); border-color: rgba(252,165,165,0.35); }
.fr-role h3 { font-family: 'Proxima Nova','Montserrat',sans-serif; font-size: 1.35rem; font-weight: 700; }
.fr-role.light { background: #fff; border-color: #E2E8F0; box-shadow: 0 10px 30px rgba(15,30,80,0.06); }
.fr-role.light h3 { color: #0A1F44; }
.fr-role-p { color: #475569; margin-top: 0.6rem; line-height: 1.6; font-size: 0.95rem; }
.fr-note { margin-top: 1.25rem; padding: 0.9rem 1rem; border-radius: 12px; background: #F1F5F9; color: #475569; font-size: 0.86rem; line-height: 1.55; }
@media (max-width: 800px) { .fr-roles { grid-template-columns: 1fr; } }

/* Steps */
.fr-steps { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; position: relative; }
.fr-steps::before { content: ''; position: absolute; top: 26px; left: 10%; right: 10%; height: 2px; background: repeating-linear-gradient(90deg, #DC2626 0 10px, transparent 10px 18px); }
.fr-steps li { position: relative; text-align: center; padding: 0 0.5rem; }
.fr-step-n { width: 54px; height: 54px; margin: 0 auto; border-radius: 50%; background: #0A1F44; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem; border: 4px solid #fff; box-shadow: 0 0 0 2px #DC2626; position: relative; }
.fr-step-k { margin-top: 0.9rem; font-size: 0.68rem; letter-spacing: 0.2em; text-transform: uppercase; color: #DC2626; font-weight: 800; }
.fr-steps h3 { font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 700; font-size: 1.02rem; margin-top: 0.3rem; }
.fr-steps p { font-size: 0.86rem; color: #475569; margin-top: 0.35rem; line-height: 1.5; }
@media (max-width: 900px) {
  .fr-steps { grid-template-columns: 1fr; gap: 1.5rem; }
  .fr-steps::before { top: 0; bottom: 0; left: 26px; right: auto; width: 2px; height: auto; background: repeating-linear-gradient(180deg, #DC2626 0 10px, transparent 10px 18px); }
  .fr-steps li { text-align: left; padding-left: 72px; min-height: 54px; }
  .fr-step-n { position: absolute; left: 0; top: 0; margin: 0; }
  .fr-step-k { margin-top: 0; }
}

/* Final + form */
.fr-final { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; }
@media (max-width: 900px) { .fr-final { grid-template-columns: 1fr; } }
.fr-form-card { background: #fff; color: #0A1F44; border-radius: 1.5rem; padding: 1.75rem; box-shadow: 0 30px 70px rgba(0,0,0,0.35); }
.fr-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; }
@media (max-width: 560px) { .fr-form-grid { grid-template-columns: 1fr; } }
.fr-field { display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem; font-weight: 700; color: #334155; }
.fr-field input, .fr-field textarea { width: 100%; border: 1px solid #CBD5E1; border-radius: 12px; padding: 0.75rem 0.9rem; font-size: 0.95rem; font-weight: 400; color: #0A1F44; background: #F8FAFC; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s; font-family: inherit; }
.fr-field input:focus, .fr-field textarea:focus { border-color: #DC2626; background: #fff; box-shadow: 0 0 0 3px rgba(220,38,38,0.12); }
.fr-chip-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.fr-chip { padding: 0.6rem 1rem; border-radius: 999px; border: 1px solid #CBD5E1; background: #fff; font-weight: 600; font-size: 0.85rem; color: #334155; cursor: pointer; transition: background-color 0.2s, color 0.2s, border-color 0.2s; }
.fr-chip.on { background: #0A1F44; color: #fff; border-color: #0A1F44; }

/* Sticky mobile CTA */
.fr-sticky { display: none; }
@media (max-width: 768px) {
  .fr-sticky { display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); background: rgba(255,255,255,0.96); backdrop-filter: blur(12px); border-top: 1px solid #E2E8F0; }
  .fr-sticky small { display: block; font-size: 0.65rem; letter-spacing: 0.14em; text-transform: uppercase; color: #64748B; }
  .fr-sticky b { font-size: 1.1rem; color: #0A1F44; }
  .fr-page { padding-bottom: 70px; }
}
`;
