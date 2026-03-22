/**
 * BulkEmailModal — reusable compose + send modal for OLL School Emails
 * Used for: Bulk contact emails, meeting followup, onboarding steps, payment emails
 */
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { Mail, Send, Save, ChevronDown, X, Eye, EyeOff, Plus } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const getAuthHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function BulkEmailModal({
  open,
  onClose,
  // Pre-filled values (editable)
  initialSubject = '',
  initialBody = '',
  // Recipients: [{email, name, school_name?}]
  recipients = [],
  // Mode
  mode = 'bulk',          // 'bulk' | 'meeting_followup' | 'onboarding_step' | 'payment'
  // For specific modes
  schoolId = null,
  stepKey = null,
  stepTitle = null,
  tranche = null,
  trancheIndex = 0,
  paymentType = 'invoice',  // 'invoice' | 'reminder' | 'overdue'
  notes = '',
  nextSteps = '',
  onSent = null,
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject(initialSubject);
      setBody(initialBody);
      setPreview(false);
      setSaveTemplate(false);
      setTemplateName('');
    }
  }, [open, initialSubject, initialBody]);

  // Load saved templates
  useEffect(() => {
    if (open) {
      axios.get(`${API}/email-templates`, { headers: getAuthHeaders() })
        .then(r => setTemplates(r.data || []))
        .catch(() => {});
    }
  }, [open]);

  const handleSend = async () => {
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!body.trim()) { toast.error('Email body is required'); return; }
    setSending(true);
    try {
      let res;
      if (mode === 'bulk') {
        res = await axios.post(`${API}/schools/contacts/bulk-email`, {
          contacts: recipients,
          subject, body_html: body,
          save_as_template: saveTemplate,
          template_name: templateName,
        }, { headers: getAuthHeaders() });
        toast.success(res.data.message || 'Emails sent!');
      } else if (mode === 'meeting_followup') {
        res = await axios.post(`${API}/schools/${schoolId}/send-meeting-followup`, {
          subject, body_html: body, notes, next_steps: nextSteps,
        }, { headers: getAuthHeaders() });
        toast.success(res.data.message || 'Followup email sent!');
      } else if (mode === 'onboarding_step') {
        res = await axios.post(`${API}/schools/${schoolId}/send-onboarding-step-email`, {
          step_key: stepKey, step_title: stepTitle, subject, body_html: body,
        }, { headers: getAuthHeaders() });
        toast.success(res.data.message || 'Email sent!');
      } else if (mode === 'payment') {
        res = await axios.post(`${API}/schools/${schoolId}/send-payment-email`, {
          type: paymentType, tranche, tranche_index: trancheIndex, subject,
        }, { headers: getAuthHeaders() });
        toast.success(res.data.message || 'Payment email sent!');
      }
      onSent && onSent(res?.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (tpl) => {
    setSubject(tpl.subject);
    setBody(tpl.body_html);
    setShowTemplates(false);
  };

  const VARS_HINT = '{{name}} {{school_name}}';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" data-testid="bulk-email-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#1E3A5F]" />
            {mode === 'bulk' ? 'Compose Bulk Email' :
             mode === 'meeting_followup' ? 'Send Meeting Followup' :
             mode === 'onboarding_step' ? `Send Email — ${stepTitle}` :
             `Send ${paymentType === 'invoice' ? 'Invoice' : paymentType === 'reminder' ? 'Reminder' : 'Overdue Notice'}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Recipients preview */}
          {recipients.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-800 mb-1.5">
                To: {recipients.length} recipient{recipients.length > 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recipients.slice(0, 6).map((r, i) => (
                  <span key={i} className="text-xs bg-white border border-blue-200 rounded px-2 py-0.5 text-blue-700">
                    {r.name ? `${r.name} <${r.email}>` : r.email}
                  </span>
                ))}
                {recipients.length > 6 && (
                  <span className="text-xs text-blue-600">+{recipients.length - 6} more</span>
                )}
              </div>
            </div>
          )}

          {/* Template picker */}
          {templates.length > 0 && (
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}
                className="w-full justify-between text-slate-600">
                <span>Use a saved template</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
              {showTemplates && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => applyTemplate(t)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0">
                      <p className="font-medium text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.subject}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subject */}
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1.5">Subject *</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Email subject..." data-testid="email-subject-input" />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold text-slate-600">
                Body (HTML supported) *
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Variables: {VARS_HINT}</span>
                <button onClick={() => setPreview(!preview)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                  {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {preview ? 'Edit' : 'Preview'}
                </button>
              </div>
            </div>
            {preview ? (
              <div className="border border-slate-200 rounded-lg p-4 min-h-[200px] bg-white text-sm"
                dangerouslySetInnerHTML={{ __html: body }} />
            ) : (
              <textarea value={body} onChange={e => setBody(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm font-mono min-h-[200px] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 resize-y"
                placeholder="<p>Write your email here...</p>&#10;&#10;Use {{name}} and {{school_name}} for personalization."
                data-testid="email-body-input" />
            )}
          </div>

          {/* Save as template */}
          {mode === 'bulk' && (
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <input type="checkbox" id="saveTemplate" checked={saveTemplate}
                onChange={e => setSaveTemplate(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#1E3A5F] cursor-pointer" />
              <div className="flex-1">
                <label htmlFor="saveTemplate" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Save as template for future use
                </label>
                {saveTemplate && (
                  <Input value={templateName} onChange={e => setTemplateName(e.target.value)}
                    placeholder="Template name..." className="mt-2 h-8 text-sm"
                    data-testid="template-name-input" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim()}
            className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white gap-2"
            data-testid="send-email-btn">
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : `Send${recipients.length > 0 ? ` to ${recipients.length}` : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
