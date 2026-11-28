import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : '/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // Multi-step: 'email' -> 'otp' -> 'reset' -> 'success'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading states
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Resend OTP countdown timer
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef(null);

  // Pre-fill email from query param if available (?email=xyz@oll.co)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location.search]);

  // Handle countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      timerRef.current = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendCooldown]);

  // STEP 1: Send OTP to Email
  const handleRequestOTP = async (e) => {
    if (e) e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error('Please enter your registered email address');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await axios.post(`${API}/auth/forgot-password`, { email: trimmedEmail });
      toast.success(res.data?.message || '6-digit OTP sent to your email!');
      setStep('otp');
      setResendCooldown(60);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to send OTP. Please check your email.';
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  // STEP 2: Verify 6-digit OTP
  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault();

    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error('Please enter the full 6-digit OTP code');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await axios.post(`${API}/auth/verify-reset-otp`, {
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
      });
      if (res.data?.reset_token) {
        setResetToken(res.data.reset_token);
      }
      toast.success('OTP verified successfully! Now set your new password.');
      setStep('reset');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Invalid or expired OTP. Please try again.';
      toast.error(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  // STEP 3: Reset Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();

    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await axios.post(`${API}/auth/reset-password`, {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        reset_token: resetToken || null,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success(res.data?.message || 'Password reset successfully!');
      setStep('success');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to reset password. Please request a new OTP.';
      toast.error(msg);
    } finally {
      setResettingPassword(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0 || sendingOtp) return;
    await handleRequestOTP();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="block mb-8">
          <img
            src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/rugags0w_OLL-horizontal-logo-white.png"
            alt="OLL"
            className="h-12 mx-auto"
          />
        </Link>

        {/* Card */}
        <div
          className="glass-card rounded-3xl p-8 animate-slide-up shadow-2xl border border-white/20"
          style={{ background: 'rgba(255, 255, 255, 0.96)' }}
        >
          {/* ════════════════════ STEP 1: ENTER EMAIL ════════════════════ */}
          {step === 'email' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-sm">
                  <KeyRound className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Forgot Password?
                </h1>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                  Enter your registered admin or center email address and we will send a 6-digit OTP code to reset your password.
                </p>
              </div>

              <form onSubmit={handleRequestOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Registered Email Address *
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      required
                      placeholder="e.g. name@oll.co"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl pl-10 text-sm border-slate-300 focus:border-blue-500"
                      autoFocus
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={sendingOtp}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition"
                >
                  {sendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending 6-Digit OTP…</span>
                    </>
                  ) : (
                    <>
                      <span>Send 6-Digit OTP</span>
                      <Mail className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <Link
                  to="/admin/login"
                  className="text-xs font-medium text-slate-500 hover:text-blue-600 inline-flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </div>
          )}

          {/* ════════════════════ STEP 2: ENTER 6-DIGIT OTP ════════════════════ */}
          {step === 'otp' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 mb-3 shadow-sm">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Enter 6-Digit OTP
                </h1>
                <div className="mt-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 text-blue-950 text-xs">
                  <p className="font-semibold">
                    Enter the 6-digit OTP sent to your respective email:
                  </p>
                  <p className="font-bold text-blue-700 mt-0.5 break-all">{email}</p>
                </div>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-center">
                    6-Digit Verification Code *
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-14 rounded-xl text-center text-2xl font-bold tracking-[0.4em] font-mono border-slate-300 focus:border-blue-500 text-[#1E3A5F]"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 text-center mt-1.5">
                    Valid for 10 minutes. Please check your Inbox and Spam folder.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={verifyingOtp || otp.length !== 6}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Code…</span>
                    </>
                  ) : (
                    <>
                      <span>Verify OTP & Continue</span>
                      <ShieldCheck className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Resend OTP & Change Email Options */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-slate-500 hover:text-slate-700 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Change Email</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || sendingOtp}
                  className={`font-semibold inline-flex items-center gap-1 ${
                    resendCooldown > 0
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${sendingOtp ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════ STEP 3: RESET PASSWORD FORM ════════════════════ */}
          {step === 'reset' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-3 shadow-sm">
                  <Lock className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Reset Password
                </h1>
                <p className="text-slate-500 text-xs mt-1.5">
                  OTP verified! Enter your new password and confirm it below.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    New Password *
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12 rounded-xl pr-12 text-sm border-slate-300 focus:border-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`h-12 rounded-xl pr-12 text-sm border-slate-300 focus:border-blue-500 ${
                        confirmPassword && newPassword !== confirmPassword
                          ? 'border-rose-400 bg-rose-50/20'
                          : confirmPassword && newPassword === confirmPassword
                          ? 'border-emerald-400 bg-emerald-50/20'
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Match Status */}
                {confirmPassword && (
                  <div className="text-[11px] font-medium flex items-center gap-1.5">
                    {newPassword === confirmPassword ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Passwords match
                      </span>
                    ) : (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Passwords do not match
                      </span>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={
                    resettingPassword ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword !== confirmPassword ||
                    newPassword.length < 6
                  }
                  className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  {resettingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password…</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <Lock className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* ════════════════════ STEP 4: SUCCESS VIEW ════════════════════ */}
          {step === 'success' && (
            <div className="text-center py-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 shadow-sm animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Password Reset Successfully!
              </h1>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                Your account password has been updated. You can now sign in with your new password.
              </p>

              <div className="mt-6">
                <Button
                  onClick={() => navigate('/admin/login')}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition"
                >
                  <span>Proceed to Admin Login</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Back to Home Link */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-white/70 hover:text-white text-xs transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
