import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, Calendar, MapPin, Clock, LogOut, Phone, MessageCircle, Home } from 'lucide-react';
import { useUserAuth } from '../context/UserAuthContext';

const JB = "'JetBrains Mono', monospace";
const NU = "'Nunito Sans', sans-serif";

const SESSION_DATES = {
  week1: [
    { day: 'MON', date: 'May 4, 2026' },
    { day: 'TUE', date: 'May 5, 2026' },
    { day: 'WED', date: 'May 6, 2026' },
    { day: 'THU', date: 'May 7, 2026' },
    { day: 'FRI', date: 'May 8, 2026' },
  ],
  week2: [
    { day: 'MON', date: 'May 11, 2026' },
    { day: 'TUE', date: 'May 12, 2026' },
    { day: 'WED', date: 'May 13, 2026' },
    { day: 'THU', date: 'May 14, 2026' },
    { day: 'FRI', date: 'May 15, 2026' },
  ],
  week3: [
    { day: 'MON', date: 'May 18, 2026' },
    { day: 'TUE', date: 'May 19, 2026' },
    { day: 'WED', date: 'May 20, 2026' },
    { day: 'THU', date: 'May 21, 2026' },
    { day: 'FRI', date: 'May 22, 2026' },
  ],
  week4: [
    { day: 'MON', date: 'May 25, 2026' },
    { day: 'TUE', date: 'May 26, 2026' },
    { day: 'WED', date: 'May 27, 2026' },
    { day: 'THU', date: 'May 28, 2026' },
    { day: 'FRI', date: 'May 29, 2026' },
  ],
};

const BATCH_LABELS = { week1: 'Batch 1', week2: 'Batch 2', week3: 'Batch 3', week4: 'Batch 4' };
const AGE_GROUP_TIMINGS = {
  explorers:  '12:00 PM – 2:00 PM',
  creators:   '2:30 PM – 4:30 PM',
  innovators: '5:00 PM – 7:00 PM',
};

const STATUS_MAP = {
  converted:       { label: 'Paid Online',     color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
  payment_offline: { label: 'Pay at Center',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
};

export default function SummerCampPortalPage() {
  const { user, logout } = useUserAuth();
  const navigate = useNavigate();

  // Redirect if not logged in as summer_camp
  useEffect(() => {
    if (!user || user.user_type !== 'summer_camp') {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  const booking = user?.user;
  const sessions = booking ? (SESSION_DATES[booking.batch_week] || []) : [];
  const sessionTime = booking ? (AGE_GROUP_TIMINGS[booking.age_group] || '—') : '—';
  const firstSessionDate = sessions.length > 0 ? sessions[0].date.split(', ')[0].replace(/\w+ /, m => m) : '';
  // Extract just "Month Day" portion e.g. "May 4" from "May 4, 2026"
  const day1Label = sessions.length > 0 ? sessions[0].date.replace(/, \d{4}$/, '') : 'Day 1';
  const status = STATUS_MAP[booking?.crm_status] || STATUS_MAP['payment_offline'];
  const isCash = booking?.payment_mode === 'cash' || booking?.crm_status === 'payment_offline';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!booking) return null;

  return (
    <>
      <Helmet>
        <title>My Booking — Future Skills Summer Camp 2026 | OLL</title>
      </Helmet>

      <div style={{ background: '#080C16', minHeight: '100vh', fontFamily: NU, color: '#F8FAFC' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(0,229,255,0.1)', padding: '0.9rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 40, background: 'rgba(8,12,22,0.93)' }}>
          <button
            onClick={() => navigate('/summer-camp')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#F8FAFC', fontFamily: JB, fontWeight: 700, fontSize: '0.88rem' }}
          >
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home style={{ width: 14, height: 14 }} />
            </span>
            Summer Camp 2026
          </button>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(214,48,49,0.08)', border: '1px solid rgba(214,48,49,0.2)', borderRadius: '0.6rem', padding: '0.4rem 0.85rem', cursor: 'pointer', color: '#FF6B6B', fontFamily: JB, fontWeight: 700, fontSize: '0.78rem' }}
            data-testid="portal-logout-btn"
          >
            <LogOut style={{ width: 13, height: 13 }} />
            Logout
          </button>
        </div>

        <div style={{ maxWidth: 600, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
          {/* Welcome */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.25rem' }}>
              <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.15) 0%, transparent 70%)', animation: 'pulse 2s ease-in-out infinite' }} />
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,229,255,0.07)', border: '2px solid rgba(0,229,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <CheckCircle style={{ width: 40, height: 40, color: '#00E5FF' }} />
              </div>
            </div>
            <h1 style={{ fontFamily: JB, fontSize: 'clamp(1.5rem,5vw,2rem)', fontWeight: 900, color: '#F8FAFC', marginBottom: '0.5rem', lineHeight: 1.2 }}>
              Welcome back!
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.95rem', fontFamily: NU, fontWeight: 500 }}>
              {booking.child_name ? `Here's ${booking.child_name}'s Summer Camp booking.` : "Here's your Summer Camp booking."}
            </p>
          </div>

          {/* Booking Ref + Status */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {booking.booking_ref && (
              <div style={{ background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '0.65rem', padding: '0.45rem 1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: JB, fontSize: '0.65rem', letterSpacing: '0.16em', color: '#475569', textTransform: 'uppercase' }}>Ref</span>
                <span style={{ fontFamily: JB, fontWeight: 800, fontSize: '0.92rem', color: '#00E5FF' }}>{booking.booking_ref}</span>
              </div>
            )}
            <div style={{ background: status.bg, border: `1px solid ${status.border}`, borderRadius: '0.65rem', padding: '0.45rem 1.1rem' }}>
              <span style={{ fontFamily: JB, fontWeight: 700, fontSize: '0.78rem', color: status.color, letterSpacing: '0.08em' }}>{status.label}</span>
            </div>
          </div>

          {/* Booking Details */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.25rem', overflow: 'hidden', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.7rem 1.25rem', background: 'rgba(0,229,255,0.05)', borderBottom: '1px solid rgba(0,229,255,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar style={{ width: 14, height: 14, color: '#00E5FF' }} />
              <span style={{ fontFamily: JB, fontSize: '0.65rem', letterSpacing: '0.2em', color: '#00E5FF', textTransform: 'uppercase', fontWeight: 700 }}>Booking Details</span>
            </div>
            <div style={{ padding: '0 1.25rem' }}>
              {[
                ["Child's Name", booking.child_name || '—'],
                ['Age Group', booking.age_group_label ? `${booking.age_group_label} (Ages ${booking.age_group_ages})` : '—'],
                ['Batch', booking.batch_dates ? `${BATCH_LABELS[booking.batch_week] || ''} — ${booking.batch_dates}` : '—'],
                ['Location', booking.center_label || '—'],
                ['Amount', isCash ? '₹1,999 (Pay at Center on Day 1)' : '₹1,999 — PAID'],
              ].map(([k, v], i, arr) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '0.85rem 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: JB, fontSize: '0.68rem', letterSpacing: '0.1em', color: '#475569', textTransform: 'uppercase', flexShrink: 0, fontWeight: 600 }}>{k}</span>
                  <span style={{ color: '#CBD5E1', fontSize: '0.9rem', fontFamily: NU, fontWeight: 600, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Session Schedule */}
          {sessions.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.25rem', overflow: 'hidden', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.7rem 1.25rem', background: 'rgba(214,48,49,0.06)', borderBottom: '1px solid rgba(214,48,49,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock style={{ width: 14, height: 14, color: '#D63031' }} />
                <span style={{ fontFamily: JB, fontSize: '0.65rem', letterSpacing: '0.2em', color: '#D63031', textTransform: 'uppercase', fontWeight: 700 }}>Session Schedule</span>
                <span style={{ marginLeft: 'auto', fontFamily: JB, fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>{sessionTime}</span>
              </div>
              <div style={{ padding: '0 1.25rem' }}>
                {sessions.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: i < sessions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 28, borderRadius: '0.4rem', background: 'rgba(214,48,49,0.08)', border: '1px solid rgba(214,48,49,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: JB, fontSize: '0.6rem', fontWeight: 800, color: '#D63031' }}>{s.day}</span>
                      </div>
                      <span style={{ fontFamily: NU, fontSize: '0.9rem', color: '#CBD5E1', fontWeight: 600 }}>{s.date}</span>
                    </div>
                    <span style={{ fontFamily: JB, fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>{sessionTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Center info */}
          {booking.center_label && (
            <div style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <MapPin style={{ width: 20, height: 20, color: '#00E5FF', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontFamily: JB, fontWeight: 700, fontSize: '0.88rem', color: '#00E5FF', marginBottom: '0.25rem' }}>{booking.center_label}</p>
                <p style={{ fontFamily: NU, fontSize: '0.83rem', color: '#64748B', lineHeight: 1.5, fontWeight: 500 }}>
                  Please arrive 10 minutes before {sessionTime.split('–')[0].trim()} on Day 1 ({day1Label}).{isCash ? ' Carry ₹1,999 in cash or UPI for payment.' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Support */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1rem', padding: '1.1rem 1.25rem', marginBottom: '2rem' }}>
            <p style={{ fontFamily: JB, fontSize: '0.63rem', letterSpacing: '0.18em', color: '#475569', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.8rem' }}>Need Help?</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <a href="https://wa.me/919920188188" target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', borderRadius: '0.6rem', background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.18)', color: '#25D366', textDecoration: 'none', fontFamily: JB, fontWeight: 700, fontSize: '0.8rem' }}
              >
                <MessageCircle style={{ width: 14, height: 14 }} />
                WhatsApp Us
              </a>
              <a href="tel:+919920188188"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', borderRadius: '0.6rem', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)', color: '#00E5FF', textDecoration: 'none', fontFamily: JB, fontWeight: 700, fontSize: '0.8rem' }}
              >
                <Phone style={{ width: 14, height: 14 }} />
                +91 9920188188
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&family=Nunito+Sans:wght@400;500;600;700&display=swap');
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
      `}</style>
    </>
  );
}
