import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Footer from '../../components/Footer';
import { RbAboutOLL, RB_SHARED_CSS } from '../../components/school/RbTrustSections';
import { RbSkillsCarousel } from '../../components/school/RbSkillsCarousel';
import { ParentsFeedback } from '../../components/home/ParentsFeedback';
import { InsideClassroom } from '../../components/home/InsideClassroom';
import { useSeo } from '../../hooks/useSeo';
import { OLL_LOGO_COLOR, IMG } from './franchiseContent';
import { FranchiseEnquiryForm } from './FranchiseEnquiryForm';
import { BrochureButton } from './BrochureModal';
import { FrCenters } from './FrCenters';
import { FRANCHISE_CSS } from './franchiseStyles';
import {
  Head, FrHero, FrWhy, FrDifferent, FrEasySetup, FrIncluded, FrServices, FrSpace, FrWho, FrSteps,
} from './FranchiseSections';

const CANONICAL = 'https://oll.co/franchise/robotics-ai-learning-center';

const FrNav = ({ onApply }) => (
  <div className="fr-nav-wrap">
    <nav className="fr-nav" data-testid="franchise-nav">
      <Link to="/" aria-label="OLL home"><img src={OLL_LOGO_COLOR} alt="OLL" style={{ height: 34 }} /></Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="fr-nav-invest">Investment <b>₹2.5 Lakhs</b></span>
        <BrochureButton className="fr-ghost dark sm" label="Brochure" testid="franchise-nav-brochure-btn" />
        <button type="button" className="fr-cta sm" onClick={onApply} data-testid="franchise-nav-apply-btn">Apply Now <ArrowRight size={16} /></button>
      </div>
    </nav>
  </div>
);

const FrFinal = ({ formRef }) => (
  <section className="fr-sec alt" ref={formRef} id="apply" data-testid="franchise-apply">
    <div className="fr-wrap fr-final">
      <div>
        <Head a="Build More Than a Business." b="Build Future Innovators."
          sub="Imagine children in your city designing robots, building drones, experimenting with AI and turning their ideas into real-world projects. With OLL, you can help make that possible while building your own education venture." />
        <p style={{ fontWeight: 800, fontSize: '1.15rem', marginTop: '-1rem' }}>Ready to Start Your OLL Robotics &amp; AI Center?</p>
        <p style={{ color: 'rgba(219,234,254,0.75)', marginTop: 6, lineHeight: 1.6 }}>The future needs creators, problem-solvers and innovators. Help your city create them — fill in your details and our team will connect with you.</p>
        <div style={{ marginTop: '1.25rem' }}><BrochureButton testid="franchise-final-brochure-btn" label="Download the Franchise Brochure" /></div>
        <div className="fr-photo-frame fr-final-kid"><img src={IMG.thanksKid} alt="Future innovator" loading="lazy" /></div>
      </div>
      <FranchiseEnquiryForm />
    </div>
  </section>
);

export default function FranchiseLandingPage() {
  const formRef = useRef(null);
  const [showSticky, setShowSticky] = useState(false);
  const apply = () => formRef.current?.querySelector('.fr-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  useEffect(() => {
    let formVisible = false;
    const update = () => setShowSticky(window.scrollY > 500 && !formVisible);
    const io = new IntersectionObserver(([e]) => { formVisible = e.isIntersecting; update(); }, { threshold: 0.05 });
    if (formRef.current) io.observe(formRef.current);
    window.addEventListener('scroll', update, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', update); };
  }, []);
  useSeo({
    title: 'Start a Robotics & AI Learning Center Franchise | OLL — ₹2.5 Lakh Investment',
    description: 'Open your own OLL Robotics & AI Learning Center. 1 room + 1 teacher — OLL provides equipment, curriculum, teacher training, LMS, branding and marketing. Total investment ₹2.5 Lakhs.',
    canonical: CANONICAL,
    robots: 'index, follow, max-image-preview:large',
    og: { title: 'Start Your Own Robotics & AI Learning Center with OLL', description: 'All you need is 1 furnished room & 1 teacher. Rest everything is done by OLL.', type: 'website', url: CANONICAL, siteName: 'OLL' },
  });
  return (
    <div className="fr-page">
      <style>{RB_SHARED_CSS + FRANCHISE_CSS}</style>
      <FrNav onApply={apply} />
      <FrHero onApply={apply} />
      <div className="fr-themed">
      <RbSkillsCarousel testid="franchise-skills" bg="#071345" eyebrowBelow eyebrow="what your center will teach"
        title={<>Your city&apos;s <span style={{ color: '#FCA5A5' }}>first step</span> into the future.</>}
        subtitle="Give children in your community the chance to explore the technologies shaping tomorrow." />
      </div>
      <FrWhy />
      <FrDifferent />
      <InsideClassroom footer={<FrCenters />} />
      <FrEasySetup />
      <FrIncluded />
      <FrServices />
      <FrSpace />
      <FrWho />
      <FrSteps onApply={apply} />
      <div className="fr-themed"><RbAboutOLL /></div>
      <ParentsFeedback />
      <FrFinal formRef={formRef} />
      <Footer />
      <div className={`fr-sticky ${showSticky ? 'on' : ''}`} data-testid="franchise-sticky-cta">
        <div><small>Total Investment</small><b>₹2.5 Lakhs</b></div>
        <BrochureButton className="fr-cta sm" label="Download Brochure" testid="franchise-sticky-brochure-btn" />
      </div>
    </div>
  );
}
