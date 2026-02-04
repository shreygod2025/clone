import React, { useState } from 'react';
import { MessageCircleQuestion, X, Loader2, Paperclip, Mic, MicOff, Square, Play, Pause } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Category and sub-category mapping based on page context
const PAGE_CATEGORIES = {
  // Admin pages
  '/admin/students': { category: 'student_management', label: 'Student Management' },
  '/admin/schools': { category: 'school_management', label: 'School Management' },
  '/admin/educators': { category: 'educator_management', label: 'Educator Management' },
  '/admin/team': { category: 'team_management', label: 'Team Management' },
  '/admin/orders': { category: 'payment', label: 'Payment/Orders' },
  '/admin/support': { category: 'support', label: 'Support' },
  '/admin/blogs': { category: 'content_management', label: 'Content Management' },
  '/admin/reports': { category: 'reports', label: 'Reports & Analytics' },
  '/admin/data-center': { category: 'data_center', label: 'Data Center' },
  '/admin/users': { category: 'user_management', label: 'User Management' },
  '/admin/offerings': { category: 'offerings', label: 'Offerings' },
  '/admin/growth-partners': { category: 'growth_partner', label: 'Growth Partners' },
  '/admin': { category: 'admin_dashboard', label: 'Admin Dashboard' },
  
  // Public pages
  '/student': { category: 'student_inquiry', label: 'Student/Parent Query' },
  '/school': { category: 'school_inquiry', label: 'School Query' },
  '/educator': { category: 'educator_inquiry', label: 'Educator Query' },
  '/centers': { category: 'center_inquiry', label: 'Center/Partner Query' },
  '/add': { category: 'general_inquiry', label: 'General Inquiry' },
  '/book-demo': { category: 'demo_booking', label: 'Demo Booking' },
  '/track': { category: 'onboarding_support', label: 'Onboarding Support' },
  '/': { category: 'general', label: 'General Query' },
};

const RELATED_TO_OPTIONS = {
  student_management: [
    { value: 'lead_issue', label: 'Lead Issue' },
    { value: 'conversion_issue', label: 'Conversion Issue' },
    { value: 'demo_issue', label: 'Demo Related' },
    { value: 'payment_issue', label: 'Payment Issue' },
    { value: 'other', label: 'Other' },
  ],
  school_management: [
    { value: 'lead_issue', label: 'Lead Issue' },
    { value: 'conversion_issue', label: 'Conversion Issue' },
    { value: 'onboarding_issue', label: 'Onboarding Issue' },
    { value: 'kit_delivery', label: 'Kit Delivery' },
    { value: 'contract_issue', label: 'Contract Issue' },
    { value: 'other', label: 'Other' },
  ],
  educator_management: [
    { value: 'application_issue', label: 'Application Issue' },
    { value: 'onboarding_issue', label: 'Onboarding Issue' },
    { value: 'assignment_issue', label: 'Assignment Issue' },
    { value: 'other', label: 'Other' },
  ],
  team_management: [
    { value: 'application_issue', label: 'Application Issue' },
    { value: 'onboarding_issue', label: 'Onboarding Issue' },
    { value: 'role_issue', label: 'Role/Permission Issue' },
    { value: 'other', label: 'Other' },
  ],
  payment: [
    { value: 'invoice_issue', label: 'Invoice Issue' },
    { value: 'receipt_issue', label: 'Receipt Issue' },
    { value: 'refund_request', label: 'Refund Request' },
    { value: 'payment_tracking', label: 'Payment Tracking' },
    { value: 'other', label: 'Other' },
  ],
  support: [
    { value: 'ticket_issue', label: 'Ticket Issue' },
    { value: 'escalation', label: 'Escalation' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'other', label: 'Other' },
  ],
  student_inquiry: [
    { value: 'course_info', label: 'Course Information' },
    { value: 'demo_booking', label: 'Demo Booking' },
    { value: 'fee_query', label: 'Fee Query' },
    { value: 'schedule_query', label: 'Schedule Query' },
    { value: 'other', label: 'Other' },
  ],
  school_inquiry: [
    { value: 'partnership_info', label: 'Partnership Information' },
    { value: 'pricing_query', label: 'Pricing Query' },
    { value: 'program_info', label: 'Program Information' },
    { value: 'other', label: 'Other' },
  ],
  educator_inquiry: [
    { value: 'job_inquiry', label: 'Job Inquiry' },
    { value: 'application_status', label: 'Application Status' },
    { value: 'training_info', label: 'Training Information' },
    { value: 'other', label: 'Other' },
  ],
  general: [
    { value: 'general_query', label: 'General Query' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'other', label: 'Other' },
  ],
  default: [
    { value: 'technical_issue', label: 'Technical Issue' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'bug_report', label: 'Bug Report' },
    { value: 'general_query', label: 'General Query' },
    { value: 'other', label: 'Other' },
  ],
};

const RaiseQueryButton = ({ userData = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    query_type: '',
    related_to: '',
    message: '',
    priority: 'normal',
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

  // Get current page path and determine category
  const currentPath = window.location.pathname;
  const getPageCategory = () => {
    // Try exact match first
    if (PAGE_CATEGORIES[currentPath]) {
      return PAGE_CATEGORIES[currentPath];
    }
    // Try prefix match
    for (const [path, cat] of Object.entries(PAGE_CATEGORIES)) {
      if (currentPath.startsWith(path) && path !== '/') {
        return cat;
      }
    }
    return PAGE_CATEGORIES['/'];
  };

  const pageCategory = getPageCategory();
  const relatedOptions = RELATED_TO_OPTIONS[pageCategory.category] || RELATED_TO_OPTIONS.default;

  const handleOpen = () => {
    // Pre-fill with user data if available
    const storedUser = userData || JSON.parse(localStorage.getItem('user') || '{}');
    setFormData({
      name: storedUser.name || storedUser.full_name || '',
      phone: storedUser.phone || '',
      email: storedUser.email || '',
      query_type: pageCategory.category,
      related_to: relatedOptions[0]?.value || 'other',
      message: '',
      priority: 'normal',
    });
    setAttachments([]);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsOpen(true);
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
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await axios.post(`${API}/upload`, formData, {
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
      toast.error('Please enter your query message');
      return;
    }

    setLoading(true);
    try {
      // Upload voice note if exists
      let allAttachments = [...attachments];
      if (audioBlob) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', audioBlob, 'voice-note.webm');
        const uploadRes = await axios.post(`${API}/upload`, formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        allAttachments.push({
          name: 'Voice Note',
          url: uploadRes.data.url,
          type: 'audio/webm',
          isVoiceNote: true
        });
      }

      await axios.post(`${API}/inquiry/query`, {
        inquiry_type: 'student',
        action_type: 'query',
        name: formData.name || 'Anonymous User',
        phone: formData.phone || '',
        email: formData.email || '',
        query_type: pageCategory.label,
        related_to: formData.related_to,
        query_details: formData.message,
        priority: formData.priority,
        source: `quick_support_${currentPath.replace(/\//g, '_')}`,
        attachments: allAttachments,
      });

      toast.success('Query submitted successfully! Our team will get back to you soon.');
      setIsOpen(false);
    } catch (err) {
      toast.error('Failed to submit query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Sticky Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
        data-testid="raise-query-btn"
      >
        <MessageCircleQuestion className="w-5 h-5" />
        <span className="font-medium">Need Help?</span>
      </button>

      {/* Query Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircleQuestion className="w-5 h-5 text-[#FF6B35]" />
              Raise a Query
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              Page: <span className="font-medium text-[#1E3A5F]">{pageCategory.label}</span>
            </p>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {/* Name & Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                <Input
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="query-name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <Input
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="query-phone"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <Input
                type="email"
                placeholder="Your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="query-email"
              />
            </div>

            {/* Related To (Sub-category) */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">What is this about?</label>
              <select
                value={formData.related_to}
                onChange={(e) => setFormData({ ...formData, related_to: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm"
                data-testid="query-related-to"
              >
                {relatedOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <div className="flex gap-2">
                {['low', 'normal', 'high', 'urgent'].map(p => (
                  <button
                    key={p}
                    onClick={() => setFormData({ ...formData, priority: p })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      formData.priority === p
                        ? p === 'urgent' ? 'bg-red-500 text-white'
                        : p === 'high' ? 'bg-orange-500 text-white'
                        : p === 'normal' ? 'bg-blue-500 text-white'
                        : 'bg-slate-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Your Query *</label>
              <Textarea
                placeholder="Describe your issue or question..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="min-h-[100px]"
                data-testid="query-message"
              />
            </div>

            {/* Attachments & Voice Note */}
            <div className="flex gap-2">
              <label className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer text-sm">
                <Paperclip className="w-4 h-4" />
                Attach File
                <input type="file" className="hidden" multiple onChange={handleFileUpload} />
              </label>
              
              {!isRecording && !audioUrl && (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm"
                >
                  <Mic className="w-4 h-4" />
                  Voice Note
                </button>
              )}

              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm animate-pulse"
                >
                  <Square className="w-4 h-4 fill-current" />
                  {formatTime(recordTime)}
                </button>
              )}
            </div>

            {/* Audio Preview */}
            {audioUrl && (
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-2">
                <button
                  onClick={() => {
                    if (isPlaying) {
                      audioRef.current?.pause();
                    } else {
                      audioRef.current?.play();
                    }
                    setIsPlaying(!isPlaying);
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-white rounded-full"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <span className="text-sm text-slate-600">Voice Note ({formatTime(recordTime)})</span>
                <button
                  onClick={() => {
                    setAudioUrl(null);
                    setAudioBlob(null);
                    setRecordTime(0);
                  }}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
            )}

            {/* Attachment Previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1 text-xs">
                    <Paperclip className="w-3 h-3" />
                    <span className="max-w-[100px] truncate">{att.name}</span>
                    <button
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-[#FF6B35] hover:bg-[#E55A2B]"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Query
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RaiseQueryButton;
