import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, Loader2, Instagram, Youtube, ArrowRight, Home, Calendar, Phone, Shield } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const JB = "'JetBrains Mono', monospace";
const NU = "'Nunito Sans', sans-serif";
const LIME = '#CCFF00';
const GREEN = '#00FF66';
const BG = '#050505';

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.8rem 0', borderBottom: '1px solid #1A1A1A' }}>
      <span style={{ fontFamily: JB, fontSize: '0.72rem', color: '#71717A', letterSpacing: '0.12em', textTransform: 'uppercase', minWidth: 90 }}>{k}</span>
      <span style={{ fontFamily: NU, fontSize: '0.92rem', color: '#F4F4F5', fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>{v || '—'}</span>
    </div>
  );
}

export default function SocialMediaInternSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const leadId = params.get('lead_id');

  const [lead, setLead] = useState(null);
  const [status, setStatus] = useState('VERIFYING');
  const [loading, setLoading] = useState(true);
  const attempts = useRef(0);
  const interval = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!leadId) { setLoading(false); setStatus('NOT_FOUND'); return; }

    const verify = async () => {
      try {
        const res = await axios.get(`${API}/social-media-intern/verify/${leadId}`);
        setLead(res.data.lead);
        setStatus(res.data.status);
        if (res.data.status === 'PAID' || res.data.lead?.crm_status === 'converted' || res.data.lead?.crm_status === 'seat_reserved') {
          clearInterval(interval.current);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
      attempts.current += 1;
      if (attempts.current >= 10) clearInterval(interval.current);
    };

    verify();
    interval.current = setInterval(verify, 3000);
    return () => clearInterval(interval.current);
  }, [leadId]);

  const isPaid = status === 'PAID' || lead?.crm_status === 'converted' || lead?.crm_status === 'seat_reserved';
  const isReserve = lead?.payment_mode === 'seat_reserve' || lead?.crm_status === 'seat_reserved';

  return (
    <>
      <Helmet>
        <title>{isPaid ? 'Registration Confirmed' : 'Verifying Payment'} — Social Media Internship | OLL</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800;900&family=Nunito+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Helmet>

      <div style={{ background: BG, minHeight: '100vh', fontFamily: NU, color: '#F4F4F5' }}>

        {/* Header */}
        <header style={{ borderBottom: '1px solid #1A1A1A', padding: '1rem 1.5rem' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: JB, fontWeight: 800, fontSize: '0.85rem', color: LIME, letterSpacing: '0.15em', textTransform: 'uppercase' }}>OLL · Social Media Intern</span>
            <button onClick={() => navigate('/')} data-testid="home-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', fontFamily: NU, fontSize: '0.85rem' }}>
              <Home style={{ width: 14, height: 14 }} /> Home
            </button>
          </div>
        </header>

        <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

          {loading && (
            <div data-testid="loading-state" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <Loader2 style={{ width: 32, height: 32, color: LIME, animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
              <p style={{ fontFamily: JB, color: LIME, fontSize: '0.85rem', letterSpacing: '0.1em' }}>LOADING...</p>
            </div>
          )}

          {!loading && !lead && (
            <div data-testid="not-found" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <h1 style={{ fontFamily: JB, fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem' }}>Registration Not Found</h1>
              <p style={{ color: '#71717A', marginBottom: '2rem' }}>We couldn't find your registration. Please try applying again.</p>
              <button onClick={() => navigate('/social-media-intern')} style={{ background: LIME, color: '#000', fontFamily: JB, fontWeight: 800, padding: '0.9rem 2rem', border: 'none', borderRadius: 4, cursor: 'pointer', letterSpacing: '0.05em' }}>
                Back to Landing
              </button>
            </div>
          )}

          {!loading && lead && !isPaid && (
            <div data-testid="verifying-state" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Loader2 style={{ width: 40, height: 40, color: LIME, animation: 'spin 1s linear infinite', marginBottom: '1.5rem' }} />
              <h1 style={{ fontFamily: JB, fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.75rem' }}>Verifying Payment...</h1>
              <p style={{ color: '#A1A1AA', fontSize: '0.95rem', lineHeight: 1.65, maxWidth: 420, margin: '0 auto' }}>
                This may take a few seconds. If your payment was successful, you'll see confirmation here shortly.
              </p>
              <div style={{ marginTop: '2rem', fontFamily: JB, fontSize: '0.72rem', color: '#52525B', letterSpacing: '0.1em' }}>
                REF: {lead?.booking_ref || '—'}
              </div>
            </div>
          )}

          {!loading && lead && isPaid && (
            <div data-testid="success-state">
              {/* Success Badge */}
              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: '50%', background: `radial-gradient(circle, rgba(204,255,0,0.2), transparent)`, border: `2px solid ${LIME}`, marginBottom: '1.25rem', boxShadow: `0 0 40px ${LIME}40` }}>
                  <Check style={{ width: 36, height: 36, color: LIME }} strokeWidth={3} />
                </div>
                <div style={{ display: 'inline-block', background: 'rgba(204,255,0,0.08)', border: `1px solid ${LIME}`, color: LIME, fontFamily: JB, fontWeight: 800, fontSize: '0.7rem', padding: '4px 14px', borderRadius: 4, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
                  {isReserve ? 'SEAT RESERVED' : 'REGISTRATION CONFIRMED'}
                </div>
                <h1 style={{ fontFamily: JB, fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '0.75rem' }}>
                  Welcome aboard,<br /><span style={{ color: LIME }}>{(lead?.student_name || '').split(' ')[0] || 'Future Creator'}.</span>
                </h1>
                <p style={{ color: '#A1A1AA', fontFamily: NU, fontSize: '1rem', lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
                  {isReserve
                    ? `Your seat is locked. Pay the remaining ₹${(19900 - 2000).toLocaleString('en-IN')} at the center on your first day.`
                    : 'Your Social Media Internship Readiness journey starts here. Batch details will be sent on WhatsApp.'}
                </p>
              </div>

              {/* Details card */}
              <div style={{ background: '#0F0F0F', border: `1px solid ${LIME}40`, borderRadius: 8, padding: '1.5rem 1.75rem', marginBottom: '1.5rem', boxShadow: `0 0 40px rgba(204,255,0,0.04)` }}>
                <h2 style={{ fontFamily: JB, fontSize: '0.78rem', fontWeight: 800, color: LIME, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Booking Details</h2>
                <Row k="Ref" v={<span style={{ color: LIME, fontFamily: JB }}>{lead.booking_ref}</span>} />
                <Row k="Student" v={lead.student_name} />
                <Row k="Age" v={lead.age ? `${lead.age} years` : '—'} />
                <Row k="School" v={lead.school_name} />
                <Row k="Mode" v={<span style={{ textTransform: 'capitalize' }}>{lead.mode || 'Offline'}</span>} />
                <Row k="Phone" v={`+91 ${lead.phone}`} />
                {lead.amount_paid && <Row k="Paid" v={<span style={{ color: GREEN }}>₹{Number(lead.amount_paid).toLocaleString('en-IN')}</span>} />}
                {isReserve && <Row k="Balance" v={<span style={{ color: '#F59E0B' }}>₹{Number(lead.amount_due || 17900).toLocaleString('en-IN')} (at center)</span>} />}
                {lead.instagram_link && <Row k="Instagram" v={<a href={lead.instagram_link.startsWith('http') ? lead.instagram_link : `https://instagram.com/${lead.instagram_link.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ color: LIME, textDecoration: 'none' }}><Instagram style={{ width: 12, height: 12, display: 'inline-block', marginRight: 4 }} />{lead.instagram_link}</a>} />}
                {lead.youtube_link && <Row k="YouTube" v={<a href={lead.youtube_link.startsWith('http') ? lead.youtube_link : `https://youtube.com/${lead.youtube_link}`} target="_blank" rel="noreferrer" style={{ color: LIME, textDecoration: 'none' }}><Youtube style={{ width: 12, height: 12, display: 'inline-block', marginRight: 4 }} />{lead.youtube_link}</a>} />}
              </div>

              {/* Next steps */}
              <div style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: 8, padding: '1.5rem 1.75rem', marginBottom: '2rem' }}>
                <h2 style={{ fontFamily: JB, fontSize: '0.78rem', fontWeight: 800, color: GREEN, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '1rem' }}>What Happens Next</h2>
                <ol style={{ paddingLeft: '1.1rem', color: '#D4D4D8', fontFamily: NU, fontSize: '0.93rem', lineHeight: 1.9, listStyle: 'none' }}>
                  {[
                    'Our team will call you within 24 hours to confirm your batch',
                    'You\'ll receive WhatsApp updates with batch schedule & location',
                    'Come to Day 1 with a smartphone (any model works)',
                    'Start creating. Get placed. Earn your first stipend.',
                  ].map((t, i) => (
                    <li key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                      <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,255,102,0.1)', color: GREEN, fontFamily: JB, fontWeight: 800, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* CTAs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <a href="tel:+919920188188" data-testid="call-btn" style={{ flex: 1, minWidth: 200, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'transparent', color: '#F4F4F5', fontFamily: JB, fontWeight: 700, fontSize: '0.85rem', padding: '0.95rem 1.5rem', borderRadius: 4, border: '1px solid #27272A', textDecoration: 'none', letterSpacing: '0.05em' }}>
                  <Phone style={{ width: 14, height: 14 }} /> Call +91 99201 88188
                </a>
                <button onClick={() => navigate('/')} data-testid="home-cta-btn" style={{ flex: 1, minWidth: 200, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: LIME, color: '#000', fontFamily: JB, fontWeight: 800, fontSize: '0.9rem', padding: '0.95rem 1.5rem', borderRadius: 4, border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}>
                  Back to Home <ArrowRight style={{ width: 15, height: 15 }} />
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '2rem', fontFamily: JB, fontSize: '0.7rem', color: '#52525B', letterSpacing: '0.08em' }}>
                <Shield style={{ width: 11, height: 11, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
                PAYMENT SECURED VIA CASHFREE
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
