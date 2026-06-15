/**
 * GmailReplyModal — composes a reply from the bot's connected Gmail account,
 * threaded under the customer's original email so it appears as a normal
 * conversation continuation. Pre-fills from a template picker; supports
 * template placeholders {first_name} and {ticket_number}.
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Inbox, Send, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const renderTemplate = (raw, ticket) => {
  const firstName = (ticket?.name || 'there').split(' ')[0];
  const ticketNumber = ticket?.ticket_number || '';
  return (raw || '')
    .replaceAll('{first_name}', firstName)
    .replaceAll('{ticket_number}', String(ticketNumber));
};

const GmailReplyModal = ({ ticket, onClose, onSent, getAuthHeaders }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTplId, setSelectedTplId] = useState('builtin_received');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    axios.get(`${API}/gmail/templates`, { headers: getAuthHeaders() })
      .then(res => {
        const tpls = res.data?.templates || [];
        setTemplates(tpls);
        const first = tpls.find(t => t.id === selectedTplId) || tpls[0];
        if (first) setBody(renderTemplate(first.body, ticket));
      })
      .catch(() => toast.error('Could not load reply templates'));
  }, []);

  const pickTemplate = (tplId) => {
    setSelectedTplId(tplId);
    const tpl = templates.find(t => t.id === tplId);
    if (tpl) setBody(renderTemplate(tpl.body, ticket));
  };

  const handleSend = async () => {
    if (!body.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }
    try {
      setSending(true);
      const res = await axios.post(`${API}/gmail/reply/${ticket.id}`, { body }, { headers: getAuthHeaders() });
      toast.success('Reply sent via Gmail');
      onSent?.(res.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (!ticket) return null;
  const acctEmail = ticket.gmail?.account || '—';
  const gmailUrl = ticket.gmail?.gmail_url;

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
          <div className="bg-slate-50 rounded-lg p-3 grid gap-1 text-slate-700">
            <div><span className="text-slate-500 font-medium">From:</span> {acctEmail}</div>
            <div><span className="text-slate-500 font-medium">To:</span> {ticket.name} &lt;{ticket.email}&gt;</div>
            <div><span className="text-slate-500 font-medium">Subject:</span> Re: {ticket.gmail?.subject || ticket.subject_summary}</div>
            {gmailUrl && (
              <a href={gmailUrl} target="_blank" rel="noreferrer"
                 className="text-xs text-[#1E3A5F] hover:underline inline-flex items-center gap-1 mt-1">
                Open original thread in Gmail <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Template (optional)</label>
            <Select value={selectedTplId} onValueChange={pickTemplate}>
              <SelectTrigger data-testid="gmail-reply-template-select">
                <SelectValue placeholder="Pick a template…" />
              </SelectTrigger>
              <SelectContent>
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
              rows={11}
              placeholder="Type your reply…"
              className="font-mono text-sm"
              data-testid="gmail-reply-body"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Placeholders: <code>{'{first_name}'}</code>, <code>{'{ticket_number}'}</code> — auto-replaced when sent.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || !body.trim()} className="bg-[#1E3A5F] text-white hover:bg-[#162a44]" data-testid="gmail-reply-send-btn">
            {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
            Send via Gmail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GmailReplyModal;
