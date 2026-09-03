/**
 * <LMSSection /> — Shared LMS showcase (used on ICSE 9/10 + Beginner landing pages).
 *
 * Structure
 *  1. Eyebrow ("Live Analytics & Resources") + big heading ("OLL's Learning Management System")
 *  2. CSS-only laptop mockup with an embedded YouTube demo video playing autoloop
 *  3. Three role-based feature columns (Student & Parent · Teacher · School)
 */

import {
  BookOpen, MessageCircle, Trophy, ClipboardList, BarChart3, Bell, UserCircle2,
  FileText, FlaskConical, ClipboardCheck, CheckCircle2, LineChart, MessageSquare,
  CalendarCheck, FileBarChart, LayoutDashboard, Users, Activity, Image as ImageIcon,
  Calendar, Shield, Megaphone, Settings, Play,
} from 'lucide-react';
import { useState } from 'react';

const LMS_VIDEO_ID = 'pkMSv6-bpic';
const LMS_VIDEO_URL = `https://www.youtube.com/watch?v=${LMS_VIDEO_ID}`;
const LMS_VIDEO_THUMB = `https://i.ytimg.com/vi/${LMS_VIDEO_ID}/maxresdefault.jpg`;

const STUDENT_FEATURES = [
  { i: BookOpen,       t: 'E-Material Access',              s: 'Access study material, notes, videos, e-books and reference resources anytime.' },
  { i: MessageCircle,  t: 'AI Doubt Solving Assistant',     s: 'Ask questions and get instant AI-powered answers with step-by-step explanations.' },
  { i: Trophy,         t: 'Competitions & Opportunities',   s: 'Find and register for competitions, olympiads, internships, workshops and events.' },
  { i: ClipboardList,  t: 'Assignments & Submissions',      s: 'View assignments, submit work online and track submission status.' },
  { i: BarChart3,      t: 'Progress Dashboard',             s: 'Track subject-wise performance, test scores, strengths and areas to improve.' },
  { i: Bell,           t: 'Notifications & Announcements',  s: 'Get important updates, reminders and announcements in real-time.' },
  { i: UserCircle2,    t: 'Parent Reporting',               s: 'Parents can monitor attendance, performance, assignments and communicate with teachers.' },
];

const TEACHER_FEATURES = [
  { i: FileText,          t: 'Lesson Planning',                     s: 'Create, organize and share lesson plans, videos, PPTs, documents and quizzes.' },
  { i: FlaskConical,      t: 'Virtual Labs Access',                 s: 'Use interactive simulations and virtual labs to explain concepts better.' },
  { i: ClipboardCheck,    t: 'Assignment Management',               s: 'Create assignments, set deadlines, evaluate and provide feedback online.' },
  { i: CheckCircle2,      t: 'Online Test Creation & Evaluation',   s: 'Create tests and quizzes, auto-grade and analyze results instantly.' },
  { i: LineChart,         t: 'Class Performance Analytics',         s: 'View detailed reports on class and individual student performance.' },
  { i: MessageSquare,     t: 'Communication',                       s: 'Send announcements and messages to students and parents.' },
  { i: CalendarCheck,     t: 'Attendance Management',               s: 'Mark attendance and track student participation in activities.' },
  { i: FileBarChart,      t: 'Student Detail Reporting',            s: 'Generate detailed performance, attendance and assessment reports.' },
];

const SCHOOL_FEATURES = [
  { i: LayoutDashboard, t: 'Admin Dashboard',              s: 'Get a real-time overview of academic, attendance and operational activities.' },
  { i: Users,           t: 'User Management',              s: 'Manage students, teachers, parents and staff roles and permissions.' },
  { i: Activity,        t: 'Live Reporting',               s: 'Access real-time reports on academics, attendance, fees and activities.' },
  { i: ImageIcon,       t: 'Gallery & Activity Management', s: 'Showcase student projects, events and achievements in the school gallery.' },
  { i: Calendar,        t: 'Timetable & Schedule',         s: 'Create and manage class timetables, exams and events.' },
  { i: Shield,          t: 'Data & Security Management',   s: 'Ensure secure data backup, access control and system logs.' },
  { i: Megaphone,       t: 'Communication Center',         s: 'Send circulars, notifications and messages to entire school community.' },
  { i: Settings,        t: 'Settings & Integration',       s: 'Customize LMS settings and integrate with third-party tools and platforms.' },
];

const COLUMNS = [
  { key: 'student', role: 'STUDENT & PARENT LOGIN', accent: '#0A1F44', bg: 'bg-slate-50/70', border: 'border-[#0A1F44]/15',   features: STUDENT_FEATURES, iconBg: 'bg-[#0A1F44]' },
  { key: 'teacher', role: 'TEACHER LOGIN',          accent: '#DC2626', bg: 'bg-red-50/50',    border: 'border-[#DC2626]/25',   features: TEACHER_FEATURES, iconBg: 'bg-[#DC2626]' },
  { key: 'school',  role: 'SCHOOL LOGIN',           accent: '#0A1F44', bg: 'bg-slate-50/70', border: 'border-[#0A1F44]/15',   features: SCHOOL_FEATURES,  iconBg: 'bg-[#0A1F44]' },
];

/**
 * @param {{ scriptClass?: string, displayClass?: string, lightClass?: string, eyebrowText?: string }} props
 * Optional class overrides let the parent page match its typographic system
 * (ICSE uses `icse-script/display/light`, Beginner uses `rb-script/display/light`).
 */
export default function LMSSection({
  scriptClass = 'icse-script',
  displayClass = 'icse-display',
  lightClass = 'icse-light',
  eyebrowText = 'live analytics & resources',
  testid = 'lms-section',
}) {
  const [videoPlaying, setVideoPlaying] = useState(false);
  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20" data-testid={testid}>
      <style>{`
        /* CSS laptop frame */
        .lms-laptop { max-width: 900px; margin: 0 auto; }
        .lms-laptop-lid {
          position: relative;
          background: linear-gradient(180deg, #1F2937 0%, #0F172A 100%);
          border-radius: 18px 18px 6px 6px;
          padding: 14px 14px 12px;
          box-shadow: 0 30px 60px rgba(15,23,42,0.35), 0 12px 24px rgba(15,23,42,0.2), inset 0 0 0 1px rgba(255,255,255,0.06);
        }
        .lms-laptop-screen {
          position: relative;
          padding-top: 56.25%;
          background: #000;
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .lms-laptop-screen iframe {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          border: 0;
        }
        .lms-laptop-notch {
          position: absolute; top: 4px; left: 50%; transform: translateX(-50%);
          width: 56px; height: 6px;
          background: #0F172A; border-radius: 0 0 6px 6px;
          z-index: 2;
        }
        .lms-laptop-base {
          position: relative;
          margin: 0 -3%;
          height: 18px;
          background: linear-gradient(180deg, #D1D5DB 0%, #9CA3AF 50%, #6B7280 100%);
          border-radius: 0 0 22px 22px;
          box-shadow: 0 22px 40px rgba(15,23,42,0.25), inset 0 -3px 0 rgba(0,0,0,0.12);
        }
        .lms-laptop-base::before {
          content: '';
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 22%; height: 8px;
          background: linear-gradient(180deg, #6B7280 0%, #4B5563 100%);
          border-radius: 0 0 10px 10px;
        }
        .lms-laptop-shadow {
          margin: 0 6%;
          height: 22px;
          background: radial-gradient(ellipse at center, rgba(15,23,42,0.28) 0%, rgba(15,23,42,0) 65%);
          filter: blur(2px);
        }
      `}</style>

      {/* Heading */}
      <div className="text-center max-w-3xl mx-auto">
        <div className={`${scriptClass} text-[#DC2626] text-3xl`}>{eyebrowText}</div>
        <h2 className={`${displayClass} text-[#0A1F44] text-[1.75rem] sm:text-5xl mt-1`}>
          OLL's Learning Management System
        </h2>
        <p className={`${lightClass} text-slate-600 mt-3 text-sm sm:text-base`}>
          One dashboard for students, teachers and school admins — from lesson plans and virtual labs to
          live reporting and communication, everything happens in one place.
        </p>
      </div>

      {/* Laptop mockup with embedded demo video */}
      <div className="mt-10 lms-laptop" data-testid="lms-laptop">
        <div className="lms-laptop-lid">
          <span className="lms-laptop-notch" />
          <div className="lms-laptop-screen">
            {videoPlaying ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${LMS_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title="OLL LMS Demo — Learning Management System walkthrough"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <a
                href={LMS_VIDEO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 group cursor-pointer overflow-hidden block"
                data-testid="lms-video-play"
                aria-label="Watch OLL LMS demo video on YouTube"
              >
                <img
                  src={LMS_VIDEO_THUMB}
                  alt="OLL Learning Management System — demo video preview"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.src = `https://i.ytimg.com/vi/${LMS_VIDEO_ID}/hqdefault.jpg`; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110">
                    <Play className="w-9 h-9 text-[#DC2626] ml-1" fill="#DC2626" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white text-xs uppercase tracking-widest font-bold">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DC2626]">
                    <Play className="w-3 h-3" fill="#fff" strokeWidth={0} /> Watch on YouTube
                  </span>
                  <span className="opacity-80">60-sec walkthrough</span>
                </div>
              </a>
            )}
          </div>
        </div>
        <div className="lms-laptop-base" />
        <div className="lms-laptop-shadow" />
      </div>

      {/* Role columns */}
      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6" data-testid="lms-roles">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className={`relative rounded-3xl border ${col.border} ${col.bg} p-5 sm:p-6 shadow-lg`}
            data-testid={`lms-role-${col.key}`}
          >
            {/* Icon medallion */}
            <div className="flex justify-center -mt-11 mb-3">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-white ${col.iconBg}`}>
                {col.key === 'student'
                  ? <Users className="w-7 h-7 text-white" />
                  : col.key === 'teacher'
                  ? <FileText className="w-7 h-7 text-white" />
                  : <LayoutDashboard className="w-7 h-7 text-white" />}
              </div>
            </div>
            {/* Role heading */}
            <div className="text-center pb-3 border-b" style={{ borderColor: `${col.accent}25` }}>
              <div className={`${displayClass} tracking-widest`} style={{ color: col.accent, fontSize: '1.05rem' }}>
                {col.role}
              </div>
            </div>
            {/* Feature list */}
            <ul className="mt-4 space-y-3.5">
              {col.features.map(({ i: Icon, t, s }) => (
                <li key={t} className="flex gap-3">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: col.accent }}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-[#0A1F44] text-sm leading-snug">{t}</div>
                    <div className={`${lightClass} text-xs text-slate-600 mt-0.5 leading-relaxed`}>{s}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
