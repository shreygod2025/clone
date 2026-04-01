import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { CheckCircle, XCircle, AlertCircle, Clock, Mail, Phone } from 'lucide-react';

const RefundPolicyPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Refund Policy | OLL - Clonefutura Live Solutions</title>
        <meta name="description" content="OLL's refund policy for courses, kits, and educational services. Learn about our cancellation and refund procedures." />
        <link rel="canonical" href="https://www.ollindia.com/refund-policy" />
      </Helmet>

      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        
        <main className="flex-1 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Refund & Cancellation Policy
            </h1>
            
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm space-y-6 text-slate-700">
              <p className="text-sm text-slate-500">Last Updated: January 2025</p>
              
              {/* Quick Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Quick Summary</h3>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                    <span><strong>Full Refund:</strong> Cancel within 7 days of enrollment (before first class)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-600 shrink-0" />
                    <span><strong>Partial Refund:</strong> 50% refund if cancelled within 14 days</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 mt-0.5 text-red-600 shrink-0" />
                    <span><strong>No Refund:</strong> After 14 days or 3+ classes attended</span>
                  </li>
                </ul>
              </div>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">1. Course Refunds</h2>
                
                <h3 className="font-medium mt-4 mb-2">Individual Courses (Online & Offline)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border p-2 text-left">Cancellation Time</th>
                        <th className="border p-2 text-left">Refund Amount</th>
                        <th className="border p-2 text-left">Processing Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border p-2">Within 7 days (before first class)</td>
                        <td className="border p-2 text-green-600 font-medium">100% Refund</td>
                        <td className="border p-2">5-7 business days</td>
                      </tr>
                      <tr>
                        <td className="border p-2">8-14 days (max 2 classes attended)</td>
                        <td className="border p-2 text-yellow-600 font-medium">50% Refund</td>
                        <td className="border p-2">7-10 business days</td>
                      </tr>
                      <tr>
                        <td className="border p-2">After 14 days or 3+ classes</td>
                        <td className="border p-2 text-red-600 font-medium">No Refund</td>
                        <td className="border p-2">N/A</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="font-medium mt-4 mb-2">School Programs</h3>
                <p>For school partnership programs, refund terms are as per the signed agreement. Generally:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Cancellation before program start: Full refund minus 10% admin fee</li>
                  <li>Mid-program cancellation: Pro-rated refund for unused sessions</li>
                  <li>Kit components already delivered are non-refundable</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">2. Robotics Kits & Products</h2>
                <p>For physical products purchased from our store:</p>
                
                <div className="mt-3 space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">Eligible for Return</p>
                      <p className="text-sm text-green-700">Unopened, unused kits within 7 days of delivery. Original packaging must be intact.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Exchange Only</p>
                      <p className="text-sm text-yellow-700">Defective or damaged items can be exchanged within 14 days. Please share photos of damage.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Non-Refundable</p>
                      <p className="text-sm text-red-700">Opened kits, consumable items, downloadable content, and items damaged by user.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">3. Demo Sessions</h2>
                <p>Free demo sessions can be rescheduled or cancelled at no cost. If you've paid for a trial/demo:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Full refund if cancelled 24+ hours before scheduled time</li>
                  <li>No refund for no-shows or cancellation within 24 hours</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">4. Special Circumstances</h2>
                <p>We may offer full or partial refunds outside standard policy for:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Medical emergencies (with documentation)</li>
                  <li>Relocation to areas without service coverage</li>
                  <li>Service quality issues on our end</li>
                  <li>Course cancellation by OLL</li>
                </ul>
                <p className="mt-2">Each case is reviewed individually. Please contact support with relevant documentation.</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">5. How to Request a Refund</h2>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#D63031] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
                    <div>
                      <p className="font-medium">Submit Request</p>
                      <p className="text-sm text-slate-600">Email support@oll.co or use the <Link to="/support" className="text-[#D63031] hover:underline">Support page</Link> with your order/enrollment details.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#D63031] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
                    <div>
                      <p className="font-medium">Review Process</p>
                      <p className="text-sm text-slate-600">Our team will review your request within 2-3 business days.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#D63031] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
                    <div>
                      <p className="font-medium">Refund Processing</p>
                      <p className="text-sm text-slate-600">Approved refunds are processed to the original payment method within 5-10 business days.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-[#1E3A5F] mb-3">6. Contact Us</h2>
                <p>For refund inquiries or special circumstances:</p>
                <div className="mt-3 flex flex-col sm:flex-row gap-4">
                  <a href="mailto:info@oll.co" className="flex items-center gap-2 text-[#D63031] hover:underline">
                    <Mail className="w-4 h-4" /> info@oll.co
                  </a>
                  <a href="tel:+919920188188" className="flex items-center gap-2 text-[#D63031] hover:underline">
                    <Phone className="w-4 h-4" /> +91 99201 88188
                  </a>
                </div>
                <p className="mt-3 text-sm text-slate-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Response time: 24-48 hours (Mon-Sat, 10 AM - 6 PM)
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

export default RefundPolicyPage;
