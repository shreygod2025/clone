import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Shield, User, GraduationCap, Users, Building2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { useUserAuth } from '../context/UserAuthContext';
import Navbar from '../components/Navbar';

const LoginPage = () => {
  const navigate = useNavigate();
  const { sendOTP, verifyOTP } = useUserAuth();
  const [step, setStep] = useState('type'); // type, phone, otp
  const [userType, setUserType] = useState('student');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const userTypes = [
    { id: 'student', label: 'Student / Parent', icon: GraduationCap, description: 'View your demo bookings' },
    { id: 'educator', label: 'Educator', icon: Users, description: 'View your applications' },
    { id: 'school', label: 'School', icon: Building2, description: 'View your meeting bookings' },
  ];

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    const result = await sendOTP(phone, userType);
    setLoading(false);
    
    if (result.success) {
      toast.success('OTP sent! Use 1111 for testing');
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
    const result = await verifyOTP(phone, otp, userType);
    setLoading(false);
    
    if (result.success) {
      toast.success('Login successful!');
      navigate('/my-bookings');
    } else {
      toast.error(result.message);
    }
  };

  const handleBack = () => {
    if (step === 'otp') setStep('phone');
    else if (step === 'phone') setStep('type');
    else navigate('/');
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

          {step === 'type' && (
            <>
              <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Login to OLL
              </h1>
              <p className="text-slate-500 mb-6">Select your account type</p>

              <div className="space-y-3">
                {userTypes.map(type => (
                  <div
                    key={type.id}
                    className={`selection-card p-4 cursor-pointer ${userType === type.id ? 'selected' : ''}`}
                    onClick={() => {
                      setUserType(type.id);
                      setStep('phone');
                    }}
                    data-testid={`login-type-${type.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center">
                        <type.icon className="w-6 h-6 text-[#1E3A5F]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#1E3A5F]">{type.label}</h3>
                        <p className="text-sm text-slate-500">{type.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 'phone' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-[#1E3A5F]/10 flex items-center justify-center mx-auto mb-6">
                <Phone className="w-8 h-8 text-[#1E3A5F]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Enter Phone Number
              </h1>
              <p className="text-slate-500 mb-6 text-center">
                We'll send you an OTP to verify
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="Enter your phone number"
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
                OTP sent to {phone}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Enter OTP</label>
                  <Input
                    type="text"
                    placeholder="Enter 4-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="text-2xl text-center tracking-[0.5em]"
                    maxLength={4}
                    data-testid="login-otp"
                  />
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Use <strong>1111</strong> for testing
                  </p>
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
