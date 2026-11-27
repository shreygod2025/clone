import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  CheckCircle, Calendar, MapPin, Clock, Download,
  Phone, ArrowLeft, Home, MessageCircle, Wifi,
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const JB = "'JetBrains Mono', monospace";
const NU = "'Nunito Sans', sans-serif";

const SESSION_DATES = {
  week1: [
    { day: 'Mon', date: 'May 4, 2026' },
    { day: 'Tue', date: 'May 5, 2026' },
    { day: 'Wed', date: 'May 6, 2026' },
    { day: 'Thu', date: 'May 7, 2026' },
    { day: 'Fri', date: 'May 8, 2026' },
  ],
  week2: [
    { day: 'Mon', date: 'May 11, 2026' },
    { day: 'Tue', date: 'May 12, 2026' },
    { day: 'Wed', date: 'May 13, 2026' },
    { day: 'Thu', date: 'May 14, 2026' },
    { day: 'Fri', date: 'May 15, 2026' },
  ],
  week3: [
    { day: 'Mon', date: 'May 18, 2026' },
    { day: 'Tue', date: 'May 19, 2026' },
    { day: 'Wed', date: 'May 20, 2026' },
    { day: 'Thu', date: 'May 21, 2026' },
    { day: 'Fri', date: 'May 22, 2026' },
  ],
  week4: [
    { day: 'Mon', date: 'May 25, 2026' },
    { day: 'Tue', date: 'May 26, 2026' },
    { day: 'Wed', date: 'May 27, 2026' },
    { day: 'Thu', date: 'May 28, 2026' },
    { day: 'Fri', date: 'May 29, 2026' },
  ],
};

const AGE_GROUP_TIMINGS = {
  explorers:  '12:00 PM – 2:00 PM',
  creators:   '2:30 PM – 4:30 PM',
  innovators: '5:00 PM – 7:00 PM',
};
const BATCH_LABELS = {
  week1: 'Batch 1', week2: 'Batch 2', week3: 'Batch 3', week4: 'Batch 4',
};

// ── Calendar Helpers ─────────────────────────────────────────────────────────
function parseTimeToHM(timeStr) {
  const [time, period] = timeStr.trim().split(' ');
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return { h, m };
}

function parseDateToYMD(dateStr) {
  const MONTHS = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06',
                   Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
  const parts = dateStr.replace(',', '').split(' ');
  return `${parts[2]}${MONTHS[parts[0]] || '01'}${parts[1].padStart(2, '0')}`;
}

function fmtDT(dateStr, h, m) {
  return `${parseDateToYMD(dateStr)}T${String(h).padStart(2,'0')}${String(m).padStart(2,'0')}00`;
}

function generateGoogleCalendarUrl(booking, sessions, sessionTime) {
  if (!sessions || !sessions.length) return '#';
  const [startStr, endStr] = sessionTime.split('–').map(s => s.trim());
  const start = parseTimeToHM(startStr);
  const end   = parseTimeToHM(endStr);
  const title    = `OLL Summer Camp 2026 — ${booking.age_group_label || ''}`;
  const location = booking.mode === 'online' ? 'Online (Zoom/Google Meet)' : (booking.center_label || '');
  const details  = `OLL Future Skills Summer Camp 2026\nAge Group: ${booking.age_group_label} (Ages ${booking.age_group_ages})\nBatch: ${BATCH_LABELS[booking.batch_week] || ''}\nTiming: ${sessionTime} (Mon–Fri)\nBooking Ref: ${booking.booking_ref}\n\nFor queries: info@oll.co | +91 9920188188`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmtDT(sessions[0].date, start.h, start.m)}/${fmtDT(sessions[0].date, end.h, end.m)}`,
    recur: 'RRULE:FREQ=DAILY;COUNT=5',
    details,
    location,
    ctz: 'Asia/Kolkata',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadICSFile(booking, sessions, sessionTime) {
  if (!sessions || !sessions.length) return;
  const [startStr, endStr] = sessionTime.split('–').map(s => s.trim());
  const start = parseTimeToHM(startStr);
  const end   = parseTimeToHM(endStr);
  const title    = `OLL Summer Camp 2026 — ${booking.age_group_label || booking.age_group}`;
  const location = booking.mode === 'online' ? 'Online (Zoom/Google Meet)' : (booking.center_label || '');
  const desc     = `OLL Future Skills Summer Camp 2026 | Age: ${booking.age_group_label} (Ages ${booking.age_group_ages}) | Timing: ${sessionTime} | Ref: ${booking.booking_ref} | info@oll.co`;
  const now      = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

  const events = sessions.map((s, i) => [
    'BEGIN:VEVENT',
    `DTSTART;TZID=Asia/Kolkata:${fmtDT(s.date, start.h, start.m)}`,
    `DTEND;TZID=Asia/Kolkata:${fmtDT(s.date, end.h, end.m)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${location}`,
    `UID:oll-camp-${booking.booking_ref}-d${i + 1}@oll.co`,
    `DTSTAMP:${now}`,
    'END:VEVENT',
  ].join('\r\n')).join('\r\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OLL//Future Skills Summer Camp 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    events,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `OLL_SummerCamp_${booking.booking_ref || 'sessions'}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadSummerCampReceipt(booking, isCash) {
  const sessionTime = AGE_GROUP_TIMINGS[booking.age_group] || '—';
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();
  const margin = 18;
  const cw = pw - margin * 2;
  let y = 0;

  // ── Navy header ──────────────────────────────────────────────
  doc.setFillColor(8, 12, 22);
  doc.rect(0, 0, pw, 44, 'F');
  // Cyan left accent bar
  doc.setFillColor(0, 229, 255);
  doc.rect(0, 0, 4, 44, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('OLL', margin + 6, 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 229, 255);
  doc.text('FUTURE SKILLS SUMMER CAMP 2026', margin + 6, 23);
  doc.setTextColor(148, 163, 184);
  doc.text('One Learner at a time, One Life skill at a time', margin + 6, 30);

  // Receipt label right
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOKING RECEIPT', pw - margin, 18, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Ref: ${booking.booking_ref || 'N/A'}`, pw - margin, 26, { align: 'right' });
  const genDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Generated: ${genDate}`, pw - margin, 33, { align: 'right' });

  y = 54;

  // ── Status pill ──────────────────────────────────────────────
  if (!isCash) {
    doc.setFillColor(0, 200, 83);
    doc.roundedRect(margin, y - 6, 28, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID', margin + 14, y - 0.5, { align: 'center' });
  } else {
    doc.setFillColor(234, 88, 12);
    doc.roundedRect(margin, y - 6, 44, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PAY AT CENTER', margin + 22, y - 0.5, { align: 'center' });
  }

  y += 10;

  // ── Child / Registration details box ─────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, cw, 38, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Registration Details', margin + 6, y + 8);

  const leftC = margin + 6;
  const rightC = margin + cw / 2 + 6;
  let ry = y + 17;
  const row = (label, val, x, rowY) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(String(val || '—'), x + 28, rowY);
  };

  row("Child's Name:", booking.child_name || '—', leftC, ry);
  row('Phone:', booking.parent_phone || '—', rightC, ry);
  ry += 8;
  row('Age Group:', `${booking.age_group_label || ''} (Ages ${booking.age_group_ages || ''})`, leftC, ry);
  row('Email:', booking.parent_email || '—', rightC, ry);

  y += 46;

  // ── Camp details box ─────────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, cw, 40, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Camp Details', margin + 6, y + 8);

  ry = y + 17;
  const batchLabel = BATCH_LABELS[booking.batch_week] || booking.batch_week || '—';
  row('Batch:', `${batchLabel} — ${booking.batch_dates || ''}`, leftC, ry);
  const modeDisplay = booking.mode === 'online' ? 'Online at Home' : `At Center — ${booking.center_label || ''}`;
  row('Mode:', modeDisplay, leftC, ry + 8);
  row('Timings:', `${sessionTime} (Mon – Fri)`, rightC, ry);
  row('Booking Ref:', booking.booking_ref || '—', rightC, ry + 8);

  y += 48;

  // ── Session schedule ─────────────────────────────────────────
  const sessions = SESSION_DATES[booking.batch_week] || [];
  if (sessions.length > 0) {
    doc.setFillColor(0, 229, 255);
    doc.roundedRect(margin, y, cw, 8, 2, 2, 'F');
    doc.setTextColor(8, 12, 22);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('SESSION SCHEDULE', margin + 6, y + 5.5);

    y += 10;
    doc.setDrawColor(226, 232, 240);

    sessions.forEach((s, i) => {
      const rowBg = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
      doc.setFillColor(...rowBg);
      doc.rect(margin, y, cw, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(`${s.day}  ${s.date}`, margin + 6, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(sessionTime, pw - margin - 6, y + 5.5, { align: 'right' });
      y += 8;
    });
    y += 4;
  }

  // ── Amount summary bar ───────────────────────────────────────
  doc.setFillColor(30, 58, 95);
  doc.roundedRect(margin, y, cw, 16, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const isSeatReservePdf = booking.payment_mode === 'seat_reserve';
  if (isSeatReservePdf) {
    doc.text('Deposit Paid (Seat Reserved)', margin + 8, y + 7);
    doc.text('Rs. 500', pw - margin - 8, y + 7, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Balance Due at Center on Day 1:', margin + 8, y + 13);
    doc.text('Rs. 1,499', pw - margin - 8, y + 13, { align: 'right' });
  } else {
    doc.text(isCash ? 'Amount Due (Pay at Center)' : 'Total Paid', margin + 8, y + 10.5);
    doc.text('Rs. 1,999', pw - margin - 8, y + 10.5, { align: 'right' });
  }

  y += 22;

  // ── Footer ───────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pw - margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated receipt. For any queries contact: info@oll.co | +91 9920188188', pw / 2, y, { align: 'center' });
  y += 4;
  doc.text('OLL — One Learner at a time, One Life skill at a time | www.oll.co', pw / 2, y, { align: 'center' });

  const fname = `OLL_SummerCamp_Receipt_${(booking.child_name || 'booking').replace(/\s+/g, '_')}_${booking.booking_ref || 'SC2026'}.pdf`;
  doc.save(fname);
}

export default function SummerCampSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('booking_id');
  const paymentMode = searchParams.get('payment_mode');

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const checkInterval = useRef(null);
  const attempts = useRef(0);

  const isCash = paymentMode === 'cash';
  const isSeatReserve = booking?.payment_mode === 'seat_reserve';

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!bookingId) { setLoading(false); return; }

    const verify = async () => {
      try {
        const res = await axios.get(`${API}/summer-camp/verify/${bookingId}`);
        const b = res.data.booking;
        setBooking(b);
        if (res.data.status === 'PAID' || b?.payment_status === 'paid' || b?.payment_status === 'partial' || isCash) {
          setVerified(true);
          clearInterval(checkInterval.current);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
      attempts.current += 1;
      if (attempts.current >= 8) clearInterval(checkInterval.current);
    };

    // Poll up to 8× (every 3s = 24s total) while waiting for Cashfree to confirm
    verify();
    checkInterval.current = setInterval(verify, 3000);
    return () => clearInterval(checkInterval.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, isCash]);

  const sessions = booking ? (SESSION_DATES[booking.batch_week] || []) : [];
  const sessionTime = booking ? (AGE_GROUP_TIMINGS[booking.age_group] || '—') : '—';

  return (
    <>
      <Helmet>
        <title>Booking Confirmed — Future Skills Summer Camp 2026 | OLL</title>
      </Helmet>

      <div style={{ background: '#080C16', minHeight: '100vh', fontFamily: NU, color: '#F8FAFC' }}>
        {/* ── Header ── */}
        <div style={{
          borderBottom: '1px solid rgba(0,229,255,0.1)', padding: '0.9rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 40,
          background: 'rgba(8,12,22,0.93)',
        }}>
          <button
            onClick={() => navigate('/summer-camp')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#F8FAFC', fontFamily: JB, fontWeight: 700, fontSize: '0.88rem' }}
          >
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft style={{ width: 14, height: 14 }} />
            </span>
            Summer Camp 2026
          </button>
          <span style={{ fontFamily: JB, fontSize: '0.78rem', color: '#475569', fontWeight: 600, letterSpacing: '0.1em' }}>OLL</span>
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

          {loading ? (
            <div style={{ textAlign: 'center', paddingTop: '5rem' }}>
              <div style={{ display: 'inline-block', width: 48, height: 48, border: '3px solid rgba(0,229,255,0.15)', borderTopColor: '#00E5FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: '#64748B', fontFamily: JB, fontSize: '0.85rem', marginTop: '1.25rem', letterSpacing: '0.1em' }}>Verifying your booking...</p>
            </div>
          ) : (
            <>
              {/* ── Success Icon ── */}
              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
                  {/* Glow ring */}
                  <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.18) 0%, transparent 70%)', animation: 'pulse 2s ease-in-out infinite' }} />
                  <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(0,229,255,0.07)', border: '2px solid rgba(0,229,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 0 40px rgba(0,229,255,0.2)' }}>
                    <CheckCircle style={{ width: 44, height: 44, color: '#00E5FF' }} />
                  </div>
                </div>

                <h1 style={{ fontFamily: JB, fontSize: 'clamp(1.6rem, 5vw, 2.25rem)', fontWeight: 900, color: '#F8FAFC', lineHeight: 1.15, marginBottom: '0.65rem' }}>
                  {isCash ? 'Booking Confirmed!' : isSeatReserve ? 'Seat Locked!' : 'Payment Successful!'}
                </h1>
                <p style={{ color: '#64748B', fontSize: '1rem', fontFamily: NU, fontWeight: 500, lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
                  {isCash
                    ? "Your spot is reserved. Please pay ₹1,999 at the center on Day 1."
                    : isSeatReserve
                    ? '₹500 received! Your seat is locked. Pay the remaining ₹1,499 at the center on Day 1.'
                    : 'Your payment is confirmed and your spot is secured. See you at camp!'}
                </p>
              </div>

              {/* ── Booking Ref badge ── */}
              {booking?.booking_ref && (
                <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
                  <div style={{ display: 'inline-block', background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.25)', borderRadius: '0.75rem', padding: '0.55rem 1.4rem' }}>
                    <span style={{ fontFamily: JB, fontSize: '0.72rem', letterSpacing: '0.18em', color: '#475569', textTransform: 'uppercase', marginRight: 10 }}>Booking Ref</span>
                    <span style={{ fontFamily: JB, fontWeight: 800, fontSize: '1rem', color: '#00E5FF', letterSpacing: '0.08em' }}>{booking.booking_ref}</span>
                  </div>
                </div>
              )}

              {booking && (
                <>
                  {/* ── Booking Details Card ── */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.25rem', overflow: 'hidden', marginBottom: '1.25rem' }}>
                    <div style={{ padding: '0.7rem 1.25rem', background: 'rgba(0,229,255,0.05)', borderBottom: '1px solid rgba(0,229,255,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar style={{ width: 14, height: 14, color: '#00E5FF', flexShrink: 0 }} />
                      <span style={{ fontFamily: JB, fontSize: '0.65rem', letterSpacing: '0.2em', color: '#00E5FF', textTransform: 'uppercase', fontWeight: 700 }}>Booking Details</span>
                    </div>
                    <div style={{ padding: '0 1.25rem' }}>
                      {[
                        ["Child's Name", booking.child_name || '—'],
                        ['Age Group', booking.age_group_label ? `${booking.age_group_label} (Ages ${booking.age_group_ages})` : '—'],
                        ['Batch', booking.batch_dates ? `${BATCH_LABELS[booking.batch_week] || ''} — ${booking.batch_dates}` : '—'],
                        ['Mode', booking.mode === 'online' ? 'Online at Home' : `At Center — ${booking.center_label || ''}`],
                        ['Amount', isCash ? '₹1,999 (Pay at Center)' : '₹1,999 — PAID'],
                      ].map(([k, v], i, arr) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '0.85rem 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'flex-start' }}>
                          <span style={{ fontFamily: JB, fontSize: '0.7rem', letterSpacing: '0.1em', color: '#475569', textTransform: 'uppercase', flexShrink: 0, fontWeight: 600 }}>{k}</span>
                          <span style={{ color: '#CBD5E1', fontSize: '0.92rem', fontFamily: NU, fontWeight: 600, textAlign: 'right' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Session Schedule ── */}
                  {sessions.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.25rem', overflow: 'hidden', marginBottom: '1.25rem' }}>
                      <div style={{ padding: '0.7rem 1.25rem', background: 'rgba(214,48,49,0.06)', borderBottom: '1px solid rgba(214,48,49,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock style={{ width: 14, height: 14, color: '#D63031', flexShrink: 0 }} />
                        <span style={{ fontFamily: JB, fontSize: '0.65rem', letterSpacing: '0.2em', color: '#D63031', textTransform: 'uppercase', fontWeight: 700 }}>Session Schedule</span>
                        <span style={{ marginLeft: 'auto', fontFamily: JB, fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>{sessionTime}</span>
                      </div>
                      <div style={{ padding: '0 1.25rem' }}>
                        {sessions.map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: i < sessions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 38, height: 28, borderRadius: '0.4rem', background: 'rgba(214,48,49,0.08)', border: '1px solid rgba(214,48,49,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontFamily: JB, fontSize: '0.62rem', fontWeight: 800, color: '#D63031' }}>{s.day.toUpperCase()}</span>
                              </div>
                              <span style={{ fontFamily: NU, fontSize: '0.92rem', color: '#CBD5E1', fontWeight: 600 }}>{s.date}</span>
                            </div>
                            <span style={{ fontFamily: JB, fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>{sessionTime}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Mode info ── */}
                  <div style={{ background: booking.mode === 'online' ? 'rgba(214,48,49,0.06)' : 'rgba(0,229,255,0.04)', border: `1px solid ${booking.mode === 'online' ? 'rgba(214,48,49,0.18)' : 'rgba(0,229,255,0.15)'}`, borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {booking.mode === 'online'
                      ? <Wifi style={{ width: 20, height: 20, color: '#D63031', flexShrink: 0, marginTop: 1 }} />
                      : <MapPin style={{ width: 20, height: 20, color: '#00E5FF', flexShrink: 0, marginTop: 1 }} />}
                    <div>
                      <p style={{ fontFamily: JB, fontWeight: 700, fontSize: '0.88rem', color: booking.mode === 'online' ? '#D63031' : '#00E5FF', marginBottom: '0.25rem' }}>
                        {booking.mode === 'online' ? 'Online Sessions' : booking.center_label || 'At Center'}
                      </p>
                      <p style={{ fontFamily: NU, fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, fontWeight: 500 }}>
                        {booking.mode === 'online'
                          ? 'Zoom/Google Meet link will be shared on WhatsApp before Day 1.'
                          : isSeatReserve
                          ? `Please arrive 10 minutes before ${sessionTime.split('–')[0].trim()} on Day 1. Bring ₹1,499 cash or UPI for the balance.`
                          : `Please arrive 10 minutes before ${sessionTime.split('–')[0].trim()} on Day 1.`}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* ── Download Receipt ── */}
              {booking && (
                <button
                  onClick={() => downloadSummerCampReceipt(booking, isCash)}
                  data-testid="download-receipt-btn"
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.25)',
                    borderRadius: '0.875rem', padding: '1rem', cursor: 'pointer',
                    fontFamily: JB, fontWeight: 700, fontSize: '0.92rem', color: '#00E5FF',
                    transition: 'all 0.2s', marginBottom: '1rem',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.13)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.45)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)'; }}
                >
                  <Download style={{ width: 17, height: 17 }} />
                  Download Receipt
                </button>
              )}

              {/* ── Add to Calendar ── */}
              {booking && sessions.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontFamily: JB, fontSize: '0.62rem', letterSpacing: '0.18em', color: '#475569', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.65rem', textAlign: 'center' }}>
                    Add Sessions to Calendar
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <a
                      href={generateGoogleCalendarUrl(booking, sessions, sessionTime)}
                      target="_blank"
                      rel="noreferrer"
                      data-testid="add-google-calendar-btn"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.85rem', borderRadius: '0.875rem', background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.22)', color: '#4285F4', textDecoration: 'none', fontFamily: JB, fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(66,133,244,0.16)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(66,133,244,0.08)'; }}
                    >
                      <Calendar style={{ width: 15, height: 15 }} />
                      Google Calendar
                    </a>
                    <button
                      onClick={() => downloadICSFile(booking, sessions, sessionTime)}
                      data-testid="add-apple-calendar-btn"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.85rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.13)', color: '#CBD5E1', cursor: 'pointer', fontFamily: JB, fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    >
                      <Calendar style={{ width: 15, height: 15 }} />
                      Apple / iCal
                    </button>
                  </div>
                </div>
              )}

              {/* ── Support ── */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '1rem', padding: '1.1rem 1.25rem', marginBottom: '2rem' }}>
                <p style={{ fontFamily: JB, fontSize: '0.65rem', letterSpacing: '0.18em', color: '#475569', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.8rem' }}>Need Help?</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <a href="https://wa.me/919920188188" target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', borderRadius: '0.6rem', background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.18)', color: '#25D366', textDecoration: 'none', fontFamily: JB, fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,211,102,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,211,102,0.08)'}
                  >
                    <MessageCircle style={{ width: 15, height: 15 }} />
                    WhatsApp Us
                  </a>
                  <a href="tel:+919920188188"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', borderRadius: '0.6rem', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)', color: '#00E5FF', textDecoration: 'none', fontFamily: JB, fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,255,0.06)'}
                  >
                    <Phone style={{ width: 15, height: 15 }} />
                    +91 9920188188
                  </a>
                </div>
              </div>

              {/* ── CTAs ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={() => navigate('/')}
                  data-testid="go-home-btn"
                  style={{ width: '100%', background: '#D63031', color: '#fff', fontFamily: JB, fontWeight: 700, fontSize: '0.95rem', padding: '1rem', borderRadius: '0.875rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 0 28px rgba(214,48,49,0.3)', transition: 'all 0.25s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e8353f'}
                  onMouseLeave={e => e.currentTarget.style.background = '#D63031'}
                >
                  <Home style={{ width: 16, height: 16 }} />
                  Go to Homepage
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Nunito+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>
    </>
  );
}
