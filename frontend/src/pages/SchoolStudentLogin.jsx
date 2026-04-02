import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, ArrowRight, Loader2, KeyRound, School } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SchoolStudentLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/send-otp`, {
        phone: phone,
        user_type: 'school_student'
      });
      toast.success('OTP sent to your WhatsApp!');
      setStep('otp');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length < 4) {
      toast.error('Please enter the 4-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/verify-otp`, {
        phone: phone,
        otp: otp,
        user_type: 'school_student'
      });
      
      if (!res.data.is_registered) {
        toast.error('No payment records found for this phone number. Please check your phone number.');
        setLoading(false);
        return;
      }
      
      // Store phone in session for the dashboard
      sessionStorage.setItem('school_student_phone', phone);
      toast.success('Login successful!');
      navigate('/school-student/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Navbar />
      
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#1E3A5F] rounded-full flex items-center justify-center mx-auto mb-4">
              <School className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">School Student Login</h1>
            <p className="text-slate-600 mt-2">
              Access your payment receipts and profile
            </p>
          </div>
          
          {step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type="tel"
                    placeholder="Enter your 10-digit phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="pl-10"
                    maxLength={10}
                    data-testid="phone-input"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Use the phone number you used during payment
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-[#1E3A5F] hover:bg-[#2a4a73] gap-2"
                disabled={loading || phone.length < 10}
                data-testid="send-otp-btn"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Send OTP
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-slate-600">
                  OTP sent to <span className="font-semibold">+91 {phone}</span>
                </p>
                <button 
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-sm text-blue-600 hover:underline mt-1"
                >
                  Change number
                </button>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Enter OTP
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Enter 4-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="pl-10 text-center text-2xl tracking-widest"
                    maxLength={4}
                    data-testid="otp-input"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-[#1E3A5F] hover:bg-[#2a4a73] gap-2"
                disabled={loading || otp.length < 4}
                data-testid="verify-otp-btn"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Verify & Login
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
              
              <button 
                type="button"
                onClick={handleSendOTP}
                className="w-full text-sm text-slate-600 hover:text-[#1E3A5F]"
                disabled={loading}
              >
                Didn't receive OTP? Resend
              </button>
            </form>
          )}
          
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-slate-500">
              Need help? Contact <a href="mailto:info@oll.co" className="text-blue-600 hover:underline">info@oll.co</a>
            </p>
          </div>
        </div>
        
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-slate-600 hover:text-[#1E3A5F]">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SchoolStudentLogin;
