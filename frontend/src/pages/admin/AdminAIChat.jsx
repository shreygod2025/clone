import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AdminLayout } from './AdminDashboard';
import axios from 'axios';
import { toast } from 'sonner';
import { generateProposalDocument } from '../../utils/proposalPdfGenerator';
import { generateMOUDocument } from '../../utils/mouPdfGenerator';
import {
  Send, Plus, Trash2, Bot, User, CheckCircle, XCircle,
  Download, FileText, Building2, Mail, Tag, StickyNote,
  UserCheck, Ticket, Loader2, ChevronDown, Sparkles
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getAuthHeaders() {
  const token = localStorage.getItem('oll_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Action type config ────────────────────────────────────────────────────
const ACTION_CONFIG = {
  create_lead:        { label: 'Lead Created',       icon: Building2,  color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  update_lead:        { label: 'Lead Updated',        icon: Building2,  color: 'bg-blue-50 border-blue-200 text-blue-800' },
  delete_lead:        { label: 'Lead Deleted',        icon: Building2,  color: 'bg-red-50 border-red-200 text-red-800' },
  change_status:      { label: 'Status Changed',      icon: Tag,        color: 'bg-violet-50 border-violet-200 text-violet-800' },
  add_note:           { label: 'Note Added',          icon: StickyNote, color: 'bg-amber-50 border-amber-200 text-amber-800' },
  convert_lead:       { label: 'Lead Converted',      icon: UserCheck,  color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  send_email:         { label: 'Email Sent',          icon: Mail,       color: 'bg-sky-50 border-sky-200 text-sky-800' },
  raise_ticket:       { label: 'Ticket Raised',       icon: Ticket,     color: 'bg-orange-50 border-orange-200 text-orange-800' },
  generate_proposal:  { label: 'Proposal PDF',        icon: FileText,   color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  generate_mou:       { label: 'MOU PDF',             icon: FileText,   color: 'bg-purple-50 border-purple-200 text-purple-800' },
};

// ── Single action card ────────────────────────────────────────────────────
function ActionCard({ action, user, onGeneratePDF }) {
  const cfg = ACTION_CONFIG[action.type] || { label: action.type, icon: CheckCircle, color: 'bg-slate-50 border-slate-200 text-slate-700' };
  const Icon = cfg.icon;
  const exec = action.execution || {};
  const isError = exec.status === 'error';
  const isFrontend = exec.status === 'frontend_action';

  return (
    <div className={`mt-2 rounded-xl border px-3 py-2.5 text-xs ${cfg.color} flex flex-col gap-1`}>
      <div className="flex items-center gap-2 font-semibold">
        {isError ? <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" /> : <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
        <span>{cfg.label}</span>
        {action.school_name && <span className="font-normal opacity-70">— {action.school_name}</span>}
      </div>
      <p className="opacity-75 pl-5">{exec.detail || ''}</p>

      {/* PDF download button for proposal/mou frontend actions */}
      {(action.type === 'generate_proposal' || action.type === 'generate_mou') && (
        <button
          onClick={() => onGeneratePDF(action)}
          className="mt-1 ml-5 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-[11px] w-fit transition-colors"
          data-testid={`download-${action.type}-btn`}
        >
          <Download className="w-3 h-3" />
          Download {action.type === 'generate_proposal' ? 'Proposal' : 'MOU'} PDF
        </button>
      )}
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────
function MessageBubble({ msg, user, onGeneratePDF }) {
  const isUser = msg.role === 'user';
  const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

  if (isUser) {
    return (
      <div className="flex justify-end mb-3 px-3">
        <div className="max-w-[72%]">
          <div className="bg-[#dcf8c6] text-slate-900 rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm text-sm leading-relaxed">
            {msg.content}
          </div>
          <p className="text-[10px] text-slate-400 text-right mt-0.5 pr-1">{time}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-3 px-3">
      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center mr-2 shrink-0 mt-0.5 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="max-w-[78%]">
        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm text-sm leading-relaxed text-slate-800 border border-slate-100">
          <p className="whitespace-pre-wrap">{msg.content}</p>
          {/* Action cards */}
          {(msg.actions || []).map((action, i) => (
            <ActionCard key={i} action={action} user={user} onGeneratePDF={onGeneratePDF} />
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 pl-1">{time}</p>
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3 px-3">
      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center mr-2 shrink-0 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-100">
        <div className="flex gap-1 items-center h-4">
          {[0,1,2].map(i => (
            <span key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Session list item ─────────────────────────────────────────────────────
function SessionItem({ session, isActive, onClick, onDelete }) {
  const lastMsg = session.messages?.[0];
  const preview = lastMsg?.content ? lastMsg.content.slice(0, 50) + (lastMsg.content.length > 50 ? '...' : '') : 'New conversation';
  const time = session.updated_at ? new Date(session.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-2 px-3 py-3 cursor-pointer hover:bg-slate-100 border-b border-slate-100 transition-colors group ${isActive ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''}`}
    >
      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-800 truncate">CRM Assistant</span>
          <span className="text-[10px] text-slate-400 shrink-0 ml-1">{time}</span>
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-0.5">{preview}</p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(session.session_id); }}
        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 shrink-0 transition-all mt-0.5"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── QUICK ACTION SUGGESTIONS ─────────────────────────────────────────────
const SUGGESTIONS = [
  "Show me all follow-up leads",
  "Create a new lead for ABC School in Mumbai",
  "Generate a proposal for a school",
  "What are my active schools?",
  "Change status of a school to converted",
  "Send introduction email to a school",
];

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminAIChat() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch user info
  useEffect(() => {
    const raw = localStorage.getItem('oll_user');
    if (raw) {
      try { setUserInfo(JSON.parse(raw)); } catch {}
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load sessions list
  const loadSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/ai-chat/sessions`, { headers: getAuthHeaders() });
      setSessions(res.data.sessions || []);
    } catch {}
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Load message history for active session
  const loadHistory = useCallback(async (sid) => {
    if (!sid) { setMessages([]); return; }
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API}/ai-chat/history/${sid}`, { headers: getAuthHeaders() });
      setMessages(res.data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(activeSessionId); }, [activeSessionId, loadHistory]);

  // Start new session
  const newSession = () => {
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    setActiveSessionId(newId);
    setMessages([]);
    inputRef.current?.focus();
  };

  // Send message
  const sendMessage = async (text = input) => {
    const msg = text.trim();
    if (!msg || loading) return;

    const sid = activeSessionId || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    if (!activeSessionId) setActiveSessionId(sid);

    // Optimistic UI
    const userMsg = { id: Date.now(), role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/ai-chat/message`,
        { session_id: sid, message: msg },
        { headers: getAuthHeaders() }
      );
      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.data.message,
        actions: res.data.actions || [],
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev.slice(0, -1), userMsg, aiMsg]);
      // Trigger any PDF frontend actions
      (res.data.actions || []).forEach(action => {
        if (action.execution?.status === 'frontend_action') {
          // PDF will be downloaded when user clicks the button in ActionCard
        }
      });
      await loadSessions();
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        role: 'assistant',
        content: 'Sorry, I ran into an error. Please try again.',
        actions: [],
        timestamp: new Date().toISOString()
      }]);
      toast.error('AI Chat error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Handle PDF generation (called from ActionCard)
  const handleGeneratePDF = async (action) => {
    const school = { id: action.school_id, school_name: action.school_name };
    const data = action.data || {};
    const ctx = { API, getAuthHeaders, user: userInfo, toast, fetchInquiries: null, setLastProposalPDF: null, setOnboardData: null };

    try {
      if (action.type === 'generate_proposal') {
        await generateProposalDocument(school, data, ctx);
      } else if (action.type === 'generate_mou') {
        await generateMOUDocument(school, data, ctx);
      }
    } catch (err) {
      toast.error('PDF generation failed: ' + err.message);
    }
  };

  // Delete session
  const deleteSession = async (sid) => {
    await axios.delete(`${API}/ai-chat/session/${sid}`, { headers: getAuthHeaders() });
    if (activeSessionId === sid) {
      setActiveSessionId(null);
      setMessages([]);
    }
    setSessions(prev => prev.filter(s => s.session_id !== sid));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AdminLayout title="AI Chat">
      <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden rounded-xl border border-slate-200 shadow-sm">

        {/* ── SIDEBAR: Session list ──────────────────────────────────── */}
        <div className={`flex flex-col border-r border-slate-200 bg-slate-50 transition-all duration-200 ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-[#075E54]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">CRM AI Chat</p>
                <p className="text-green-200 text-[10px]">School CRM Assistant</p>
              </div>
            </div>
            <button
              onClick={newSession}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              title="New Chat"
              data-testid="new-chat-btn"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Sessions */}
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs mt-4">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No chats yet</p>
                <p className="mt-1">Click + to start</p>
              </div>
            ) : (
              sessions.map(s => (
                <SessionItem
                  key={s.session_id}
                  session={s}
                  isActive={activeSessionId === s.session_id}
                  onClick={() => setActiveSessionId(s.session_id)}
                  onDelete={deleteSession}
                />
              ))
            )}
          </div>
        </div>

        {/* ── MAIN CHAT AREA ─────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#075E54] shadow-sm shrink-0">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="text-white/70 hover:text-white"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${sidebarOpen ? '-rotate-90' : 'rotate-90'}`} />
            </button>
            <div className="w-9 h-9 rounded-full bg-indigo-200 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-700" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">OLL CRM Assistant</p>
              <p className="text-green-200 text-[10px]">Powered by GPT-5 · Agentic AI</p>
            </div>
          </div>

          {/* Messages area */}
          <div
            className="flex-1 overflow-y-auto py-4"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23e8efe8\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")', backgroundColor: '#efeae2' }}
          >
            {/* Empty state / Welcome */}
            {messages.length === 0 && !historyLoading && (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mb-4 shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-slate-700 font-bold text-lg mb-1">OLL CRM AI Assistant</h2>
                <p className="text-slate-500 text-sm mb-6 max-w-xs">I can manage your School CRM — create leads, send emails, generate proposals, and more.</p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { newSession(); setTimeout(() => sendMessage(s), 100); }}
                      className="text-left px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all shadow-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* History loading */}
            {historyLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            )}

            {/* Messages */}
            {!historyLoading && messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                user={userInfo}
                onGeneratePDF={handleGeneratePDF}
              />
            ))}

            {/* Typing indicator */}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="shrink-0 bg-[#f0f2f5] px-3 py-2.5 flex items-end gap-2 border-t border-slate-200">
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex items-end px-3 py-2 shadow-sm">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your CRM..."
                rows={1}
                className="flex-1 text-sm text-slate-800 bg-transparent outline-none resize-none max-h-28 leading-5 placeholder:text-slate-400"
                style={{ minHeight: '20px' }}
                data-testid="ai-chat-input"
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-full bg-[#075E54] hover:bg-[#128C7E] disabled:bg-slate-300 flex items-center justify-center text-white transition-colors shadow-sm shrink-0"
              data-testid="ai-chat-send-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
