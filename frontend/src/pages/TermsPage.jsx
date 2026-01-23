import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const TermsPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Terms & Conditions | OLL - Clonefutura Live Solutions</title>
        <meta name="description" content="Read OLL's terms and conditions for using our skill education platform, courses, and services." />
        <link rel="canonical" href="https://oll.co/terms" />
      </Helmet>

      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        
        <main className="flex-1 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Terms & Conditions
            </h1>
            
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm space-y-6 text-slate-700">
              <p className="text-sm text-slate-500">Last Updated: January 2025</p>
              
              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">1. Introduction</h2>
                <p>Welcome to OLL (Clonefutura Live Solutions). These Terms and Conditions govern your use of our website, mobile applications, and all related services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">2. Eligibility</h2>
                <p>Our Services are available to users of all ages. However, users under the age of 18 must have parental or guardian consent to use our Services. By using our Services, you represent that you have obtained such consent if applicable.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">3. Account Registration</h2>
                <p>To access certain features, you may need to create an account. You agree to:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Be responsible for all activities under your account</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">4. Services Description</h2>
                <p>OLL provides skill education programs including but not limited to:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Robotics education and kits</li>
                  <li>Coding and programming courses</li>
                  <li>AI and Machine Learning programs</li>
                  <li>Financial literacy and entrepreneurship training</li>
                  <li>School partnership programs</li>
                  <li>Online and offline learning modes</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">5. Payment Terms</h2>
                <p>By purchasing our courses or services:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>You agree to pay all applicable fees</li>
                  <li>Fees are non-refundable except as specified in our Refund Policy</li>
                  <li>We reserve the right to modify pricing with prior notice</li>
                  <li>Payment processing is handled by secure third-party providers</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">6. Intellectual Property</h2>
                <p>All content, materials, and intellectual property on our platform are owned by OLL or our licensors. You may not:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Copy, modify, or distribute our content without permission</li>
                  <li>Use our trademarks without written consent</li>
                  <li>Reverse engineer any part of our Services</li>
                  <li>Share course materials with non-enrolled individuals</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">7. Code of Conduct</h2>
                <p>Users must:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Behave respectfully towards educators and other students</li>
                  <li>Not engage in harassment, discrimination, or harmful behavior</li>
                  <li>Not share inappropriate content</li>
                  <li>Follow all safety guidelines during in-person sessions</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">8. Limitation of Liability</h2>
                <p>OLL shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our Services. Our total liability shall not exceed the amount paid by you for the specific service in question.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">9. Modifications</h2>
                <p>We reserve the right to modify these Terms at any time. Changes will be effective upon posting to our website. Continued use of our Services after changes constitutes acceptance of the modified Terms.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">10. Governing Law</h2>
                <p>These Terms shall be governed by the laws of India. Any disputes shall be resolved in the courts of Mumbai, Maharashtra.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">11. Contact Us</h2>
                <p>For questions about these Terms, please contact us at:</p>
                <p className="mt-2">
                  <strong>Email:</strong> legal@oll.co<br />
                  <strong>Address:</strong> Clonefutura Live Solutions Pvt. Ltd., Mumbai, Maharashtra, India
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

export default TermsPage;
