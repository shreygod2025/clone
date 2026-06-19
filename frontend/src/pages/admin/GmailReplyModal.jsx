/**
 * GmailReplyModal — composes a reply from the bot's connected Gmail account,
 * threaded under the customer's original email so it appears as a normal
 * conversation continuation. Supports:
 *   • Custom free-form replies + template picker (10 built-ins now)
 *   • Attachments persisted to GridFS (re-downloadable from ticket history)
 *   • "Auto-ack already sent" warning so admins don't re-acknowledge by mistake
 *   • Template placeholders {first_name} and {ticket_number} auto-interpolated
 */
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Inbox, Send, Loader2, ExternalLink, Paperclip, X, CheckCircle2, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CUSTOM_OPT = '__custom__';
const MAX_FILE_MB = 10;
const MAX_TOTAL_MB = 24;

const renderTemplate = (raw, ticket) => {
  const firstName = (ticket?.name || 'there').split(' ')[0];
  const ticketNumber = ticket?.ticket_number || '';
  return (raw || '')
    .replaceAll('{first_name}', firstName)
    .replaceAll('{ticket_number}', String(ticketNumber));
};

const prettyBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

const fileIcon = (mime) => (mime?.startsWith('image/') ? ImageIcon : FileText);

const GmailReplyModal = ({ ticket, onClose, onSent, getAuthHeaders }) => {
  const [templates, setTemplates] = useState([]);
  // Default to "Custom" so the admin starts from a blank slate and doesn't
  // accidentally re-send the canned ack the bot already sent. They can pick a
  // template explicitly if they want.
  const [selectedTplId, setSelectedTplId] = useState(CUSTOM_OPT);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]); // [{id, filename, content_type, size}]
  const [uploading, setUploading] = useState(false);
  // Editable subject. Prefilled with the original Gmail subject (or a sensible
  // fallback for non-Gmail tickets). Admin can change it freely; send is
  // blocked when blank.
  const initialSubject = (
    ticket?.gmail?.subject
    || ticket?.subject_summary
    || ticket?.query_type
    || `Your ticket #${ticket?.ticket_number || ''}`
  );
  const [subject, setSubject] = useState(initialSubject || '');
  const fileInputRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/gmail/templates`, { headers: getAuthHeaders() })
      .then(res => setTemplates(res.data?.templates || []))
      .catch(() => toast.error('Could not load reply templates'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickTemplate = (tplId) => {
    setSelectedTplId(tplId);
    if (tplId === CUSTOM_OPT) {
      // Custom: keep whatever's already in the box (don't clobber a draft)
      return;
    }
    const tpl = templates.find(t => t.id === tplId);
    if (tpl) setBody(renderTemplate(tpl.body, ticket));
  };

  const onFilesPicked = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    const totalAfter =
      attachments.reduce((sum, a) => sum + (a.size || 0), 0) +
      files.reduce((sum, f) => sum + f.size, 0);
    if (totalAfter > MAX_TOTAL_MB * 1024 * 1024) {
      toast.error(`Total attachments exceed ${MAX_TOTAL_MB} MB (Gmail's cap).`);
      return;
    }
    setUploading(true);
    try {
      for (const f of files) {
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          toast.error(`${f.name} is over ${MAX_FILE_MB} MB — skipped.`);
          continue;
        }
        const fd = new FormData();
        fd.append('file', f);
        const r = await axios.post(`${API}/gmail/attachments`, fd, {
          headers: { ...getAuthHeaders() },
        });
        setAttachments((prev) => [...prev, r.data]);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (!body.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }
    try {
      setSending(true);
      const res = await axios.post(
        `${API}/gmail/reply/${ticket.id}`,
        { body, subject: subject.trim(), attachment_ids: attachments.map((a) => a.id) },
        { headers: getAuthHeaders() }
      );
      toast.success(`Reply sent via Gmail${attachments.length ? ` · ${attachments.length} attachment(s)` : ''}`);
      onSent?.(res.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (!ticket) return null;
  const acctEmail = ticket.gmail?.account || 'support@oll.co';
  const gmailUrl = ticket.gmail?.gmail_url;
  const ackSent = !!ticket.gmail?.ack_sent;
  const ackSentAt = ticket.gmail?.ack_sent_at;
  const ackIsAi = !!ticket.gmail?.ack_is_ai;
  const isNonGmailTicket = !ticket.gmail?.account;
  const totalAttSize = attachments.reduce((sum, a) => sum + (a.size || 0), 0);

  return (
    <Dialog open={!!ticket} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl" data-testid="gmail-reply-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-red-500" />
            Reply via Gmail · Ticket #{ticket.ticket_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {isNonGmailTicket && (
            <div
              className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 text-xs"
              data-testid="gmail-reply-new-thread"
            >
              <Inbox className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Starting a new Gmail conversation</p>
                <p className="mt-0.5">
                  This ticket wasn't created from a Gmail inbox, so we'll send a fresh email
                  from <strong>{acctEmail}</strong>. The customer's reply will land back in that mailbox.
                </p>
              </div>
            </div>
          )}

          {ackSent && (
            <div
              className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-xs"
              data-testid="gmail-reply-ack-warning"
            >
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">
                  {ackIsAi ? 'AI-generated' : 'Automatic'} acknowledgment already sent
                  {ackSentAt && <> on {new Date(ackSentAt).toLocaleString('en-IN')}</>}.
                </p>
                <p className="mt-0.5">
                  Avoid re-sending the same &ldquo;we&apos;ll get back in 48h&rdquo; message. Pick a context-specific
                  template (refund, escalation, callback…) or write a custom reply below.
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-3 grid gap-1 text-slate-700">
            <div><span className="text-slate-500 font-medium">From:</span> {acctEmail}</div>
            <div><span className="text-slate-500 font-medium">To:</span> {ticket.name} &lt;{ticket.email}&gt;</div>
            <div>
              <label htmlFor="gmail-reply-subject" className="text-slate-500 font-medium block mb-1">Subject *</label>
              <input
                id="gmail-reply-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject line for this reply"
                required
                data-testid="gmail-reply-subject-input"
                className={`w-full px-3 py-2 text-sm border rounded-md bg-white focus:outline-none focus:ring-2 ${
                  subject.trim()
                    ? 'border-slate-200 focus:ring-blue-200'
                    : 'border-red-300 focus:ring-red-200'
                }`}
              />
              {!subject.trim() && (
                <p className="text-[11px] text-red-600 mt-1">Subject is required.</p>
              )}
            </div>
            {gmailUrl && (
              <a href={gmailUrl} target="_blank" rel="noreferrer"
                 className="text-xs text-[#1E3A5F] hover:underline inline-flex items-center gap-1 mt-1">
                Open original thread in Gmail <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Template</label>
            <Select value={selectedTplId} onValueChange={pickTemplate}>
              <SelectTrigger data-testid="gmail-reply-template-select">
                <SelectValue placeholder="Pick a template…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CUSTOM_OPT}>✏️ Custom reply (write your own)</SelectItem>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Message</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Type your reply… use {first_name} and {ticket_number} as placeholders."
              className="text-sm leading-relaxed"
              data-testid="gmail-reply-body"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Placeholders: <code>{'{first_name}'}</code>, <code>{'{ticket_number}'}</code> — auto-replaced when sent.
            </p>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600">Attachments</label>
              <span className="text-[11px] text-slate-400">
                {attachments.length > 0 && `${attachments.length} file · ${prettyBytes(totalAttSize)}`}
                {attachments.length > 0 && ` / ${MAX_TOTAL_MB} MB`}
              </span>
            </div>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={onFilesPicked}
              className="hidden"
              data-testid="gmail-reply-file-input"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs"
              data-testid="gmail-reply-attach-btn"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Paperclip className="w-3.5 h-3.5 mr-1.5" />
              )}
              {uploading ? 'Uploading…' : 'Attach file'}
            </Button>

            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1.5" data-testid="gmail-reply-attachment-list">
                {attachments.map((a) => {
                  const Icon = fileIcon(a.content_type);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs"
                      data-testid={`gmail-reply-attachment-${a.id}`}
                    >
                      <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="flex-1 truncate font-medium text-slate-700">{a.filename}</span>
                      <span className="text-slate-400">{prettyBytes(a.size || 0)}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(a.id)}
                        className="text-slate-400 hover:text-red-500"
                        aria-label="Remove attachment"
                        data-testid={`gmail-reply-attachment-remove-${a.id}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {totalAttSize > MAX_TOTAL_MB * 1024 * 1024 && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Over Gmail&apos;s {MAX_TOTAL_MB} MB cap
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim() || uploading || totalAttSize > MAX_TOTAL_MB * 1024 * 1024}
            className="bg-[#1E3A5F] text-white hover:bg-[#162a44]"
            data-testid="gmail-reply-send-btn"
          >
            {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
            Send via Gmail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GmailReplyModal;
