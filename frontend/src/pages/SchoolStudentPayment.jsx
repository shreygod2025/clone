import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap, CreditCard, User, Phone, Hash, Loader2, AlertCircle, CheckCircle2, ChevronDown, School } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const SchoolStudentPayment = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C53030]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Payment Not Available</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Payment Successful!</h1>
          <p className="text-slate-600 mb-6">
            Thank you for your payment. Your registration is confirmed.
          </p>
          
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Student</span>
              <span className="font-medium">{studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Grade</span>
              <span className="font-medium">{grade} {division && `- ${division}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Paid</span>
              <span className="font-bold text-green-600">{formatCurrency(selectedAmount)}</span>
            </div>
            {transactionId && (
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-mono text-sm">{transactionId}</span>
              </div>
            )}
          </div>
          
          <p className="text-sm text-slate-500">
            A confirmation will be sent to {phone}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#C53030] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <School className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800" data-testid="school-name">
            {schoolInfo?.school_name}
          </h1>
          <p className="text-[#C53030] font-medium mt-1" data-testid="skill-name">
            {schoolInfo?.skill} Fees Payment
          </p>
          {schoolInfo?.city && (
            <p className="text-slate-500 text-sm">{schoolInfo.city}</p>
          )}
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6" data-testid="payment-form">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Student Details</h2>
          
          <div className="space-y-4">
            {/* Student Name */}
            <div>
              <Label className="text-slate-700 flex items-center gap-2 mb-2">
                <User className="w-4 h-4" />
                Student Name *
              </Label>
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter student's full name"
                className="h-12"
                data-testid="student-name-input"
              />
            </div>

            {/* Phone */}
            <div>
              <Label className="text-slate-700 flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4" />
                Phone Number *
              </Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                className="h-12"
                data-testid="phone-input"
              />
            </div>

            {/* Grade Selection */}
            <div>
              <Label className="text-slate-700 flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4" />
                Grade *
              </Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="h-12" data-testid="grade-select">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {schoolInfo?.grade_pricing?.map((g) => (
                    <SelectItem key={g.grade} value={g.grade}>
                      Grade {g.grade} - {formatCurrency(g.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Division */}
            <div>
              <Label className="text-slate-700 flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4" />
                Division / Section
              </Label>
              <Input
                value={division}
                onChange={(e) => setDivision(e.target.value.toUpperCase())}
                placeholder="e.g., A, B, C"
                className="h-12"
                maxLength={5}
                data-testid="division-input"
              />
            </div>
          </div>

          {/* Amount Display */}
          {grade && selectedAmount > 0 && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-green-700 font-medium">Fees for Grade {grade}</p>
                  <p className="text-green-600 text-sm">{schoolInfo?.skill}</p>
                </div>
                <p className="text-2xl font-bold text-green-700" data-testid="fee-amount">
                  {formatCurrency(selectedAmount)}
                </p>
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
            className="w-full mt-6 h-14 bg-[#C53030] hover:bg-[#9B2C2C] text-white text-lg font-semibold"
            data-testid="pay-button"
          >
            {processingPayment ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : !cashfreeReady ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Pay {grade ? formatCurrency(selectedAmount) : 'Fees'}
              </>
            )}
          </Button>

          {/* Security Note */}
          <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-xs">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secure payment powered by Cashfree
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolStudentPayment;
