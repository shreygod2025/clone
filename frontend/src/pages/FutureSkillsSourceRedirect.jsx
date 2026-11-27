import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Landing on `/future-skills/s/<slug>` records a view for the source link
 * and forwards the visitor to the main Future Skills landing page with the
 * slug preserved as `?ref=<slug>` so the eventual trial-booking payload
 * carries `source_ref = <slug>`.
 */
const FutureSkillsSourceRedirect = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) { navigate('/future-skills', { replace: true }); return; }
    // Fire-and-forget view tracking. We still redirect even if it fails so
    // marketing links never appear broken to a real user.
    axios.get(`${API}/public/future-skills/source-links/${encodeURIComponent(slug)}`)
      .catch(() => {});
    try { window.localStorage.setItem('fs_source_ref', slug); } catch (_) { /* ignore */ }
    navigate(`/future-skills?ref=${encodeURIComponent(slug)}`, { replace: true });
  }, [slug, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
      Redirecting…
    </div>
  );
};

export default FutureSkillsSourceRedirect;
