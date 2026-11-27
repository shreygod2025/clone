import { useState } from 'react';
import { Phone, KeyRound, Receipt, Download, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast, Toaster } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Public receipt portal — `oll.co/receipt`
 * ----------------------------------------
 * Phone → OTP (via AiSensy WhatsApp) → list of paid receipts → download.
 * Covers ONLY `school_student_payments` (parents who paid via the school
 * online payment link). Other payment types are not exposed here.
 */
export default function PublicReceiptPage() {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'list'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [token, setToken] = useState('');
  const [payments, setPayments] = useState([]);
  const [maskedPhone, setMaskedPhone] = useState('');

  const handleSendOtp = async (e) => {
    e?.preventDefault?.();
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    setSending(true);
    try {
      const res = await axios.post(`${API}/receipts/school-student/send-otp`, { phone: clean });
      setMaskedPhone(res.data?.masked_phone || `******${clean.slice(-4)}`);
      toast.success(`OTP sent to WhatsApp ${res.data?.masked_phone || ''}`);
      setStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault?.();
    if (!otp || otp.length < 4) {
      toast.error('Please enter the 4-digit OTP');
      return;
    }
    setVerifying(true);
    try {
      const clean = phone.replace(/\D/g, '').slice(-10);
      const res = await axios.post(`${API}/receipts/school-student/verify-otp`, { phone: clean, otp });
      setToken(res.data?.token || '');
      setPayments(res.data?.payments || []);
      toast.success(`Found ${res.data?.payments?.length || 0} receipt${res.data?.payments?.length === 1 ? '' : 's'}`);
      setStep('list');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP');
    } finally {
      setVerifying(false);
    }
  };

  const handleDownload = (paymentId) => {
    if (!token) {
      toast.error('Session expired. Please verify OTP again.');
      setStep('phone');
      return;
    }
    const url = `${API}/receipts/school-student/${paymentId}/view?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col">
      <Toaster position="top-center" richColors />

      {/* Top bar */}
      <header className="px-6 py-4 border-b border-slate-100 bg-white/70 backdrop-blur">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition" data-testid="receipt-home-link">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to OLL</span>
          </a>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#1E3A5F]" />
            <span className="font-semibold text-slate-900">Payment Receipts</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {['phone', 'otp', 'list'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    step === s ? 'bg-[#1E3A5F] text-white' : ['phone', 'otp', 'list'].indexOf(step) > i ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {['phone', 'otp', 'list'].indexOf(step) > i ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                {i < 2 && <div className={`w-8 h-0.5 ${['phone', 'otp', 'list'].indexOf(step) > i ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Phone */}
          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8" data-testid="receipt-step-phone">
              <div className="w-14 h-14 bg-[#1E3A5F]/10 rounded-2xl flex items-center justify-center mb-5">
                <Phone className="w-7 h-7 text-[#1E3A5F]" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Get your payment receipt</h1>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Enter the phone number you used when paying for your child's program via the school online payment link. We'll send an OTP to verify it's you.
              </p>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phone number</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">+91</span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  className="pl-12 text-base"
                  autoFocus
                  data-testid="receipt-phone-input"
                />
              </div>
              <Button
                type="submit"
                disabled={sending || phone.length !== 10}
                className="w-full mt-6 bg-[#1E3A5F] hover:bg-[#15294a] text-white"
                data-testid="receipt-send-otp-btn"
              >
                {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending OTP...</> : 'Send OTP on WhatsApp'}
              </Button>
              <p className="text-xs text-slate-500 mt-4 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Only the phone number used at the time of online payment will receive an OTP.
              </p>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8" data-testid="receipt-step-otp">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-5">
                <KeyRound className="w-7 h-7 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Enter OTP</h1>
              <p className="text-sm text-slate-600 mb-6">
                We sent a 4-digit code to <strong>{maskedPhone}</strong> on WhatsApp.
              </p>
              <label className="block text-sm font-medium text-slate-700 mb-2">4-digit code</label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="text-center text-2xl font-bold tracking-[0.5em] py-6"
                autoFocus
                data-testid="receipt-otp-input"
              />
              <Button
                type="submit"
                disabled={verifying || otp.length < 4}
                className="w-full mt-6 bg-[#1E3A5F] hover:bg-[#15294a] text-white"
                data-testid="receipt-verify-otp-btn"
              >
                {verifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : 'Verify & View Receipts'}
              </Button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); }}
                className="w-full mt-3 text-sm text-slate-500 hover:text-slate-700"
                data-testid="receipt-change-phone-btn"
              >
                Change phone number
              </button>
            </form>
          )}

          {/* Step 3: List */}
          {step === 'list' && (
            <div data-testid="receipt-step-list">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{maskedPhone}</p>
                    <p className="text-xs text-slate-500">{payments.length} receipt{payments.length === 1 ? '' : 's'} found</p>
                  </div>
                </div>
              </div>

              {payments.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No paid receipts on file for this phone number.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition" data-testid={`receipt-card-${p.id}`}>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="font-semibold text-slate-900">{p.student_name || 'Student'}</p>
                          <p className="text-xs text-slate-500">{p.school_name}</p>
                          {(p.grade || p.skill) && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {p.grade && `Grade ${p.grade}`}{p.division ? ` - ${p.division}` : ''}{p.skill ? ` · ${p.skill}` : ''}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-600">{formatINR(p.amount)}</p>
                          <p className="text-xs text-slate-500">{formatDate(p.payment_time)}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownload(p.id)}
                        variant="outline"
                        className="w-full border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white transition"
                        data-testid={`receipt-download-${p.id}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        View / Download Receipt
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setPayments([]); setToken(''); }}
                className="w-full mt-6 text-sm text-slate-500 hover:text-slate-700"
                data-testid="receipt-different-phone-btn"
              >
                Look up a different phone number
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="px-6 py-6 border-t border-slate-100 text-center text-xs text-slate-500">
        Need help? Email <a href="mailto:info@oll.co" className="text-[#1E3A5F] font-medium">info@oll.co</a> or call <a href="tel:+919920188188" className="text-[#1E3A5F] font-medium">+91 9920188188</a>
      </footer>
    </div>
  );
}
