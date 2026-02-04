import React, { useState, useEffect } from 'react';
import { MessageCircleQuestion, X, Loader2, Paperclip, Mic, MicOff, Square, Play, Pause, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Category mapping based on page context
const PAGE_CATEGORIES = {
  '/admin/students': { category: 'student_management', label: 'Student Management' },
  '/admin/schools': { category: 'school_management', label: 'School Management' },
  '/admin/educators': { category: 'educator_management', label: 'Educator Management' },
  '/admin/team': { category: 'team_management', label: 'Team Management' },
  '/admin/orders': { category: 'payment', label: 'Payment & Orders' },
  '/admin/support': { category: 'support', label: 'Support Center' },
  '/admin/blogs': { category: 'content', label: 'Content Management' },
  '/admin/reports': { category: 'reports', label: 'Reports & Analytics' },
  '/admin/data-center': { category: 'data_center', label: 'Data Center' },
  '/admin/users': { category: 'user_management', label: 'User Management' },
  '/admin/offerings': { category: 'offerings', label: 'Offerings' },
  '/admin/growth-partners': { category: 'growth_partner', label: 'Growth Partners' },
  '/admin': { category: 'admin_general', label: 'Admin Panel' },
  '/student': { category: 'student_inquiry', label: 'Student / Parent' },
  '/school': { category: 'school_inquiry', label: 'School Partnership' },
  '/educator': { category: 'educator_inquiry', label: 'Educator / Teacher' },
  '/centers': { category: 'center_inquiry', label: 'Center Partnership' },
  '/add': { category: 'general_inquiry', label: 'General Inquiry' },
  '/book-demo': { category: 'demo_booking', label: 'Demo Booking' },
  '/track': { category: 'onboarding_support', label: 'Onboarding Support' },
  '/': { category: 'general', label: 'General' },
};

// Query types with their sub-categories
const QUERY_TYPES = [
  { 
    value: 'course_info', 
    label: 'Course & Programs',
    icon: '📚',
    subCategories: [
      { value: 'course_content', label: 'Course Content' },
      { value: 'course_pricing', label: 'Pricing & Fees' },
      { value: 'course_schedule', label: 'Schedule & Timing' },
      { value: 'course_eligibility', label: 'Eligibility & Age' },
      { value: 'other', label: 'Other' },
    ]
  },
  { 
    value: 'demo_related', 
    label: 'Demo & Trial',
    icon: '🎯',
    subCategories: [
      { value: 'book_demo', label: 'Book a Demo' },
      { value: 'reschedule_demo', label: 'Reschedule Demo' },
      { value: 'demo_issue', label: 'Demo Issue' },
      { value: 'demo_feedback', label: 'Demo Feedback' },
      { value: 'other', label: 'Other' },
    ]
  },
  { 
    value: 'payment', 
    label: 'Payment & Billing',
    icon: '💳',
    subCategories: [
      { value: 'payment_issue', label: 'Payment Issue' },
      { value: 'invoice_request', label: 'Invoice Request' },
      { value: 'refund_request', label: 'Refund Request' },
      { value: 'emi_query', label: 'EMI / Installment' },
      { value: 'other', label: 'Other' },
    ]
  },
  { 
    value: 'technical', 
    label: 'Technical Support',
    icon: '🔧',
    subCategories: [
      { value: 'login_issue', label: 'Login Issue' },
      { value: 'app_bug', label: 'App / Website Bug' },
      { value: 'class_issue', label: 'Class / Session Issue' },
      { value: 'equipment', label: 'Equipment Issue' },
      { value: 'other', label: 'Other' },
    ]
  },
  { 
    value: 'partnership', 
    label: 'Partnership',
    icon: '🤝',
    subCategories: [
      { value: 'school_partnership', label: 'School Partnership' },
      { value: 'center_partnership', label: 'Center Partnership' },
      { value: 'educator_opportunity', label: 'Teaching Opportunity' },
      { value: 'growth_partner', label: 'Growth Partner' },
      { value: 'other', label: 'Other' },
    ]
  },
  { 
    value: 'feedback', 
    label: 'Feedback & Suggestions',
    icon: '💬',
    subCategories: [
      { value: 'positive_feedback', label: 'Positive Feedback' },
      { value: 'complaint', label: 'Complaint' },
      { value: 'suggestion', label: 'Suggestion' },
      { value: 'other', label: 'Other' },
    ]
  },
  { 
    value: 'other', 
    label: 'Other',
    icon: '❓',
    subCategories: [
      { value: 'general_query', label: 'General Query' },
      { value: 'career', label: 'Career / Jobs' },
      { value: 'media', label: 'Media / Press' },
      { value: 'other', label: 'Other' },
    ]
  },
];

const RaiseQueryButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Category, 2: Sub-category, 3: Description, 4: Contact (if not logged in)
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  
  const [formData, setFormData] = useState({
    query_type: '',
    related_to: '',
    message: '',
    name: '',
    phone: '',
    email: '',
  });
  
  const [attachments, setAttachments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordTime, setRecordTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef(null);
  const timerRef = React.useRef(null);
  
  // Check authentication on dialog open
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('oll_token');
      if (token) {
        // Try to get user info from token or stored data
        setIsLoggedIn(true);
        // Try to get user data from localStorage if available
        const storedUser = localStorage.getItem('oll_user');
        if (storedUser) {
          try {
            setUserData(JSON.parse(storedUser));
          } catch (e) {
            // Token exists but no user data - still logged in
          }
        }
      } else {
        setIsLoggedIn(false);
        setUserData(null);
      }
    }
  }, [isOpen]);

  const currentPath = window.location.pathname;
  const getPageCategory = () => {
    if (PAGE_CATEGORIES[currentPath]) return PAGE_CATEGORIES[currentPath];
    for (const [path, cat] of Object.entries(PAGE_CATEGORIES)) {
      if (currentPath.startsWith(path) && path !== '/') return cat;
    }
    return PAGE_CATEGORIES['/'];
  };
  const pageCategory = getPageCategory();

  const selectedQueryType = QUERY_TYPES.find(q => q.value === formData.query_type);
  const totalSteps = isLoggedIn ? 3 : 4;

  const handleOpen = () => {
    setFormData({
      query_type: '',
      related_to: '',
      message: '',
      name: userData?.name || userData?.full_name || '',
      phone: userData?.phone || '',
      email: userData?.email || '',
    });
    setAttachments([]);
    setAudioBlob(null);
    setAudioUrl(null);
    setStep(1);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep(1);
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch (err) {
      toast.error('Unable to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await axios.post(`${API}/upload`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setAttachments(prev => [...prev, { name: file.name, url: res.data.url, type: file.type }]);
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!formData.message.trim()) {
      toast.error('Please describe your query');
      return;
    }

    setLoading(true);
    try {
      let allAttachments = [...attachments];
      if (audioBlob) {
        const fd = new FormData();
        fd.append('file', audioBlob, 'voice-note.webm');
        const uploadRes = await axios.post(`${API}/upload`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        allAttachments.push({ name: 'Voice Note', url: uploadRes.data.url, type: 'audio/webm', isVoiceNote: true });
      }

      const queryTypeLabel = selectedQueryType?.label || 'General Query';
      const subCategoryLabel = selectedQueryType?.subCategories?.find(s => s.value === formData.related_to)?.label || '';

      await axios.post(`${API}/inquiry/query`, {
        inquiry_type: 'student',
        action_type: 'query',
        name: formData.name || userData?.name || 'Anonymous',
        phone: formData.phone || userData?.phone || '',
        email: formData.email || userData?.email || '',
        query_type: queryTypeLabel,
        related_to: subCategoryLabel,
        query_details: formData.message,
        priority: 'normal',
        source: `quick_help_${currentPath.replace(/\//g, '_').substring(0, 50)}`,
        page_context: pageCategory.label,
        attachments: allAttachments,
      });

      toast.success('Query submitted! Our team will get back to you soon.');
      handleClose();
    } catch (err) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canProceed = () => {
    if (step === 1) return !!formData.query_type;
    if (step === 2) return !!formData.related_to;
    if (step === 3) return !!formData.message.trim();
    if (step === 4) return true; // Contact info is optional
    return false;
  };

  const handleNext = () => {
    if (step === 3 && isLoggedIn) {
      handleSubmit();
    } else if (step === totalSteps) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <>
      {/* Glassmorphism Sticky Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 
          bg-white/20 backdrop-blur-xl border border-white/30 
          text-slate-800 rounded-full shadow-lg 
          hover:bg-white/30 hover:shadow-xl hover:scale-105
          transition-all duration-300 group"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.3)',
        }}
        data-testid="raise-query-btn"
      >
        <MessageCircleQuestion className="w-5 h-5 text-[#FF6B35]" />
        <span className="font-medium text-sm">Need Help?</span>
      </button>

      {/* Query Dialog */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white rounded-2xl">
          {/* Header with Progress */}
          <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2d5a8a] p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageCircleQuestion className="w-5 h-5" />
                How can we help?
              </h2>
              <button onClick={handleClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }, (_, i) => (
                <React.Fragment key={i}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step > i + 1 ? 'bg-green-400 text-white' :
                    step === i + 1 ? 'bg-white text-[#1E3A5F]' :
                    'bg-white/20 text-white/60'
                  }`}>
                    {step > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  {i < totalSteps - 1 && (
                    <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-green-400' : 'bg-white/20'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-xs text-white/70 mt-2">
              {step === 1 && 'What is your query about?'}
              {step === 2 && 'Tell us more specifically'}
              {step === 3 && 'Describe your issue'}
              {step === 4 && 'Your contact details'}
            </p>
          </div>

          {/* Step Content */}
          <div className="p-5 min-h-[280px]">
            {/* Step 1: Select Query Type */}
            {step === 1 && (
              <div className="grid grid-cols-2 gap-3">
                {QUERY_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, query_type: type.value, related_to: '' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
                      formData.query_type === type.value
                        ? 'border-[#FF6B35] bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{type.icon}</span>
                    <span className="text-sm font-medium text-slate-800">{type.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Select Sub-category */}
            {step === 2 && selectedQueryType && (
              <div className="space-y-2">
                <p className="text-sm text-slate-500 mb-3">
                  <span className="text-2xl mr-2">{selectedQueryType.icon}</span>
                  {selectedQueryType.label}
                </p>
                {selectedQueryType.subCategories.map(sub => (
                  <button
                    key={sub.value}
                    onClick={() => setFormData({ ...formData, related_to: sub.value })}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                      formData.related_to === sub.value
                        ? 'border-[#FF6B35] bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-700">{sub.label}</span>
                    {formData.related_to === sub.value && (
                      <Check className="w-5 h-5 text-[#FF6B35]" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 3: Description */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Selected category summary */}
                <div className="bg-slate-50 rounded-lg p-3 text-sm">
                  <span className="text-slate-500">Query: </span>
                  <span className="font-medium text-slate-800">
                    {selectedQueryType?.label} → {selectedQueryType?.subCategories?.find(s => s.value === formData.related_to)?.label}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Describe your issue</label>
                  <Textarea
                    placeholder="Please provide details about your query..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="min-h-[120px] resize-none"
                    data-testid="query-message"
                  />
                </div>

                {/* Attachments & Voice */}
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer text-sm transition-colors">
                    <Paperclip className="w-4 h-4 text-slate-600" />
                    <span className="text-slate-600">Attach</span>
                    <input type="file" className="hidden" multiple onChange={handleFileUpload} />
                  </label>
                  
                  {!isRecording && !audioUrl && (
                    <button
                      onClick={startRecording}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm transition-colors"
                    >
                      <Mic className="w-4 h-4 text-slate-600" />
                      <span className="text-slate-600">Voice</span>
                    </button>
                  )}

                  {isRecording && (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm animate-pulse"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>{formatTime(recordTime)}</span>
                    </button>
                  )}
                </div>

                {/* Audio Preview */}
                {audioUrl && (
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-2">
                    <button
                      onClick={() => {
                        if (isPlaying) audioRef.current?.pause();
                        else audioRef.current?.play();
                        setIsPlaying(!isPlaying);
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <span className="text-sm text-slate-600 flex-1">Voice Note ({formatTime(recordTime)})</span>
                    <button
                      onClick={() => { setAudioUrl(null); setAudioBlob(null); setRecordTime(0); }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                  </div>
                )}

                {/* Attachment Previews */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1 text-xs">
                        <Paperclip className="w-3 h-3" />
                        <span className="max-w-[80px] truncate">{att.name}</span>
                        <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Contact Details (only for non-logged-in users) */}
            {step === 4 && !isLoggedIn && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500 mb-2">
                  Please share your contact details so we can get back to you.
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                  <Input
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <Input
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t bg-slate-50 flex gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <Button
              className="flex-1 bg-[#FF6B35] hover:bg-[#E55A2B] text-white"
              onClick={handleNext}
              disabled={!canProceed() || loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {step === totalSteps || (step === 3 && isLoggedIn) ? 'Submit' : 'Continue'}
              {step < totalSteps && !(step === 3 && isLoggedIn) && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RaiseQueryButton;
