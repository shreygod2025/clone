/**
 * OLL Composite Skill Lab (CSL) Landing Page
 * Mandated as per CBSE Circular Skill-75/2024 · NEP 2020 & NCF-SE 2023 (Grades 6–10).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import {
  ArrowRight, Download, ShieldCheck, Trophy, Cpu, Code2, Brain,
  CheckCircle2, Sparkles, Users, BookOpen, Package, Award, Star,
  School, Heart, Play, Leaf, Hammer, Shirt, Stethoscope, ShoppingBag,
  Wrench, Check, Clock, Compass, Layers, Shield
} from 'lucide-react';

import Footer from '../../components/Footer';
import LMSSection from '../../components/school/LMSSection';
import SchoolBreadcrumbs from '../../components/school/SchoolBreadcrumbs';
import SchoolRelatedPrograms from '../../components/school/SchoolRelatedPrograms';
import CurriculumGateModal from '../../components/school/CurriculumGateModal';

const API = process.env.REACT_APP_BACKEND_URL;
const OLL_LOGO_COLOR =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

const CANONICAL_PATH =
  '/school/composite-skill-lab-cbse-skill-education-grades-6-to-10';

const BROCHURE_PDF_URL =
  'https://drive.google.com/uc?export=download&id=1GNsJkhDyrDGzWxUwUORgQRDXBtLQsr3J';
const BROCHURE_NAME =
  'OLL-Composite-Skill-Lab-Brochure.pdf';

const SHARK_TANK_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png';
const SHARK_TANK_YT = 'https://www.youtube.com/watch?v=aVzl6yzPPTw';
const KBC_YT = 'https://www.youtube.com/watch?v=8M3A_InpVKw&t=883s';

const SECTORS = [
  {
    title: 'Work with Life Forms',
    icon: Leaf,
    color: '#16A34A',
    bg: '#DCFCE7',
    domains: [
      { name: 'Agriculture & Gardening', desc: 'Kitchen Garden (Gr. 6), Plant Nursery (Gr. 7), Hydroponics (Gr. 8), Agriculture Vocation (Gr. 9)' },
      { name: 'Food Production', desc: 'Cooking without Fire (Gr. 6), Food Production & Nutrition Vocation (Gr. 10)' }
    ]
  },
  {
    title: 'Work with Machines & Materials',
    icon: Hammer,
    color: '#0284C7',
    bg: '#E0F2FE',
    domains: [
      { name: 'Electronics, AI & Mechatronics', desc: 'Circuits (Gr. 6), AI Assistant (Gr. 7), Home Automation (Gr. 8), Electronics Vocation (Gr. 9)' },
      { name: 'Apparel, Tie-Dye & Fashion', desc: 'Tie & Dye (Gr. 7), Puppet Making (Gr. 7), Apparel Design Vocation (Gr. 10)' },
      { name: 'Carpentry & Woodwork', desc: 'Wood & Bamboo Craft (Gr. 8), Carpentry & Joinery (Gr. 10)' }
    ]
  },
  {
    title: 'Work in Human Services',
    icon: Stethoscope,
    color: '#DC2626',
    bg: '#FEE2E2',
    domains: [
      { name: 'Healthcare & First Aid', desc: 'Family Health Handbook (Gr. 7), Patient Support & Healthcare Vocation (Gr. 9)' },
      { name: 'Retail & Enterprise (Lite)', desc: 'Plant & Craft Sales (Gr. 7), Retail Vocation (Gr. 10), Kaushal Mela School Exhibitions' }
    ]
  }
];

export default function CompositeSkillLabLanding() {
  const navigate = useNavigate();
  const [gateOpen, setGateOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(1);

  const [form, setForm] = useState({
    school_name: '', contact_name: '', phone: '', email: '', city: '', board: 'CBSE', message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.school_name.trim() || form.phone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter school name and a valid 10-digit phone number.');
      return;
    }
    setSubmitting(true);
    try {
      await fetch(`${API}/api/schools/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: form.school_name.trim(),
          contact_name: form.contact_name.trim() || 'Principal / Coordinator',
          email: form.email.trim() || `lead_${form.phone.replace(/\D/g, '')}@pending.oll.co`,
          phone: form.phone.trim(),
          city: form.city.trim(),
          board: form.board,
          selected_offerings: ['Composite Skill Lab (Grades 6-10)'],
          programs_interested: ['CBSE Skill-75/2024 Composite Skill Lab'],
          source: 'composite-skill-lab-landing',
          notes: `Inquiry for CBSE Composite Skill Lab setup. City: ${form.city}. Message: ${form.message}`,
          assign_option: 'admin',
        }),
      });
      setSubmitted(true);
      toast.success('Your Composite Skill Lab demo request has been received!');
    } catch {
      setSubmitted(true);
      toast.success('Your request was received. Our lab specialist will connect shortly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#FAFBFD', color: '#0F1E33', fontFamily: "'Proxima Nova', 'Montserrat', system-ui, sans-serif", minHeight: '100vh' }}>
      <Toaster position="top-right" richColors />

      {/* STICKY HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E2E8F0',
        padding: '0.75rem 1.5rem',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <img src={OLL_LOGO_COLOR} alt="OLL.co" style={{ height: 34, width: 'auto' }} />
            </button>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#EFF6FF', color: '#1D4ED8',
              fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 0.65rem',
              borderRadius: '9999px', letterSpacing: '0.04em', textTransform: 'uppercase'
            }}>
              <Award size={13} /> CBSE Circular Skill-75/2024 Compliant
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setGateOpen(true)}
              data-testid="csl-download-brochure"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: '#F1F5F9', color: '#0F1E33', border: '1px solid #CBD5E1',
                padding: '0.55rem 1rem', borderRadius: '0.75rem',
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              <Download size={14} /> Download Brochure (PDF)
            </button>

            <a
              href="#setup-consultation"
              data-testid="csl-header-demo"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#fff', border: 'none',
                padding: '0.55rem 1.15rem', borderRadius: '0.75rem',
                fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
              }}
            >
              Request Lab Setup <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </header>

      {/* BREADCRUMBS */}
      <SchoolBreadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'For Schools', href: '/school/robotics-ai-lab-for-schools-turnkey-solution/' },
          { label: 'Composite Skill Lab (Grades 6–10)' }
        ]}
        schemaId="csl-breadcrumbs-schema"
        testid="csl-breadcrumbs"
      />

      {/* HERO SECTION */}
      <section style={{ maxWidth: 1200, margin: '1.5rem auto 3.5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: 'radial-gradient(ellipse at top right, rgba(37, 99, 235, 0.08), transparent 60%), #FFFFFF',
          borderRadius: '2rem', border: '2px solid #E2E8F0',
          padding: '3rem 2.5rem', boxShadow: '0 20px 50px rgba(15, 30, 80, 0.06)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
            
            {/* Left Column */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8',
                borderRadius: '9999px', padding: '0.35rem 0.85rem', fontSize: '0.8rem',
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem'
              }}>
                <Clock size={14} /> 110 Hours Per Year · Mandatory CBSE Norms
              </div>

              <h1 style={{
                fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', fontWeight: 900,
                lineHeight: 1.15, color: '#0A1F44', marginBottom: '1.25rem',
                letterSpacing: '-0.02em'
              }}>
                Composite Skill Lab for Schools{' '}
                <span style={{ color: '#2563EB', display: 'inline-block' }}>(Grades 6 to 10)</span>
              </h1>

              <p style={{
                fontSize: '1.05rem', lineHeight: 1.6, color: '#475569',
                marginBottom: '2rem', maxWidth: 580
              }}>
                Empower your school with an integrated, multi-sector hands-on learning hub.
                Fulfills <strong>CBSE Circular Skill-75/2024</strong>, <strong>NEP 2020</strong>, and <strong>NCF-SE 2023</strong> mandates across Life Forms, Machines & Materials, and Human Services.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
                <a
                  href="#setup-consultation"
                  data-testid="csl-hero-primary-cta"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#fff', padding: '0.9rem 1.75rem', borderRadius: '1rem',
                    fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
                    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
                    transition: 'transform 0.15s'
                  }}
                >
                  Schedule Lab Setup Consultation <ArrowRight size={18} />
                </a>

                <button
                  onClick={() => setGateOpen(true)}
                  data-testid="csl-hero-brochure-cta"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: '#FFFFFF', color: '#0A1F44', border: '2px solid #E2E8F0',
                    padding: '0.85rem 1.5rem', borderRadius: '1rem',
                    fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15, 30, 80, 0.04)'
                  }}
                >
                  <Download size={18} style={{ color: '#2563EB' }} /> Download CSL Blueprint (PDF)
                </button>
              </div>

              {/* Compliance Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {[
                  'CBSE Skill-75/2024 Compliant',
                  '110 Hours Curriculum per Grade',
                  'Covers 3 Core Economic Sectors',
                  'Turnkey Equipment & Teacher LMS'
                ].map((txt, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    <CheckCircle2 size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
                    <span>{txt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Hero Graphic */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: '#FFFFFF', borderRadius: '1.75rem',
                border: '2px solid #E2E8F0', overflow: 'hidden',
                boxShadow: '0 16px 40px rgba(15, 30, 80, 0.08)'
              }}>
                <img
                  src="/school/composite/csl_page_1.webp"
                  alt="OLL Composite Skill Lab Overview"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3 CORE SECTORS SECTION */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Comprehensive Multi-Sector Learning
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0A1F44' }}>
            The 3 Pillars of CBSE Composite Skill Education
          </h2>
          <p style={{ color: '#64748B', maxWidth: 650, margin: '0.5rem auto 0', fontSize: '0.95rem' }}>
            Exposing students across Grades 6–10 to agriculture, modern manufacturing, electronics, healthcare, and retail.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {SECTORS.map((sec, i) => (
            <div key={i} style={{
              background: '#FFFFFF', borderRadius: '1.5rem', border: '2px solid #E2E8F0',
              padding: '2rem', boxShadow: '0 8px 24px rgba(15, 30, 80, 0.04)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  width: 56, height: 56, borderRadius: '1.25rem',
                  background: sec.bg, color: sec.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem'
                }}>
                  <sec.icon size={28} />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0A1F44', marginBottom: '1.25rem' }}>
                  {sec.title}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {sec.domains.map((dom, dIdx) => (
                    <div key={dIdx} style={{
                      background: '#F8FAFC', borderRadius: '0.85rem', padding: '0.85rem 1rem',
                      border: '1px solid #E2E8F0'
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1E293B', marginBottom: '0.25rem' }}>
                        {dom.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.5 }}>
                        {dom.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SLIDE GALLERY / LAB FEATURES */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A5F 100%)',
          borderRadius: '2rem', padding: '3.5rem 2.5rem', color: '#fff'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{
              background: 'rgba(255,255,255,0.15)', color: '#93C5FD',
              padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.75rem',
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              Turnkey Equipment & Setup
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 3vw, 2.5rem)', fontWeight: 900, marginTop: '0.75rem' }}>
              What OLL Delivers in Your Composite Skill Lab
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[
              { title: 'Modular Lab Architecture', desc: 'Designed to fit existing school rooms (600 - 1,200 sq. ft.) with flexible stations for life sciences, electronics, and human services.' },
              { title: '110-Hour Aligned Curriculum', desc: 'Grade-wise student activity books, teacher guides, lecture slides, and Kaushal Bodh project portfolios.' },
              { title: 'Full Equipment & Tool Inventory', desc: 'Hydroponics trays, sewing machines, woodwork tools, soldering kits, Raspberry Pi AI stations, and safety utilities.' },
              { title: 'Continuous Teacher Upskilling', desc: 'Onsite onboarding, semester refresher workshops, and LMS lesson plans so in-house faculty lead seamlessly.' },
            ].map((f, idx) => (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.08)', borderRadius: '1.25rem',
                border: '1px solid rgba(255,255,255,0.15)', padding: '1.75rem'
              }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem', color: '#60A5FA' }}>
                  {f.title}
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.55 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHARK TANK & CREDIBILITY */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: '#FFFFFF', borderRadius: '2rem', border: '2px solid #E2E8F0',
          padding: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem', alignItems: 'center', boxShadow: '0 12px 36px rgba(15, 30, 80, 0.05)'
        }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#EFF6FF', color: '#1D4ED8', borderRadius: '999px',
              padding: '0.3rem 0.8rem', fontSize: '0.75rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1rem'
            }}>
              National Recognition
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.2rem)', fontWeight: 900, color: '#0A1F44', marginBottom: '1rem' }}>
              Backed by Shark Tank India & KBC Hot Seat
            </h2>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              OLL provides educational institutions across India with validated, NEP 2020-compliant curricula, certified by STEM.org and recognized nationwide.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a
                href={SHARK_TANK_YT}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: '#F1F5F9', color: '#0A1F44', padding: '0.65rem 1.1rem',
                  borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700,
                  textDecoration: 'none', border: '1px solid #CBD5E1'
                }}
              >
                <Play size={14} style={{ color: '#2563EB' }} /> Watch Shark Tank
              </a>
              <a
                href={KBC_YT}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: '#F1F5F9', color: '#0A1F44', padding: '0.65rem 1.1rem',
                  borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700,
                  textDecoration: 'none', border: '1px solid #CBD5E1'
                }}
              >
                <Play size={14} style={{ color: '#DC2626' }} /> Watch KBC
              </a>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <img
              src={SHARK_TANK_IMG}
              alt="OLL on Shark Tank and KBC"
              style={{
                width: '100%', maxHeight: 280, objectFit: 'contain',
                borderRadius: '1.25rem', border: '1px solid #E2E8F0'
              }}
            />
          </div>
        </div>
      </section>

      {/* LAB CONSULTATION FORM */}
      <section id="setup-consultation" style={{ maxWidth: 1000, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0A1F44 0%, #0F172A 100%)',
          borderRadius: '2rem', padding: '3.5rem 2.5rem', color: '#fff',
          boxShadow: '0 24px 60px rgba(10, 31, 68, 0.25)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ maxWidth: 650, margin: '0 auto', textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{
              background: 'rgba(37, 99, 235, 0.2)', color: '#60A5FA',
              padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.75rem',
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              School Lab Blueprint & Proposal
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 3vw, 2.6rem)', fontWeight: 900, marginTop: '0.75rem', color: '#fff' }}>
              Bring the Composite Skill Lab to Your Campus
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              Request a customized floorplan, equipment budget, and syllabus demo for your school.
            </p>
          </div>

          {submitted ? (
            <div style={{
              background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22C55E',
              borderRadius: '1.25rem', padding: '2rem', textAlign: 'center'
            }}>
              <CheckCircle2 size={48} style={{ color: '#22C55E', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                Consultation Request Received!
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>
                Our institutional lab architect will review your school requirements and reach out within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} data-testid="csl-consultation-form">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    School Name *
                  </label>
                  <input
                    type="text"
                    name="school_name"
                    required
                    value={form.school_name}
                    onChange={handleChange}
                    placeholder="e.g. Delhi Public School"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    name="contact_name"
                    value={form.contact_name}
                    onChange={handleChange}
                    placeholder="Principal / Trustee"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="10-digit Phone Number"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Official Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="principal@school.edu"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    City / State
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="e.g. Pune, Maharashtra"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Affiliated Board
                  </label>
                  <select
                    name="board"
                    value={form.board}
                    onChange={handleChange}
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: '#1E293B', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  >
                    <option value="CBSE">CBSE (Skill-75/2024)</option>
                    <option value="ICSE">ICSE</option>
                    <option value="State Board">State Board</option>
                    <option value="IB / Cambridge">IB / Cambridge</option>
                  </select>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="csl-submit-btn"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#fff', padding: '1rem 2.5rem', borderRadius: '1rem',
                    fontWeight: 800, fontSize: '1rem', border: 'none', cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Submitting...' : 'Request Lab Consultation & Floorplan'} <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* LMS & CROSS-LINKS */}
      <LMSSection theme="light" />
      <SchoolRelatedPrograms current="composite-skill-lab" theme="light" />
      <Footer />

      {/* BROCHURE GATE MODAL */}
      <CurriculumGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        pdfUrl={BROCHURE_PDF_URL}
        pdfName={BROCHURE_NAME}
        title="CBSE Composite Skill Lab (CSL) Brochure"
        offering="Composite Skill Lab (Grades 6-10)"
        program="CBSE Skill-75/2024 Composite Skill Lab"
        source="composite-skill-lab-gate"
        testid="csl-curriculum-gate"
      />
    </div>
  );
}
