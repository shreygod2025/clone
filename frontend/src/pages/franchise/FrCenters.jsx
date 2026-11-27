import { useEffect, useState } from 'react';
import axios from 'axios';
import { MapPin, Navigation, Phone } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CSS = `
@keyframes frc-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
.frc-wrap { position: relative; overflow: hidden; padding: 10px 0; mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent); }
.frc-track { display: inline-flex; gap: 1rem; padding: 4px 1rem; width: max-content; animation: frc-scroll 45s linear infinite; will-change: transform; }
.frc-track:hover { animation-play-state: paused; }
.frc-card { flex-shrink: 0; width: 290px; display: flex; flex-direction: column; background: #fff; border: 1px solid #E2E8F0; border-radius: 18px; padding: 1.1rem 1.2rem; box-shadow: 0 14px 30px rgba(10,31,68,0.08); transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; font-family: 'Proxima Nova','Montserrat',sans-serif; }
.frc-card:hover { transform: translateY(-4px); border-color: #DC2626; box-shadow: 0 22px 44px rgba(10,31,68,0.16); }
.frc-top { display: flex; gap: 0.7rem; align-items: flex-start; }
.frc-pin { flex-shrink: 0; width: 38px; height: 38px; border-radius: 50%; background: #FEE2E2; color: #DC2626; display: inline-flex; align-items: center; justify-content: center; }
.frc-card:nth-child(even) .frc-pin { background: #DBEAFE; color: #1D4ED8; }
.frc-name { font-weight: 800; font-size: 1rem; color: #0A1F44; line-height: 1.2; }
.frc-loc { font-size: 0.78rem; font-weight: 700; color: #DC2626; margin-top: 2px; }
.frc-addr { font-size: 0.8rem; color: #64748B; margin-top: 0.6rem; line-height: 1.5; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.frc-actions { display: flex; gap: 0.45rem; margin-top: 0.8rem; }
.frc-actions a { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #0A1F44; text-decoration: none; border: 1px solid #CBD5E1; transition: background-color 0.2s, color 0.2s, border-color 0.2s; }
.frc-actions a:hover { background: #0A1F44; color: #fff; border-color: #0A1F44; }
@media (max-width: 640px) { .frc-card { width: 240px; } }
`;

// Live OLL centres (Admin → Settings → Centres) as an auto-scrolling ribbon in the white classroom section.
export const FrCenters = () => {
  const [centers, setCenters] = useState([]);
  useEffect(() => {
    axios.get(`${API}/future-skills/centers`).then((r) => setCenters(r.data?.centers || [])).catch(() => {});
  }, []);
  if (!centers.length) return null;
  const cities = new Set(centers.map((c) => c.city).filter(Boolean));
  const loop = centers.length > 2 ? [...centers, ...centers] : centers;
  return (
    <div data-testid="franchise-centers" style={{ marginTop: '3.5rem' }}>
      <style>{CSS}</style>
      <div style={{ textAlign: 'center', padding: '0 1.5rem', marginBottom: '1.25rem' }}>
        <div className="home-script-heading" style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.3rem)' }}>OLL Centers</div>
        <h3 className="home-h2" style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.4rem)', marginTop: 0 }}>Already running.</h3>
        <p className="home-sub" style={{ marginTop: '0.5rem' }}>{centers.length} live centers across {cities.size} {cities.size === 1 ? 'city' : 'cities'} — your center joins a growing network.</p>
      </div>
      <div className="frc-wrap" data-testid="franchise-centers-list">
        <div className="frc-track" style={centers.length > 2 ? undefined : { animation: 'none', margin: '0 auto' }}>
          {loop.map((c, i) => (
            <div key={`${c.id}-${i}`} className="frc-card" data-testid={i < centers.length ? `franchise-center-${c.id}` : undefined}>
              <div className="frc-top">
                <span className="frc-pin"><MapPin size={17} /></span>
                <div>
                  <div className="frc-name">{c.name}</div>
                  <div className="frc-loc">{[c.area, c.city].filter(Boolean).join(', ')}</div>
                </div>
              </div>
              {c.address && <p className="frc-addr">{c.address}</p>}
              <div className="frc-actions">
                {c.google_maps_link && <a href={c.google_maps_link} target="_blank" rel="noreferrer"><Navigation size={12} /> Directions</a>}
                {c.contact_phone && <a href={`tel:${c.contact_phone.replace(/\s/g, '')}`}><Phone size={12} /> Call</a>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
