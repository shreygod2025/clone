import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';

const CA = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts';
const CA_OLD = 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts';
const FS_HERO = `${CA}/mcvv1k20_Screenshot%202026-09-17%20at%208.13.35%E2%80%AFAM.png`;

export const MEGA_MENU = [
  {
    eyebrow: 'For Schools', title: 'Robotics', accent: '#D63031',
    items: [
      { label: 'Pre-School', sub: 'Play + explore · Ages 3–5', to: '/school/robotics/pre-school', img: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=240&q=60' },
      { label: 'Robotics & AI Program', sub: 'Grade 1–8 · Turnkey Robotics & AI Lab', to: '/school/robotics-ai-lab-for-schools-turnkey-solution/', img: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/4y2zbq59_Robotics.gif' },
      { label: 'ICSE — Group 3 (9th & 10th)', sub: 'Board-mapped elective', to: '/school/icse-robotics-and-ai-curriculum-books-with-practical-activity-kits-for-class-9th-and10th', img: `${CA}/n2zt8acf_OLL%20Curriculum%20Brochure%20-%20ICSE%20Group%203%20Subject%20-%20Code%2066%20Curriculum%20%209th%20-%2010th%20%202026.png` },
    ],
  },
  {
    eyebrow: 'For Schools', title: 'Computer Science', accent: '#1E3A5F',
    items: [
      { label: 'ICSE — Future Skills', sub: '4-in-1 · ICT · Coding · AI · Robotics · Grades 1-8', to: '/school/icse-ict-robotics-ai-and-coding-curriculum-with-practical-activity-books-for-class-1-to-8', img: FS_HERO },
      { label: 'CBSE — Future Skills', sub: '4-in-1 · ICT · Coding · AI · Robotics · Grades 1-8', to: '/school/cbse-ict-robotics-ai-and-coding-curriculum-with-practical-activity-books-for-class-1-to-8', img: FS_HERO },
      { label: 'CBSE — Computational Thinking & AI', sub: 'CBSE Acad-15/2026 elective · Grades 3-8', to: '/school/cs/cbse-computational-thinking-ai-books-activities-for-classes-3-to-8', img: `${CA}/v94lyklh_WhatsApp%20Image%202026-09-17%20at%2012.42.49.jpeg` },
    ],
  },
  {
    eyebrow: 'For Learners', title: 'Students', accent: '#0F766E',
    items: [
      { label: 'Future Skills Centres', sub: 'Weekly Robotics, Coding & AI classes', to: '/future-skills', img: `${CA_OLD}/h11kmu1i_20260504_122503.jpg` },
      { label: 'Summer Camp', sub: 'Hands-on holiday camps · Ages 6–16', to: '/summer-camp', img: `${CA_OLD}/tqatbciw_20260504_124243.jpg` },
      { label: 'AI Foundations', sub: 'Live online AI course for kids', to: '/ai-foundations', img: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=240&q=60' },
      { label: 'Robotics Kits Shop', sub: 'Curriculum kits, books & components', to: '/shop', img: 'https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?w=240&q=60' },
    ],
  },
];

const MegaItem = ({ it, onPick }) => (
  <Link to={it.to} onClick={onPick} className="group flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 transition-colors" data-testid={`mega-item-${it.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
    <span className="w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 ring-1 ring-slate-200">
      <img src={it.img} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[13.5px] font-bold text-slate-900 leading-tight group-hover:text-[#D63031] transition-colors">{it.label}</span>
      <span className="block text-[11.5px] text-slate-500 leading-snug mt-0.5 line-clamp-1">{it.sub}</span>
    </span>
    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#D63031] group-hover:translate-x-0.5 transition-all" />
  </Link>
);

/** Desktop "Offerings" link with a hover mega-menu. Click still goes to /offerings. */
export const OfferingsMegaMenu = ({ className = '', testId = 'nav-link-offerings' }) => {
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(80);
  const ref = useRef(null);
  const timer = useRef(null);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const show = () => {
    clearTimeout(timer.current);
    if (ref.current) setTop(ref.current.getBoundingClientRect().bottom + 10);
    setOpen(true);
  };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 140); };

  return (
    <span ref={ref} className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <Link to="/offerings" className={`inline-flex items-center gap-1 ${className}`} data-testid={testId} aria-haspopup="true" aria-expanded={open}>
        Offerings <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Link>
      {open && createPortal(
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[80] w-[min(1080px,calc(100vw-32px))]"
          style={{ top, whiteSpace: 'normal' }}
          onMouseEnter={show}
          onMouseLeave={hide}
          data-testid="offerings-mega-menu"
        >
          <div className="absolute -top-3 inset-x-0 h-3" />
          <div className="rounded-2xl bg-white shadow-[0_24px_60px_rgba(10,31,68,0.22)] ring-1 ring-slate-200 p-5 grid grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-1 duration-150">
            {MEGA_MENU.map((col) => (
              <div key={col.title} className="min-w-0" data-testid={`mega-col-${col.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="px-2 pb-2 mb-1 border-b border-slate-100">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: col.accent }}>{col.eyebrow}</div>
                  <div className="text-[15px] font-black text-slate-900">{col.title}</div>
                </div>
                <div className="flex flex-col gap-0.5">
                  {col.items.map((it) => <MegaItem key={it.label} it={it} onPick={() => setOpen(false)} />)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-center">
            <Link to="/offerings" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#0A1F44] hover:bg-[#D63031] px-4 py-1.5 rounded-full transition-colors" data-testid="mega-view-all">
              View all offerings <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>,
        document.body,
      )}
    </span>
  );
};
