import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, Calendar, MapPin, ArrowRight } from 'lucide-react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SummerCampSuccessPage() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  const orderId = searchParams.get('order_id');
  const paymentMode = searchParams.get('payment_mode');

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!bookingId) { setLoading(false); return; }

    // If it's a Cashfree return, poll for verification
    const verifyAndFetch = async () => {
      try {
        const res = await axios.get(`${API}/summer-camp/verify/${bookingId}`);
        setBooking(res.data.booking);
      } catch {
        // If verify fails, just try to show what we have
      } finally {
        setLoading(false);
      }
    };

    verifyAndFetch();
  }, [bookingId]);

  const isCash = paymentMode === 'cash';

  return (
    <>
      <Helmet>
        <title>Booking Confirmed — Future Skills Summer Camp 2026 | OLL</title>
      </Helmet>

      <div style={{ background: '#080C16', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
        <Navbar />

        <div className="max-w-xl mx-auto px-6 py-16 text-center">
          {loading ? (
            <div style={{ color: '#94A3B8' }}>Verifying your booking...</div>
          ) : (
            <>
              {/* Success icon */}
              <div
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'rgba(0,229,255,0.1)', border: '2px solid #00E5FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  boxShadow: '0 0 40px rgba(0,229,255,0.2)',
                }}
              >
                <CheckCircle style={{ width: 40, height: 40, color: '#00E5FF' }} />
              </div>

              <h1 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 900, color: '#F8FAFC', marginBottom: '0.75rem' }}>
                {isCash ? 'Booking Confirmed!' : 'Payment Successful!'}
              </h1>
              <p style={{ color: '#94A3B8', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
                {isCash
                  ? 'Your spot is reserved. Please pay ₹1,999 at the center on your first day.'
                  : 'Your payment is confirmed and your spot is secured!'}
              </p>

              {booking && (
                <div
                  style={{
                    background: 'rgba(30,58,95,0.3)',
                    border: '1px solid rgba(0,229,255,0.2)',
                    borderRadius: '1.5rem',
                    padding: '1.75rem',
                    marginBottom: '2rem',
                    textAlign: 'left',
                  }}
                >
                  <p style={{ fontSize: '0.7rem', color: '#00E5FF', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '1rem', fontWeight: 700 }}>
                    Booking Details
                  </p>
                  <div className="flex flex-col gap-3">
                    {[
                      ['Booking Ref', booking.booking_ref],
                      ['Child', booking.child_name],
                      ['Camp', `${booking.age_group_label} (Ages ${booking.age_group_ages})`],
                      ['Batch', booking.batch_dates],
                      ['Mode', booking.mode === 'online' ? 'Online at Home' : `At Center — ${booking.center_label}`],
                      ['Amount', isCash ? '₹1,999 (Pay at Center)' : `₹${booking.amount} — PAID`],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.88rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.6rem' }}>
                        <span style={{ color: '#94A3B8', flexShrink: 0 }}>{k}</span>
                        <span style={{ color: '#CBD5E1', fontWeight: 500, textAlign: 'right' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '2rem', lineHeight: 1.6 }}>
                We'll send batch details and joining instructions to your email.<br />
                Questions? Call us at <span style={{ color: '#00E5FF' }}>+91 99209 20188</span>
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/offerings"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '0.8rem 1.5rem', borderRadius: '0.75rem',
                    background: 'rgba(30,58,95,0.4)', border: '1px solid rgba(0,229,255,0.2)',
                    color: '#CBD5E1', fontSize: '0.88rem', fontWeight: 600,
                    textDecoration: 'none', transition: 'all 0.2s',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  Back to Offerings
                </Link>
                <Link
                  to="/"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '0.8rem 1.5rem', borderRadius: '0.75rem',
                    background: '#D63031', color: '#fff',
                    fontSize: '0.88rem', fontWeight: 700,
                    textDecoration: 'none', transition: 'all 0.2s',
                    fontFamily: 'Unbounded, sans-serif',
                    boxShadow: '0 0 20px rgba(214,48,49,0.3)',
                  }}
                >
                  Go to Homepage
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
