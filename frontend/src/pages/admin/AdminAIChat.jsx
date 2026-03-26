import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AdminLayout } from './AdminDashboard';
import axios from 'axios';
import { toast } from 'sonner';
import { generateProposalDocument } from '../../utils/proposalPdfGenerator';
import { generateMOUDocument } from '../../utils/mouPdfGenerator';
import {
  Send, Plus, Bot, CheckCircle, XCircle,
  Download, FileText, Building2, Mail, Tag, StickyNote,
  UserCheck, Ticket, Loader2, Sparkles, Trash2, Calendar, CalendarCheck,
  Mic, MicOff
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeaders() {
  const token = localStorage.getItem('oll_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Action type config ────────────────────────────────────────────────────
const ACTION_CFG = {
  create_lead:       { label: 'Lead Created',        Icon: Building2,     cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  update_lead:       { label: 'Lead Updated',        Icon: Building2,     cls: 'bg-blue-50 border-blue-200 text-blue-800' },
  delete_lead:       { label: 'Lead Deleted',        Icon: Building2,     cls: 'bg-red-50 border-red-200 text-red-800' },
  change_status:     { label: 'Status Changed',      Icon: Tag,           cls: 'bg-violet-50 border-violet-200 text-violet-800' },
  add_note:          { label: 'Note Added',          Icon: StickyNote,    cls: 'bg-amber-50 border-amber-200 text-amber-800' },
  convert_lead:      { label: 'Lead Converted',      Icon: UserCheck,     cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  send_email:        { label: 'Email Sent',          Icon: Mail,          cls: 'bg-sky-50 border-sky-200 text-sky-800' },
  raise_ticket:      { label: 'Ticket Raised',       Icon: Ticket,        cls: 'bg-orange-50 border-orange-200 text-orange-800' },
  generate_proposal: { label: 'Proposal PDF',        Icon: FileText,      cls: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  generate_mou:      { label: 'MOU PDF',             Icon: FileText,      cls: 'bg-purple-50 border-purple-200 text-purple-800' },
  schedule_meeting:  { label: 'Meeting Scheduled',   Icon: Calendar,      cls: 'bg-teal-50 border-teal-200 text-teal-800' },
  schedule_followup: { label: 'Follow-up Scheduled', Icon: CalendarCheck, cls: 'bg-cyan-50 border-cyan-200 text-cyan-800' },
};

function ActionCard({ action, onGeneratePDF }) {
  const cfg = ACTION_CFG[action.type] || { label: action.type, Icon: CheckCircle, cls: 'bg-slate-50 border-slate-200 text-slate-700' };
  const { Icon } = cfg;
  const exec = action.execution || {};
  const isPendingPdf = exec.status === 'pending_pdf_send';
  const isError = exec.status === 'error';

  // Override label for proposal/MOU email
  const cardLabel = isPendingPdf
    ? (exec.email_type === 'proposal' ? 'Sending Proposal Email…' : 'Sending MOU Email…')
    : cfg.label;

  return (
    <div className={`mt-2 rounded-xl border px-3 py-2.5 text-xs ${cfg.cls}`}>
      <div className="flex items-center gap-2 font-semibold">
        {isError
          ? <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          : isPendingPdf
            ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
            : <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{cardLabel}</span>
        {action.school_name && <span className="font-normal opacity-70">— {action.school_name}</span>}
      </div>
      {exec.detail && <p className="opacity-70 pl-6 mt-0.5">{exec.detail}</p>}

      {(action.type === 'generate_proposal' || action.type === 'generate_mou') && (
        <button
          onClick={() => onGeneratePDF(action)}
          className="mt-2 ml-6 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-medium transition-colors"
          data-testid={`download-${action.type}-btn`}
        >
          <Download className="w-3 h-3" />
          Download {action.type === 'generate_proposal' ? 'Proposal' : 'MOU'} PDF
        </button>
      )}
    </div>
  );
}

function UserBubble({ msg }) {
  const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className="flex justify-end mb-3 px-4">
      <div className="max-w-[72%]">
        <div className="bg-[#dcf8c6] text-slate-900 rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm text-sm leading-relaxed">
          {msg.content}
        </div>
        <p className="text-[10px] text-slate-400 text-right mt-0.5 pr-1">{time}</p>
      </div>
    </div>
  );
}

function AIBubble({ msg, onGeneratePDF }) {
  const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className="flex justify-start mb-3 px-4">
      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center mr-2 shrink-0 mt-0.5 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="max-w-[78%]">
        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm border border-slate-100 text-sm">
          <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          {(msg.actions || []).map((a, i) => (
            <ActionCard key={i} action={a} onGeneratePDF={onGeneratePDF} />
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 pl-1">{time}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3 px-4">
      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center mr-2 shrink-0 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-100">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'Show me all follow-up leads',
  'Create a new lead for ABC School in Mumbai',
  'Generate a proposal for a school',
  'What are my active schools?',
  'Change status of a school to converted',
  'Send introduction email to a school',
];

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminAIChat() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('oll_user');
      if (raw) setUserInfo(JSON.parse(raw));
    } catch {}
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // On mount: restore last session or start fresh
  useEffect(() => {
    const restore = async () => {
      setHistoryLoading(true);
      try {
        // Try to get the most recent session for this user
        const res = await axios.get(`${API}/ai-chat/sessions`, { headers: getAuthHeaders() });
        const sessions = res.data.sessions || [];
        if (sessions.length > 0) {
          const latest = sessions[0]; // already sorted by updated_at desc
          setSessionId(latest.session_id);
          // Load its messages
          const histRes = await axios.get(`${API}/ai-chat/history/${latest.session_id}`, { headers: getAuthHeaders() });
          setMessages(histRes.data.messages || []);
        } else {
          // No previous sessions — start fresh
          setSessionId(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
          setMessages([]);
        }
      } catch {
        setSessionId(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        setMessages([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    restore();
  }, []);

  const startNewChat = useCallback(() => {
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSessionId(newId);
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    // Add user message to chat immediately
    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/ai-chat/message`,
        { session_id: sessionId, message: msg },
        { headers: getAuthHeaders() }
      );

      const aiMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.data.message || '(no response)',
        actions: res.data.actions || [],
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);

      // ── Handle pending_pdf_send actions (proposal/MOU email with attachment) ──
      const pendingPdfSends = (res.data.actions || []).filter(
        a => a.execution?.status === 'pending_pdf_send'
      );
      for (const a of pendingPdfSends) {
        const { email_type, school_id, to_email } = a.execution;
        if (!to_email || !school_id) continue;
        try {
          // Fetch full school data for PDF generation
          const schoolRes = await axios.get(`${API}/schools/inquiry/${school_id}`, { headers: getAuthHeaders() });
          const school = schoolRes.data;
          const proposalData = school.proposal_data || school.onboarding_data || {};
          const pdfCtx = { API, getAuthHeaders, user: userInfo, toast: () => {}, noDownload: true };
          let pdfResult;
          if (email_type === 'proposal') {
            pdfResult = await generateProposalDocument(school, proposalData, pdfCtx);
          } else {
            pdfResult = await generateMOUDocument(school, proposalData, pdfCtx);
          }
          if (pdfResult?.base64) {
            await axios.post(`${API}/schools/${school_id}/send-crm-email`, {
              email_type,
              to_email,
              pdf_base64: pdfResult.base64,
              pdf_filename: pdfResult.filename,
            }, { headers: getAuthHeaders() });
            toast.success(`${email_type === 'proposal' ? 'Proposal' : 'MOU'} email sent to ${to_email} with PDF attached!`);
            // Update the action card to show success
            setMessages(prev => prev.map(m => m.id === aiMsg.id ? {
              ...m,
              actions: m.actions.map(act =>
                act.execution?.status === 'pending_pdf_send' && act.execution?.email_type === email_type
                  ? { ...act, execution: { ...act.execution, status: 'success', detail: `Email sent to ${to_email} with PDF` } }
                  : act
              )
            } : m));
          }
        } catch (pdfErr) {
          console.error('PDF email error:', pdfErr);
          toast.error(`Failed to send ${email_type} email with PDF`);
        }
      }
    } catch (err) {
      const errMsg = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, something went wrong. ${err.response?.data?.detail || err.message}`,
        actions: [],
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
      toast.error('AI Chat error');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, sessionId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleGeneratePDF = async (action) => {
    const school = { id: action.school_id, school_name: action.school_name };
    const data = action.data || {};
    const ctx = { API, getAuthHeaders, user: userInfo, toast };
    try {
      if (action.type === 'generate_proposal') {
        await generateProposalDocument(school, data, ctx);
      } else {
        await generateMOUDocument(school, data, ctx);
      }
    } catch (err) {
      toast.error('PDF error: ' + err.message);
    }
  };

  const isEmpty = messages.length === 0 && !loading && !historyLoading;

  // ── Speech-to-text ───────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Speech recognition not supported in this browser'); return; }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setIsListening(false);
      sendMessage(transcript);   // auto-send immediately
    };
    rec.onerror = () => setIsListening(false);
    rec.onend   = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  };

  return (
    <AdminLayout title="AI Chat">
      {/* Full screen on mobile (no nav overhead), calc height on desktop */}
      <div className="flex flex-col h-[100dvh] md:h-[calc(100vh-64px)] bg-white overflow-hidden md:rounded-xl md:border md:border-slate-200 md:shadow-sm">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#075E54] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">OLL CRM Assistant</p>
              <p className="text-green-200 text-[11px]">Powered by GPT-5 · Agentic AI</p>
            </div>
          </div>
          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors"
            data-testid="new-chat-btn"
          >
            <Plus className="w-3.5 h-3.5" /> New Chat
          </button>
        </div>

        {/* ── Messages area ───────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto py-4"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23e8efe8\' fill-opacity=\'0.35\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")',
            backgroundColor: '#efeae2',
          }}
        >
          {/* Welcome / Empty state */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mb-4 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-slate-700 font-bold text-lg mb-1">OLL CRM AI Assistant</h2>
              <p className="text-slate-500 text-sm mb-6 max-w-xs">
                I can manage your School CRM — create leads, send emails, generate proposals, and more.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-left px-3 py-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all shadow-sm leading-snug"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* History loading spinner */}
          {historyLoading && (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          )}

          {/* Message list */}
          {!historyLoading && messages.map(msg =>
            msg.role === 'user'
              ? <UserBubble key={msg.id} msg={msg} />
              : <AIBubble key={msg.id} msg={msg} onGeneratePDF={handleGeneratePDF} />
          )}

          {/* Typing indicator */}
          {loading && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ───────────────────────────────────────────────── */}
        <div className="shrink-0 bg-[#f0f2f5] px-4 py-2.5 flex items-end gap-2 border-t border-slate-200">
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex items-end px-3 py-2 shadow-sm">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Listening…' : 'Ask me anything about your CRM...'}
              rows={1}
              className="flex-1 text-sm text-slate-800 bg-transparent outline-none resize-none max-h-28 leading-5 placeholder:text-slate-400"
              data-testid="ai-chat-input"
            />
          </div>
          {/* Mic button */}
          <button
            onClick={startListening}
            disabled={loading}
            title={isListening ? 'Stop listening' : 'Speak to send'}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-sm shrink-0
              ${isListening
                ? 'bg-red-500 animate-pulse ring-2 ring-red-400 ring-offset-1'
                : 'bg-slate-400 hover:bg-slate-500 disabled:bg-slate-300'}`}
            data-testid="ai-chat-mic-btn"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          {/* Send button */}
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-[#075E54] hover:bg-[#128C7E] disabled:bg-slate-300 flex items-center justify-center text-white transition-colors shadow-sm shrink-0"
            data-testid="ai-chat-send-btn"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
