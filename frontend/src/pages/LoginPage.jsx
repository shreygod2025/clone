import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Shield, GraduationCap, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { useUserAuth } from '../context/UserAuthContext';
import Navbar from '../components/Navbar';
import PhoneInput from '../components/PhoneInput';

const LoginPage = () => {
  const navigate = useNavigate();
  const { sendOTP, verifyOTP, educatorLogin } = useUserAuth();
  const [step, setStep] = useState('type'); // type, phone, otp
  const [loginType, setLoginType] = useState('student'); // student, educator
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSentViaWhatsApp, setOtpSentViaWhatsApp] = useState(false);
  const toastShownRef = useRef(false);

  const getFullPhone = () => countryCode === '+91' ? phone : `${countryCode}${phone}`;

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    const result = await sendOTP(getFullPhone(), loginType);
    setLoading(false);
    
    if (result.success) {
      setOtpSentViaWhatsApp(result.sent === true);
      if (result.sent) {
        toast.success('OTP sent to your WhatsApp!');
      } else {
        toast.error('Failed to send OTP. Please try again.');
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
    
    let result;
    if (loginType === 'educator') {
      result = await educatorLogin(getFullPhone(), otp);
    } else {
      result = await verifyOTP(getFullPhone(), otp, loginType);
    }
    setLoading(false);
    
    if (result.success) {
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        toast.success('Login successful!');
      }
      navigate(loginType === 'educator' ? '/educator-dashboard' : '/my-bookings');
    } else {
      toast.error(result.message);
    }
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtp('');
    } else if (step === 'phone') {
      setStep('type');
      setPhone('');
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

          {/* Step 1: Choose Login Type */}
          {step === 'type' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-[#1E3A5F]/10 flex items-center justify-center mx-auto mb-6">
                <Phone className="w-8 h-8 text-[#1E3A5F]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Login to OLL
              </h1>
              <p className="text-slate-500 mb-6 text-center">
                Select how you want to continue
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => { setLoginType('student'); setStep('phone'); }}
                  className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-[#1E3A5F] transition-all flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[#1E3A5F]">Learner / School</p>
                    <p className="text-sm text-slate-500">View & manage bookings</p>
                  </div>
                </button>

                <button
                  onClick={() => { setLoginType('educator'); setStep('phone'); }}
                  className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-[#D63031] transition-all flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                    <GraduationCap className="w-6 h-6 text-[#D63031]" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[#1E3A5F]">Educator</p>
                    <p className="text-sm text-slate-500">View assigned demos</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* Step 2: Enter Phone */}
          {step === 'phone' && (
            <>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                loginType === 'educator' ? 'bg-red-100' : 'bg-[#1E3A5F]/10'
              }`}>
                {loginType === 'educator' 
                  ? <GraduationCap className="w-8 h-8 text-[#D63031]" />
                  : <Phone className="w-8 h-8 text-[#1E3A5F]" />
                }
              </div>
              <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {loginType === 'educator' ? 'Educator Login' : 'Login to OLL'}
              </h1>
              <p className="text-slate-500 mb-6 text-center">
                Enter your phone number to continue
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    countryCode={countryCode}
                    onCountryCodeChange={setCountryCode}
                    placeholder="Enter phone number"
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

          {/* Step 3: Enter OTP */}
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
                      Check your WhatsApp for OTP
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

          {step !== 'type' && (
            <p className="text-center text-sm text-slate-500 mt-6">
              {loginType === 'educator' ? (
                <>Not an educator? <Link to="/educator" className="text-[#D63031] hover:underline">Apply here</Link></>
              ) : (
                <>Don't have a booking? <Link to="/student" className="text-[#D63031] hover:underline">Book a Demo</Link></>
              )}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
