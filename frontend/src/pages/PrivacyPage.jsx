import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PrivacyPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Privacy Policy | OLL - Open Learning Labs</title>
        <meta name="description" content="Learn how OLL collects, uses, and protects your personal information. Our commitment to your privacy." />
        <link rel="canonical" href="https://oll.co/privacy" />
      </Helmet>

      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        
        <main className="flex-1 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Privacy Policy
            </h1>
            
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm space-y-6 text-slate-700">
              <p className="text-sm text-slate-500">Last Updated: January 2025</p>
              
              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">1. Introduction</h2>
                <p>OLL (Open Learning Labs) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">2. Information We Collect</h2>
                <h3 className="font-medium mt-3 mb-2">Personal Information:</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Name and contact information (email, phone number)</li>
                  <li>Date of birth and age</li>
                  <li>School/institution name (for students)</li>
                  <li>Address and location</li>
                  <li>Payment information (processed securely by third parties)</li>
                </ul>
                
                <h3 className="font-medium mt-3 mb-2">Usage Information:</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Device information and browser type</li>
                  <li>IP address and location data</li>
                  <li>Pages visited and features used</li>
                  <li>Course progress and performance data</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">3. How We Use Your Information</h2>
                <p>We use collected information to:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Provide and improve our educational services</li>
                  <li>Process enrollments and payments</li>
                  <li>Communicate about courses, schedules, and updates</li>
                  <li>Send promotional materials (with your consent)</li>
                  <li>Analyze usage patterns to enhance user experience</li>
                  <li>Ensure platform security and prevent fraud</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">4. Information Sharing</h2>
                <p>We may share your information with:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li><strong>Educators:</strong> To facilitate your learning experience</li>
                  <li><strong>Schools:</strong> If you're enrolled through a school program</li>
                  <li><strong>Service Providers:</strong> Payment processors, analytics services, communication platforms</li>
                  <li><strong>Legal Authorities:</strong> When required by law</li>
                </ul>
                <p className="mt-2">We do not sell your personal information to third parties.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">5. Data Security</h2>
                <p>We implement appropriate technical and organizational measures to protect your information, including:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security assessments</li>
                  <li>Access controls and authentication</li>
                  <li>Employee training on data protection</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">6. Children's Privacy</h2>
                <p>We are committed to protecting children's privacy. For users under 18:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Parental consent is required for registration</li>
                  <li>We collect only necessary information</li>
                  <li>Parents can review, modify, or delete their child's information</li>
                  <li>We do not knowingly market to children without parental consent</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">7. Your Rights</h2>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Data portability</li>
                </ul>
                <p className="mt-2">To exercise these rights, contact us at privacy@oll.co</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">8. Cookies and Tracking</h2>
                <p>We use cookies and similar technologies to:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Remember your preferences</li>
                  <li>Analyze website traffic</li>
                  <li>Improve our services</li>
                </ul>
                <p className="mt-2">You can manage cookie preferences through your browser settings.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">9. Data Retention</h2>
                <p>We retain your information for as long as necessary to provide our services and comply with legal obligations. Upon account deletion, we will remove your personal data within 90 days, except where retention is required by law.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">10. Updates to This Policy</h2>
                <p>We may update this Privacy Policy periodically. We will notify you of significant changes via email or website notice.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">11. Contact Us</h2>
                <p>For privacy-related inquiries:</p>
                <p className="mt-2">
                  <strong>Email:</strong> privacy@oll.co<br />
                  <strong>Address:</strong> OLL - Open Learning Labs Pvt. Ltd., Mumbai, Maharashtra, India
                </p>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PrivacyPage;
