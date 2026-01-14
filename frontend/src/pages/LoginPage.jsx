import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { useUserAuth } from '../context/UserAuthContext';
import Navbar from '../components/Navbar';

const LoginPage = () => {
  const navigate = useNavigate();
  const { sendOTP, verifyOTP } = useUserAuth();
  const [step, setStep] = useState('phone'); // phone, otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSentViaWhatsApp, setOtpSentViaWhatsApp] = useState(false);
  const toastShownRef = useRef(false);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    // Send OTP without user type - backend will determine based on phone
    const result = await sendOTP(phone, 'student');
    setLoading(false);
    
    if (result.success) {
      setOtpSentViaWhatsApp(result.sent === true);
      if (result.sent) {
        toast.success('OTP sent to your WhatsApp!');
      } else {
        toast.success('OTP sent! Use 1111 for testing');
      }
      setStep('otp');
    } else {
      toast.error(result.message);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      toast.error('Please enter the OTP');
      return;
    }
    setLoading(true);
    // Verify OTP - backend returns user type automatically
    const result = await verifyOTP(phone, otp, 'student');
    setLoading(false);
    
    if (result.success) {
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        toast.success('Login successful!');
      }
      navigate('/my-bookings');
    } else {
      toast.error(result.message);
    }
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtp('');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-6 md:p-8 max-w-md w-full animate-slide-up">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-600 hover:text-[#1E3A5F] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step === 'phone' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-[#1E3A5F]/10 flex items-center justify-center mx-auto mb-6">
                <Phone className="w-8 h-8 text-[#1E3A5F]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Login to OLL
              </h1>
              <p className="text-slate-500 mb-6 text-center">
                Enter your phone number to continue
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="text-lg"
                    data-testid="login-phone"
                  />
                </div>
                <Button 
                  onClick={handleSendOTP}
                  disabled={loading || phone.length < 10}
                  className="w-full bg-[#D63031] hover:bg-[#b52828]"
                  data-testid="send-otp-btn"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </Button>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Enter OTP
              </h1>
              <p className="text-slate-500 mb-6 text-center">
                {otpSentViaWhatsApp 
                  ? <>OTP sent via <span className="text-green-600 font-medium">WhatsApp</span> to {phone}</>
                  : <>OTP sent to {phone}</>
                }
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Enter OTP</label>
                  <Input
                    type="text"
                    placeholder="••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="text-2xl text-center tracking-widest"
                    maxLength={4}
                    data-testid="login-otp"
                  />
                  {!otpSentViaWhatsApp && (
                    <p className="text-xs text-slate-400 mt-2 text-center">
                      Use <strong>1111</strong> for testing
                    </p>
                  )}
                </div>
                <Button 
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length < 4}
                  className="w-full bg-[#D63031] hover:bg-[#b52828]"
                  data-testid="verify-otp-btn"
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </Button>
                <button
                  onClick={() => {
                    setOtp('');
                    handleSendOTP();
                  }}
                  className="w-full text-sm text-slate-500 hover:text-[#1E3A5F]"
                >
                  Resend OTP
                </button>
              </div>
            </>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have a booking?{' '}
            <Link to="/student" className="text-[#D63031] hover:underline">Book a Demo</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
