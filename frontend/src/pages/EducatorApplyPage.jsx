import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { MapPin, Briefcase, Clock, Users, IndianRupee, Calendar, Check, ChevronRight, ArrowLeft, CalendarDays, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const TIME_SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', label: 'IN' },
  { code: '+1', flag: '🇺🇸', label: 'US' },
  { code: '+44', flag: '🇬🇧', label: 'GB' },
  { code: '+971', flag: '🇦🇪', label: 'AE' },
];

export default function EducatorApplyPage() {
  const { reqId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referrerId = searchParams.get('ref') || ''; // unique referral code from email link

  const [requirement, setRequirement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [step, setStep] = useState('form'); // form | otp | success
  const [submitting, setSubmitting] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otp, setOtp] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+91',
    experience: '',
    why_interested: '',
    available_days: [],
    demo_date: null,
    demo_time: '',
  });

  useEffect(() => {
    if (reqId) fetchRequirement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqId]);

  const fetchRequirement = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/requirements/${reqId}`);
      setRequirement(res.data);
      setFormData(prev => ({ ...prev, available_days: res.data.days || [] }));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const fullPhone = () => formData.countryCode === '+91' ? formData.phone : `${formData.countryCode}${formData.phone}`;

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }
    if (formData.phone.length < 10) {
      toast.error('Enter a valid phone number');
      return;
    }
    if (!formData.demo_date || !formData.demo_time) {
      toast.error('Please select your preferred demo date and time');
      return;
    }
    // Send OTP
    setOtpSending(true);
    try {
      const otpRes = await axios.post(`${API}/api/auth/send-otp`, { phone: fullPhone(), user_type: 'educator', email: formData.email });
      setStep('otp');
      toast.success(otpRes.data?.channel === 'email' ? 'OTP sent to your email' : 'OTP sent to your WhatsApp');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyAndSubmit = async () => {
    if (!otp || otp.length !== 4) {
      toast.error('Please enter the 4-digit OTP');
      return;
    }
    setSubmitting(true);
    try {
      const verifyRes = await axios.post(`${API}/api/auth/verify-otp`, {
        phone: fullPhone(),
        otp,
      });
      if (!verifyRes.data?.verified) {
        toast.error('Invalid OTP. Please try again.');
        setSubmitting(false);
        return;
      }
      const submitRes = await axios.post(`${API}/api/educators/apply`, {
        name: formData.name,
        email: formData.email,
        phone: fullPhone(),
        skills: [requirement.skill],
        experience: formData.experience,
        grades_comfortable: [],
        city: requirement.city,
        availability: formData.available_days.join(', ') || 'Flexible',
        demo_ready: true,
        demo_date: formData.demo_date ? format(formData.demo_date, 'yyyy-MM-dd') : null,
        demo_time: formData.demo_time,
        requirement_id: requirement.id,
        requirement_title: requirement.title,
        why_interested: formData.why_interested || '',
        referred_by: referrerId || null,
        source: referrerId ? 'referral' : 'website',
      });
      const newAppId = submitRes.data?.id;
      setApplicationId(newAppId || '');
      setStep('success');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter(d => d !== day)
        : [...prev.available_days, day],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C53030]"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="text-6xl font-bold text-slate-200">404</div>
        <h2 className="text-xl font-semibold text-slate-700">This requirement is no longer available</h2>
        <Link to="/educator" className="text-[#C53030] hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> View all openings
        </Link>
      </div>
    );
  }

  // Success screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Submitted!</h2>
          <p className="text-slate-500 mb-2">You applied for <span className="font-semibold text-slate-700">{requirement?.title}</span></p>
          {formData.demo_date && formData.demo_time && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-sm font-medium text-blue-800">Demo Class Scheduled</p>
              <p className="text-sm text-blue-600 mt-1">
                {format(formData.demo_date, 'EEEE, MMMM d, yyyy')} at {formData.demo_time}
              </p>
            </div>
          )}
          {applicationId && (
            <div className="mt-6 bg-gradient-to-r from-[#D63031] to-orange-500 rounded-2xl p-5 text-left text-white">
              <p className="text-xs uppercase tracking-wide opacity-90 font-bold">Final Step</p>
              <h3 className="font-bold text-lg mt-1">Take your AI Interview now</h3>
              <p className="text-sm opacity-90 mt-1">A 15–20 minute friendly voice conversation with our AI interviewer. Quiet place + microphone required.</p>
              <Button
                onClick={() => navigate(`/educator/interview/${applicationId}`)}
                className="w-full mt-4 bg-white text-[#D63031] hover:bg-white/90 font-bold py-5"
                data-testid="go-to-interview-btn"
              >
                Start AI Interview →
              </Button>
            </div>
          )}
          <p className="text-sm text-slate-400 mt-6">Our team will get in touch with you shortly.</p>
          <Link to="/educator" className="mt-2 inline-block text-[#C53030] hover:underline text-sm">
            View all openings →
          </Link>
        </div>
      </div>
    );
  }

  // OTP screen
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <button onClick={() => setStep('form')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-[#1E3A5F]/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📱</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Verify your phone</h2>
            <p className="text-sm text-slate-500 mt-1">Enter the 4-digit OTP sent to {fullPhone()}</p>
          </div>
          <div className="flex gap-3 justify-center mb-6">
            {[0, 1, 2, 3].map(i => (
              <input
                key={i}
                type="text"
                maxLength={1}
                value={otp[i] || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  const newOtp = otp.split('');
                  newOtp[i] = val;
                  setOtp(newOtp.join('').slice(0, 4));
                  if (val && i < 3) {
                    const next = document.getElementById(`otp-${i + 1}`);
                    if (next) next.focus();
                  }
                }}
                id={`otp-${i}`}
                className="w-14 h-14 text-center text-xl font-bold border-2 rounded-xl focus:border-[#C53030] outline-none"
              />
            ))}
          </div>
          <Button
            onClick={handleVerifyAndSubmit}
            disabled={submitting || otp.length !== 4}
            className="w-full btn-primary"
          >
            {submitting ? 'Submitting...' : 'Verify & Submit Application'}
          </Button>
          <button
            onClick={async () => {
              setOtp('');
              try {
                setOtpSending(true);
                await axios.post(`${API}/api/auth/send-otp`, { phone: fullPhone(), user_type: 'educator', email: formData.email });
                toast.success('OTP resent! Valid for 10 minutes.');
              } catch(e) {
                toast.error(e.response?.data?.detail || 'Could not resend. Please wait a moment and try again.');
              } finally { setOtpSending(false); }
            }}
            className="mt-3 w-full text-center text-sm text-slate-400 hover:text-slate-600"
          >
            {otpSending ? 'Sending...' : 'Resend OTP'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/oll-logo.png" alt="OLL" className="h-8" onError={(e) => { e.target.style.display='none'; }} />
            <span className="text-xl font-bold text-[#1E3A5F]">OLL</span>
          </Link>
          <Link to="/educator" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> All Openings
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">

          {/* LEFT: Requirement Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border p-6 lg:sticky lg:top-24">
              {/* Title */}
              <div className="mb-4">
                <span className="text-xs font-medium text-[#C53030] bg-red-50 px-2 py-1 rounded-full uppercase tracking-wide">
                  Open Position
                </span>
                <h1 className="text-xl font-bold text-slate-800 mt-2 leading-snug">{requirement.title}</h1>
              </div>

              {/* Key Details */}
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm">{requirement.skill}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm">{requirement.city}{requirement.area ? `, ${requirement.area}` : ''}</span>
                </div>
                {(requirement.timing_from || requirement.timing_to) && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm">{requirement.timing_from} – {requirement.timing_to}</span>
                  </div>
                )}
                {requirement.positions > 0 && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm">{requirement.positions} position{requirement.positions > 1 ? 's' : ''}</span>
                  </div>
                )}
                {requirement.pay_amount && (
                  <div className="flex items-center gap-2 text-green-700">
                    <IndianRupee className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-semibold">
                      ₹{requirement.pay_amount} / {requirement.pay_type === 'per_session' ? 'session' : requirement.pay_type === 'per_day' ? 'day' : 'month'}
                    </span>
                  </div>
                )}
              </div>

              {/* Days */}
              {requirement.days?.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Schedule</p>
                  <div className="flex flex-wrap gap-1.5">
                    {requirement.days.map(day => (
                      <span key={day} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100">{day}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {requirement.description && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">About the Role</p>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{requirement.description}</p>
                </div>
              )}

              {/* Why OLL */}
              <div className="mt-5 pt-5 border-t space-y-2">
                {['Competitive pay', 'Flexible schedule', 'Growing community', 'Skill development'].map(b => (
                  <div key={b} className="flex items-center gap-2 text-sm text-slate-600">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    {b}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Application Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Apply for this position</h2>
                <p className="text-sm text-slate-500 mt-1">Fill in your details — we'll be in touch within 24 hours.</p>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                  <Input
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                {/* Email + Phone */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone *</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.countryCode}
                        onChange={(e) => setFormData({...formData, countryCode: e.target.value})}
                        className="border rounded-lg px-2 py-2 text-sm bg-white w-20 focus:ring-2 focus:ring-[#C53030]"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                        ))}
                      </select>
                      <Input
                        type="tel"
                        placeholder="Phone number"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                        required
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Experience in {requirement.skill}
                  </label>
                  <Textarea
                    placeholder={`Describe your experience teaching ${requirement.skill}...`}
                    value={formData.experience}
                    onChange={(e) => setFormData({...formData, experience: e.target.value})}
                    className="min-h-[90px]"
                  />
                </div>

                {/* Why Interested */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Why are you interested?</label>
                  <Textarea
                    placeholder="Tell us why this role excites you..."
                    value={formData.why_interested}
                    onChange={(e) => setFormData({...formData, why_interested: e.target.value})}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Day availability */}
                {requirement.days?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Your Availability</label>
                    <div className="flex flex-wrap gap-2">
                      {requirement.days.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                            formData.available_days.includes(day)
                              ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Demo Class Schedule - Compulsory */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-[#1E3A5F]">Demo Class Schedule *</h3>
                    <p className="text-xs text-slate-500 mt-0.5">A demo class is required. Please select your preferred date and time.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Date */}
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-2">Preferred Date *</label>
                      <div className="flex justify-center bg-slate-50 rounded-xl border border-slate-200 p-2">
                        <CalendarComponent
                          mode="single"
                          selected={formData.demo_date}
                          onSelect={(date) => setFormData({...formData, demo_date: date})}
                          disabled={(date) => date < new Date() || date > addDays(new Date(), 14) || date.getDay() === 0}
                          className="rounded-lg"
                        />
                      </div>
                    </div>
                    {/* Time */}
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-2">Preferred Time *</label>
                      <div className="grid grid-cols-2 gap-2">
                        {TIME_SLOTS.map(time => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setFormData({...formData, demo_time: time})}
                            className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                              formData.demo_time === time
                                ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                      {formData.demo_date && formData.demo_time && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-xs text-green-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span className="font-medium">{format(formData.demo_date, 'EEE, MMM d')}</span> at {formData.demo_time}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={otpSending || !formData.demo_date || !formData.demo_time}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base"
                  >
                    {otpSending ? 'Sending OTP...' : (
                      <>Continue & Verify Phone <ChevronRight className="w-4 h-4" /></>
                    )}
                  </Button>
                  <p className="text-xs text-slate-400 text-center mt-2">
                    We'll send an OTP to verify your phone number
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
