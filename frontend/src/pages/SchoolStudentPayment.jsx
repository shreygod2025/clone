import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { GraduationCap, CreditCard, User, Phone, Hash, Loader2, AlertCircle, CheckCircle2, School, Shield, HelpCircle, ChevronDown, ChevronUp, X, Mail, PhoneCall } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Payment-related FAQs
const paymentFAQs = [
  {
    question: "What payment methods are accepted?",
    answer: "We accept all major credit/debit cards, UPI, net banking, and popular wallets through our secure Cashfree payment gateway."
  },
  {
    question: "Is my payment information secure?",
    answer: "Yes, all payments are processed through Cashfree, a PCI-DSS compliant payment gateway. We never store your card details on our servers."
  },
  {
    question: "Will I receive a receipt after payment?",
    answer: "Yes, you will receive a confirmation message on your registered phone number with the transaction details."
  },
  {
    question: "What if my payment fails?",
    answer: "If your payment fails, please retry after a few minutes. If the amount was deducted, it will be automatically refunded within 5-7 business days."
  },
  {
    question: "Can I pay in installments?",
    answer: "The fee structure is set by your school. Please contact your school administration for any installment options."
  }
];

const FAQItem = ({ faq }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors px-2 rounded-lg"
      >
        <span className="font-medium text-slate-700 pr-4 text-sm">{faq.question}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>
      {isOpen && (
        <div className="pb-4 px-2 text-sm text-slate-600 leading-relaxed">
          {faq.answer}
        </div>
      )}
    </div>
  );
};

const SchoolStudentPayment = () => {
  const { schoolId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [error, setError] = useState(null);
  
  // Form state
  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [grade, setGrade] = useState('');
  const [division, setDivision] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(0);
  
  // Payment state
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cashfreeReady, setCashfreeReady] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  
  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Load Cashfree SDK
  useEffect(() => {
    if (window.Cashfree) {
      setCashfreeReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      console.log('Cashfree SDK loaded');
      setCashfreeReady(true);
    };
    script.onerror = () => {
      console.error('Failed to load Cashfree SDK');
    };
    document.head.appendChild(script);
  }, []);

  // Fetch school info
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        const response = await axios.get(`${API}/school-payment/${schoolId}`);
        setSchoolInfo(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch school info:', err);
        setError(err.response?.data?.detail || 'Failed to load payment page. This school may not have online payment enabled.');
      } finally {
        setLoading(false);
      }
    };
    
    if (schoolId) {
      fetchSchoolInfo();
    }
  }, [schoolId]);

  // Update amount when grade changes
  useEffect(() => {
    if (grade && schoolInfo?.grade_pricing) {
      const gradeInfo = schoolInfo.grade_pricing.find(g => g.grade === grade);
      setSelectedAmount(gradeInfo?.price || 0);
    }
  }, [grade, schoolInfo]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const validateForm = () => {
    if (!studentName.trim()) {
      toast.error('Please enter student name');
      return false;
    }
    if (!phone.trim() || phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return false;
    }
    if (!grade) {
      toast.error('Please select grade');
      return false;
    }
    if (!selectedAmount || selectedAmount <= 0) {
      toast.error('Invalid fee amount');
      return false;
    }
    return true;
  };

  const handlePayNow = useCallback(async () => {
    if (!validateForm()) return;
    
    if (!cashfreeReady) {
      toast.error('Payment system is loading. Please wait a moment.');
      return;
    }

    setProcessingPayment(true);
    setPaymentError(null);

    try {
      // Create payment session
      const response = await axios.post(`${API}/school-payment/create-session`, {
        school_id: schoolId,
        student_name: studentName.trim(),
        phone: phone.trim(),
        grade: grade,
        division: division.trim(),
        amount: selectedAmount
      });

      if (!response.data.success || !response.data.payment_session_id) {
        throw new Error('Failed to create payment session');
      }

      const { payment_session_id, environment, order_id } = response.data;

      // Initialize Cashfree
      const cashfree = window.Cashfree({
        mode: environment === 'sandbox' ? 'sandbox' : 'production'
      });

      // Open checkout
      const result = await cashfree.checkout({
        paymentSessionId: payment_session_id,
        redirectTarget: '_modal'
      });

      if (result.error) {
        console.error('Payment error:', result.error);
        setPaymentError(result.error.message || 'Payment was not completed');
        toast.error(result.error.message || 'Payment was not completed');
      }

      if (result.redirect || result.paymentDetails) {
        // Verify payment
        try {
          const verifyResponse = await axios.get(`${API}/school-payment/verify/${order_id}`);
          if (verifyResponse.data.status === 'PAID') {
            setPaymentSuccess(true);
            setTransactionId(verifyResponse.data.transaction_id);
            toast.success('Payment successful!');
          } else {
            setPaymentError('Payment verification pending. Please check back later.');
          }
        } catch (e) {
          console.error('Verification error:', e);
          setPaymentError('Payment verification failed. Please contact school administrator.');
        }
      }

    } catch (err) {
      console.error('Payment error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Payment failed. Please try again.';
      setPaymentError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setProcessingPayment(false);
    }
  }, [cashfreeReady, schoolId, studentName, phone, grade, division, selectedAmount]);

  // Get program name (skill) or default
  const programName = schoolInfo?.skill || 'Program';

  // Header component
  const Header = () => (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
              alt="OLL Logo"
              className="h-10 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="hidden sm:inline">Secure Payment</span>
          </div>
        </div>
      </div>
    </header>
  );

  // Footer component
  const Footer = () => (
    <footer className="bg-[#1E3A5F] text-white mt-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
              alt="OLL Logo"
              className="h-8 w-auto brightness-0 invert"
            />
          </div>
          
          {/* Contact Info */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/80">
            <a href="mailto:info@oll.co" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail className="w-4 h-4" />
              info@oll.co
            </a>
            <span className="text-white/40">|</span>
            <a href="tel:+919920188188" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <PhoneCall className="w-4 h-4" />
              +91 9920188188
            </a>
          </div>
          
          <p className="text-sm text-white/60 text-center">
            © {new Date().getFullYear()} Clonefutura Live Solutions Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );

  // Help Modal
  const HelpModal = () => (
    <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#1E3A5F]" />
            Payment FAQs
          </DialogTitle>
        </DialogHeader>
        
        <div className="divide-y divide-slate-100">
          {paymentFAQs.map((faq, idx) => (
            <FAQItem key={idx} faq={faq} />
          ))}
        </div>
        
        {/* Contact Support */}
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
          <p className="text-sm font-medium text-slate-700">Still need help?</p>
          <div className="space-y-2">
            <a 
              href="mailto:info@oll.co" 
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#C53030] transition-colors"
            >
              <Mail className="w-4 h-4" />
              info@oll.co
            </a>
            <a 
              href="tel:+919920188188" 
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#C53030] transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              +91 9920188188
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#C53030] mx-auto mb-4" />
            <p className="text-slate-500">Loading payment page...</p>
          </div>
        </div>
        <Footer />
        <HelpModal />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">Payment Not Available</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <Link to="/" className="text-[#C53030] hover:underline font-medium">
              Return to Home
            </Link>
          </div>
        </div>
        <Footer />
        <HelpModal />
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Payment Successful!</h1>
            <p className="text-slate-600 mb-6">
              Thank you for your payment. Your registration is confirmed.
            </p>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Student</span>
                <span className="font-medium text-slate-800">{studentName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">School</span>
                <span className="font-medium text-slate-800">{schoolInfo?.school_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Program</span>
                <span className="font-medium text-slate-800">{programName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Grade</span>
                <span className="font-medium text-slate-800">{grade} {division && `- ${division}`}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-bold text-green-600 text-lg">{formatCurrency(selectedAmount)}</span>
              </div>
              {transactionId && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Transaction ID</span>
                  <span className="font-mono text-sm text-slate-600">{transactionId}</span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-slate-500">
              A confirmation will be sent to {phone}
            </p>
          </div>
        </div>
        <Footer />
        <HelpModal />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{programName} Fee Payment | {schoolInfo?.school_name || 'School'} | OLL</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        <Header />
        
        <main className="flex-1 py-8 px-4">
          <div className="max-w-lg mx-auto">
            {/* School Header Card */}
            <div className="bg-[#1E3A5F] text-white rounded-2xl p-6 mb-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <School className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold" data-testid="school-name">
                    {schoolInfo?.school_name}
                  </h1>
                  <p className="text-white/80 text-sm mt-1" data-testid="skill-name">
                    {programName} Fee Payment
                  </p>
                  {schoolInfo?.city && (
                    <p className="text-white/60 text-sm mt-1">{schoolInfo.city}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="bg-white rounded-2xl shadow-lg p-6" data-testid="payment-form">
              <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-[#C53030]" />
                Student Details
              </h2>
              
              <div className="space-y-5">
                {/* Student Name */}
                <div>
                  <Label className="text-slate-700 flex items-center gap-2 mb-2 font-medium">
                    Student Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter student's full name as per school records"
                    className="h-12 border-slate-200 focus:border-[#C53030] focus:ring-[#C53030]"
                    data-testid="student-name-input"
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label className="text-slate-700 flex items-center gap-2 mb-2 font-medium">
                    Parent's Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">+91</span>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit mobile number"
                      className="h-12 pl-12 border-slate-200 focus:border-[#C53030] focus:ring-[#C53030]"
                      data-testid="phone-input"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Payment receipt will be sent to this number</p>
                </div>

                {/* Grade Selection - Without amount in dropdown */}
                <div>
                  <Label className="text-slate-700 flex items-center gap-2 mb-2 font-medium">
                    <GraduationCap className="w-4 h-4" />
                    Grade / Class <span className="text-red-500">*</span>
                  </Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger className="h-12 border-slate-200" data-testid="grade-select">
                      <SelectValue placeholder="Select student's grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolInfo?.grade_pricing?.map((g) => (
                        <SelectItem key={g.grade} value={g.grade}>
                          Grade {g.grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Division */}
                <div>
                  <Label className="text-slate-700 flex items-center gap-2 mb-2 font-medium">
                    <Hash className="w-4 h-4" />
                    Division / Section <span className="text-slate-400 text-sm font-normal">(Optional)</span>
                  </Label>
                  <Input
                    value={division}
                    onChange={(e) => setDivision(e.target.value.toUpperCase())}
                    placeholder="e.g., A, B, C"
                    className="h-12 border-slate-200 focus:border-[#C53030] focus:ring-[#C53030]"
                    maxLength={5}
                    data-testid="division-input"
                  />
                </div>
              </div>

              {/* Amount Display - Shown after grade selection */}
              {grade && selectedAmount > 0 && (
                <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-green-800 font-semibold text-lg">{programName} Fee</p>
                      <p className="text-green-600 text-sm">Grade {grade}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-700" data-testid="fee-amount">
                        {formatCurrency(selectedAmount)}
                      </p>
                      <p className="text-xs text-green-600">Inclusive of all taxes</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {paymentError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{paymentError}</p>
                </div>
              )}

              {/* Pay Button */}
              <Button
                onClick={handlePayNow}
                disabled={processingPayment || !cashfreeReady || !grade}
                className="w-full mt-6 h-14 bg-[#C53030] hover:bg-[#9B2C2C] text-white text-lg font-semibold shadow-lg shadow-red-200 transition-all"
                data-testid="pay-button"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : !cashfreeReady ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Loading Payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    {grade ? `Pay ${formatCurrency(selectedAmount)}` : 'Select Grade to Pay'}
                  </>
                )}
              </Button>

              {/* Security Note */}
              <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-sm">
                <Shield className="w-4 h-4 text-green-600" />
                <span>Secure payment powered by</span>
                <span className="font-semibold text-slate-700">Cashfree</span>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Help Modal */}
      <HelpModal />
    </>
  );
};

export default SchoolStudentPayment;
