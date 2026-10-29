import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ArrowRight } from 'lucide-react';
import Footer from '../../components/Footer';
import { RbAboutOLL, RB_SHARED_CSS } from '../../components/school/RbTrustSections';
import { RbSkillsCarousel } from '../../components/school/RbSkillsCarousel';
import { ParentsFeedback } from '../../components/home/ParentsFeedback';
import { InsideClassroom } from '../../components/home/InsideClassroom';
import { useSeo } from '../../hooks/useSeo';
import { OLL_LOGO_COLOR } from './franchiseContent';
import { FranchiseEnquiryForm } from './FranchiseEnquiryForm';
import { FRANCHISE_CSS } from './franchiseStyles';
import {
  FrHero, FrWhy, FrDifferent, FrParents, FrIncluded, FrServices, FrRoles, FrSpace, FrWho, FrSteps,
} from './FranchiseSections';

const CANONICAL = 'https://oll.co/franchise/robotics-ai-learning-center';

const FrNav = ({ onApply }) => (
  <div className="fr-nav-wrap">
    <nav className="fr-nav" data-testid="franchise-nav">
      <Link to="/" aria-label="OLL home"><img src={OLL_LOGO_COLOR} alt="OLL" style={{ height: 34 }} /></Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="fr-nav-invest">Investment <b>₹2.5 Lakhs</b></span>
        <button type="button" className="fr-cta sm" onClick={onApply} data-testid="franchise-nav-apply-btn">Apply Now <ArrowRight size={16} /></button>
      </div>
    </nav>
  </div>
);

const FrFinal = ({ formRef }) => (
  <section className="fr-sec fr-dark" ref={formRef} id="apply" data-testid="franchise-apply">
    <div className="rb-orb rb-orb-red" style={{ width: 480, height: 480, top: -180, left: -140 }} />
    <div className="fr-wrap fr-final">
      <div>
        <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.7rem' }}>build future innovators</div>
        <h2 className="rb-h2" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.8rem)', lineHeight: 1.08, color: '#fff' }}>
          Build More Than a Business. <span style={{ color: '#FCA5A5' }}>Build Future Innovators.</span>
        </h2>
        <p className="fr-sub" style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'left', margin: '1rem 0 0' }}>
          Imagine children in your city designing robots, building drones, experimenting with AI and turning their ideas into real-world projects. With OLL, you can help make that possible while building your own education venture.
        </p>
        <p className="fr-quote" style={{ textAlign: 'left', margin: '1.5rem 0 0' }}>The future needs creators, problem-solvers and innovators. Help your city create them.</p>
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700 }}>Ready to Start Your OLL Robotics &amp; AI Center?</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>Take the first step toward bringing future-skills education to your community. Fill in your details and our team will connect with you.</p>
        </div>
      </div>
      <FranchiseEnquiryForm />
    </div>
  </section>
);

export default function FranchiseLandingPage() {
  const formRef = useRef(null);
  const apply = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  useSeo({
    title: 'Start a Robotics & AI Learning Center Franchise | OLL — ₹2.5 Lakh Investment',
    description: 'Open your own OLL Robotics & AI Learning Center. 1 room + 1 teacher — OLL provides equipment, curriculum, teacher training, LMS, branding and marketing. Total investment ₹2.5 Lakhs.',
    canonical: CANONICAL,
    robots: 'index, follow, max-image-preview:large',
    og: { title: 'Start Your Own Robotics & AI Learning Center with OLL', description: 'All you need is 1 furnished room & 1 teacher. Rest everything is done by OLL.', type: 'website', url: CANONICAL, siteName: 'OLL' },
  });
  return (
    <div className="fr-page">
      <Toaster position="top-right" richColors />
      <style>{RB_SHARED_CSS + FRANCHISE_CSS}</style>
      <FrNav onApply={apply} />
      <FrHero onApply={apply} />
      <RbSkillsCarousel testid="franchise-skills" eyebrow="what your center will teach"
        title={<>Your city&apos;s <span style={{ color: '#FCA5A5' }}>first step</span> into the future.</>}
        subtitle="Robotics, coding, AI, drones, 3D design and more — give children in your community the chance to explore the technologies shaping tomorrow." />
      <FrWhy />
      <FrDifferent />
      <InsideClassroom />
      <FrParents />
      <FrIncluded />
      <FrServices />
      <FrRoles />
      <FrSpace />
      <FrWho />
      <FrSteps onApply={apply} />
      <RbAboutOLL />
      <ParentsFeedback />
      <FrFinal formRef={formRef} />
      <Footer />
      <div className="fr-sticky" data-testid="franchise-sticky-cta">
        <div><small>Total Investment</small><b>₹2.5 Lakhs</b></div>
        <button type="button" className="fr-cta sm" onClick={apply} data-testid="franchise-sticky-apply-btn">Apply Now <ArrowRight size={16} /></button>
      </div>
    </div>
  );
}
