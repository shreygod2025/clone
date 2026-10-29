import { useEffect, useState } from 'react';
import axios from 'axios';
import { MapPin, Navigation, Phone } from 'lucide-react';
import { Head } from './FranchiseSections';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Live OLL centres from Admin → Settings → Centres.
export const FrCenters = () => {
  const [centers, setCenters] = useState(null);
  useEffect(() => {
    axios.get(`${API}/future-skills/centers`).then((r) => setCenters(r.data?.centers || [])).catch(() => setCenters([]));
  }, []);
  if (centers && centers.length === 0) return null;
  const cities = new Set((centers || []).map((c) => c.city).filter(Boolean));
  return (
    <section className="fr-sec alt" data-testid="franchise-centers">
      <div className="fr-wrap">
        <Head a="OLL Centers" b="Already Running." sub={centers ? `${centers.length} live centers across ${cities.size} ${cities.size === 1 ? 'city' : 'cities'} — your center joins a growing network.` : 'Loading our growing network…'} />
        <div className="fr-centers" data-testid="franchise-centers-list">
          {(centers || []).map((c, i) => (
            <div key={c.id} className={`fr-center ${i % 2 ? 'red' : ''}`} data-testid={`franchise-center-${c.id}`}>
              <div className="fr-center-top">
                <span className="fr-center-pin"><MapPin size={18} /></span>
                <div>
                  <h3>{c.name}</h3>
                  <p>{[c.area, c.city].filter(Boolean).join(', ')}</p>
                </div>
              </div>
              {c.address && <p className="fr-center-addr">{c.address}</p>}
              <div className="fr-center-actions">
                {c.google_maps_link && <a href={c.google_maps_link} target="_blank" rel="noreferrer" data-testid={`franchise-center-map-${c.id}`}><Navigation size={13} /> Directions</a>}
                {c.contact_phone && <a href={`tel:${c.contact_phone.replace(/\s/g, '')}`} data-testid={`franchise-center-call-${c.id}`}><Phone size={13} /> Call</a>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
