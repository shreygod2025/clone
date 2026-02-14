import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle2, XCircle, Clock, Loader2, Phone, User, Calendar, BookOpen, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StudentPayment = () => {
  const { studentId } = useParams();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId) {
      // Verify payment after redirect
      verifyPayment();
    } else if (studentId) {
      // Fetch payment info for student
      fetchPaymentInfo();
    }
  }, [studentId, orderId]);

  const fetchPaymentInfo = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/payments/student/${studentId}`);
      setPaymentInfo(response.data);
    } catch (err) {
      setError('Unable to fetch payment information. Please check your link.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async () => {
    try {
      setVerifying(true);
      const response = await axios.get(`${API}/payments/verify/${orderId}`);
      setVerificationResult(response.data);
    } catch (err) {
      setError('Unable to verify payment. Please contact support.');
      console.error(err);
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8f] flex items-center justify-center">
        <Helmet>
          <title>Loading... | OLL Payment</title>
        </Helmet>
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading payment information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8f] flex items-center justify-center p-4">
        <Helmet>
          <title>Error | OLL Payment</title>
        </Helmet>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Oops!</h1>
          <p className="text-slate-600">{error}</p>
          <a 
            href="/" 
            className="mt-6 inline-block text-[#1E3A5F] hover:underline"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // Payment verification result (after redirect from payment gateway)
  if (verificationResult) {
    const isSuccess = verificationResult.status === 'PAID' || verificationResult.status === 'SUCCESS';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8f] flex items-center justify-center p-4">
        <Helmet>
          <title>{isSuccess ? 'Payment Successful' : 'Payment Status'} | OLL</title>
        </Helmet>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          {isSuccess ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Payment Successful!</h1>
              <p className="text-slate-600 mb-4">
                Thank you, {verificationResult.student_name}! Your payment of {formatCurrency(verificationResult.amount)} has been received.
              </p>
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-700">
                  Your batch sessions are now scheduled. You will receive further details via WhatsApp.
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Order ID: {verificationResult.order_id}
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-12 h-12 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Payment {verificationResult.status}</h1>
              <p className="text-slate-600 mb-4">
                Your payment status is: <span className="font-semibold">{verificationResult.status}</span>
              </p>
              {verificationResult.status === 'PENDING' && (
                <p className="text-sm text-slate-500">
                  If you have completed the payment, please wait a few moments and refresh this page.
                </p>
              )}
              <p className="text-xs text-slate-500 mt-4">
                Order ID: {verificationResult.order_id}
              </p>
            </>
          )}
          <a 
            href="/" 
            className="mt-6 inline-block text-[#1E3A5F] hover:underline"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // No pending payment
  if (!paymentInfo?.has_pending_payment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8f] flex items-center justify-center p-4">
        <Helmet>
          <title>No Pending Payment | OLL</title>
        </Helmet>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">No Pending Payment</h1>
          <p className="text-slate-600">
            Hi {paymentInfo?.student_name}! You don't have any pending payments at the moment.
          </p>
          <a 
            href="/" 
            className="mt-6 inline-block text-[#1E3A5F] hover:underline"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // Payment page
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8f]">
      <Helmet>
        <title>Complete Payment | OLL</title>
        <meta name="description" content="Complete your OLL batch payment securely online" />
      </Helmet>
      
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OLL" className="h-8 w-auto" onError={(e) => e.target.style.display='none'} />
            <span className="text-white font-bold text-xl">OLL</span>
          </div>
          <div className="text-white/80 text-sm">Secure Payment</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Payment Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Complete Your Payment</h1>
            </div>
            <p className="text-green-100">Secure payment powered by Cashfree</p>
          </div>

          {/* Student & Batch Info */}
          <div className="p-6 space-y-6">
            {/* Student Details */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-600" />
                Student Details
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Name</span>
                  <p className="font-medium text-slate-800">{paymentInfo.student_name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Phone</span>
                  <p className="font-medium text-slate-800 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {paymentInfo.student_phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Batch Details */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Batch Details
              </h2>
              <p className="text-blue-800 font-medium">{paymentInfo.batch_name}</p>
            </div>

            {/* Amount */}
            <div className="bg-green-50 rounded-xl p-6 text-center">
              <p className="text-sm text-green-700 mb-1">Amount to Pay</p>
              <p className="text-4xl font-bold text-green-800">
                {formatCurrency(paymentInfo.amount)}
              </p>
            </div>

            {/* Pay Button */}
            <a
              href={paymentInfo.payment_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full py-6 text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg">
                <CreditCard className="w-5 h-5 mr-2" />
                Pay Now
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </a>

            {/* Security Note */}
            <div className="text-center text-sm text-slate-500">
              <p className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Secure payment powered by Cashfree
              </p>
              <p className="mt-1 text-xs">
                Your payment information is encrypted and secure.
              </p>
            </div>
          </div>
        </div>

        {/* Order ID */}
        <p className="text-center text-white/60 text-sm mt-4">
          Order ID: {paymentInfo.order_id}
        </p>
      </div>
    </div>
  );
};

export default StudentPayment;
