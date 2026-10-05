/**
 * FAQPage — public AI chatbot at https://oll.co/faq
 *
 * ─ UI ──────────────────────────────────────────────────────────────
 *   Full-screen chat with a header, suggestion chips (first visit),
 *   message log and a composer. On every assistant reply we also show
 *   a "Was this helpful? ✓ Yes / ✗ No" bar — tapping No opens a tiny
 *   form to escalate to a human (writes to /api/faq-chat/raise-ticket).
 *
 * ─ Data ────────────────────────────────────────────────────────────
 *   • session_id persisted in sessionStorage so a refresh keeps context
 *   • logged-in users: we forward their JWT via Authorization header so
 *     the server can inline their own support tickets into the prompt
 *   • messages kept in local component state only (not in Mongo)
 *
 * ─ SEO ─────────────────────────────────────────────────────────────
 *   This replaces the old static FAQ page. Keywords retained via the
 *   FAQPage JSON-LD block emitted below so Google still ranks the page
 *   for competition / registration / kit queries.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Send, Sparkles, MessageSquare, Loader2, ThumbsUp, ThumbsDown,
  Lightbulb, RotateCcw, CheckCircle2, ExternalLink, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useSeo from '../hooks/useSeo';
import { mdToHtml } from '../utils/richContent';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BOT_NAME = 'OLLBot';
const WELCOME = `Hi — I'm **${BOT_NAME}**, OLL's AI assistant.\n\nAsk me anything about the **Techfest IIT Bombay 2026** championship, our **robotics kits**, **curriculum books**, **orders** or **support**. I know the full rulebook, the official problem statement and the OLL shop.`;

// Stable session id so a page refresh keeps the bot's memory.
const getSessionId = () => {
  let sid = sessionStorage.getItem('oll_faq_session');
  if (!sid) {
    sid = `fq-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('oll_faq_session', sid);
  }
  return sid;
};

const authHeader = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const FAQPage = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: WELCOME, feedback: null, isWelcome: true },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [escalateFor, setEscalateFor] = useState(null); // msg index user said No to
  const [sessionId] = useState(getSessionId);
  // Refs to the message DOM nodes so we can scroll the latest *user* question
  // to the top of the viewport (keeps the answer visible from its start —
  // never scrolls to the footer).
  const messageRefs = useRef([]);

  // Hide the global "Need Help?" floating button while this page is mounted —
  // the chatbot itself is the help channel, and the floating button collides
  // with our sticky composer on mobile.
  useEffect(() => {
    document.body.classList.add('faq-chatbot-open');
    return () => { document.body.classList.remove('faq-chatbot-open'); };
  }, []);

  const scrollToIndex = useCallback((idx) => {
    const node = messageRefs.current[idx];
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const absoluteTop = rect.top + window.scrollY;
    // Give some breathing room above the pinned question (navbar + hero padding).
    const headerOffset = 80;
    window.scrollTo({ top: Math.max(absoluteTop - headerOffset, 0), behavior: 'smooth' });
  }, []);

  // When a new message is appended (user sends → assistant replies), park the
  // last user question near the top so the answer renders from its start,
  // not from the footer. We never auto-scroll on first mount.
  useEffect(() => {
    if (messages.length <= 1) return;
    // Find the last user message index — we anchor to that so the user sees
    // their own question + the fresh answer flowing below it.
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx >= 0) {
      // Wait for the DOM to paint the new nodes before measuring.
      requestAnimationFrame(() => scrollToIndex(lastUserIdx));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);
  // Nudge view a touch when the "thinking…" bubble appears so the user sees
  // feedback immediately — but keep their question at the top of the viewport.
  useEffect(() => {
    if (!sending) return;
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx >= 0) requestAnimationFrame(() => scrollToIndex(lastUserIdx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending]);

  useSeo({
    title: 'OLL FAQ — Ask OLLBot about Techfest, Kits, Orders & Support',
    description:
      'Chat with OLLBot — the official AI assistant for OLL. Instant answers on the Techfest IIT Bombay 2026 championship, RoboSumo & RoboRacer kits, curriculum books, orders and support.',
    keywords: 'oll faq, oll chatbot, techfest iit bombay 2026 faq, robosumo rules, roboracer rules, robotics innovation challenge, oll kits support, oll ai assistant',
    canonical: 'https://oll.co/faq',
    robots: 'index, follow, max-image-preview:large',
    og: {
      title: 'OLL FAQ — Ask OLLBot anything',
      description: 'AI assistant with the full Techfest rulebook, kit catalog and OLL support knowledge.',
      url: 'https://oll.co/faq',
      type: 'website',
      siteName: 'OLL',
    },
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How do I register for OLL Techfest IIT Bombay 2026?',
            acceptedAnswer: { '@type': 'Answer', text: 'Register free at https://oll.co/techfest/register before 10 October 2026. Choose RoboSumo, RoboRacer or the Robotics Innovation Challenge.' },
          },
          {
            '@type': 'Question',
            name: 'Is there a registration fee for the OLL Robotics Championship?',
            acceptedAnswer: { '@type': 'Answer', text: 'No — participation is completely free across all three tracks and all rounds.' },
          },
          {
            '@type': 'Question',
            name: 'When is the Grand Finale at IIT Bombay?',
            acceptedAnswer: { '@type': 'Answer', text: 'December 16–18, 2026 at Techfest, IIT Bombay.' },
          },
          {
            '@type': 'Question',
            name: 'What are the arena specs for RoboSumo?',
            acceptedAnswer: { '@type': 'Answer', text: '100 cm circular diameter arena. Bot envelope 25 × 25 × 25 cm max, 3 kg max weight. 2-minute matches, first bot pushed out of the ring loses.' },
          },
        ],
      },
    ],
  });

  useEffect(() => {
    axios.get(`${API}/faq-chat/suggestions`)
      .then((r) => setSuggestions(r.data?.suggestions || []))
      .catch(() => {});
  }, []);

  const sendMessage = useCallback(async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setInput('');
    setSending(true);
    try {
      const r = await axios.post(
        `${API}/faq-chat`,
        { session_id: sessionId, message },
        { headers: { ...authHeader() }, timeout: 60000 },
      );
      setMessages((m) => [...m, { role: 'assistant', content: r.data?.reply || '…', feedback: null }]);
    } catch (e) {
      setMessages((m) => [...m, {
        role: 'assistant',
        content: "I couldn't reach the server. Please email **support@oll.co** or tap **Need Help** at the bottom-right of this page.",
        feedback: null,
      }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, sessionId]);

  const resetChat = async () => {
    try { await axios.post(`${API}/faq-chat/reset`, null, { params: { session_id: sessionId } }); } catch {}
    sessionStorage.removeItem('oll_faq_session');
    setMessages([{ role: 'assistant', content: WELCOME, feedback: null, isWelcome: true }]);
    setEscalateFor(null);
  };

  const markFeedback = (idx, value) => {
    setMessages((m) => m.map((msg, i) => i === idx ? { ...msg, feedback: value } : msg));
    if (value === 'down') setEscalateFor(idx);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200" data-testid="faq-hero">
        <div className="absolute inset-0 opacity-70"
          style={{ background: 'radial-gradient(1200px 400px at 20% 0%, rgba(214,48,49,0.08), transparent 60%), radial-gradient(1200px 400px at 100% 100%, rgba(10,31,68,0.08), transparent 60%)' }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#D63031] shadow-sm">
            <Sparkles className="w-3.5 h-3.5" /> AI-powered · Live
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#0A1F44]">
            Ask OLLBot anything
          </h1>
        </div>
      </section>

      {/* Chat area */}
      <main className="flex-1 flex items-stretch justify-center pb-32">
        <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-6 flex flex-col" data-testid="faq-chat">
          {/* Message log */}
          <div
            className="space-y-5 pr-1 min-h-[320px]"
            data-testid="faq-chat-log"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                ref={(el) => { messageRefs.current[i] = el; }}
              >
                <MessageRow
                  msg={m}
                  index={i}
                  onFeedback={markFeedback}
                  data-testid={`faq-msg-${i}`}
                />
              </div>
            ))}
            {sending && <ThinkingRow />}

            {/* Suggestion chips — right under the welcome message so users don't
                have to scroll to find them. Only shown when no user message yet. */}
            {suggestions.length > 0 && messages.filter((m) => m.role === 'user').length === 0 && (
              <div className="pt-2" data-testid="faq-suggestions">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1 pl-12">
                  <Lightbulb className="w-3.5 h-3.5" /> Try one of these
                </div>
                <div className="flex flex-wrap gap-2 pl-12">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-xs bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-400 text-slate-700 rounded-full px-3 py-1.5 font-semibold transition"
                      data-testid={`faq-suggestion-${s.slice(0, 20).replace(/\W+/g, '-')}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Scroll runway — only after a conversation starts, guarantees the
                latest user question can be anchored to the top. */}
            {messages.filter((m) => m.role === 'user').length > 0 && (
              <div aria-hidden className="h-[70vh]" />
            )}
          </div>

        </div>
      </main>

      {/* Composer — ALWAYS fixed at the bottom. We use position: fixed
          rather than sticky because index.css sets `html, body { overflow-x:
          hidden }` which silently promotes <body> to a scroll container and
          breaks `position: sticky` across the app (same root cause we fixed
          on the Shop navbar). */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-white via-white to-white/0 pt-6 pb-4 px-3 sm:px-6"
        data-testid="faq-composer-wrap"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="max-w-3xl mx-auto flex items-end gap-2 bg-white rounded-2xl border border-slate-200 shadow-xl p-2"
          data-testid="faq-composer"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={1}
            placeholder="Type your question… (Shift+Enter for a new line)"
            className="flex-1 resize-none max-h-32 bg-transparent focus:outline-none text-sm px-3 py-2.5 min-h-[42px]"
            disabled={sending}
            data-testid="faq-input"
          />
          <button
            type="button"
            onClick={resetChat}
            className="text-slate-500 hover:text-slate-900 p-2.5 rounded-xl hover:bg-slate-100 transition"
            title="New conversation"
            data-testid="faq-reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex items-center gap-1.5 bg-[#D63031] hover:bg-[#B91C1C] text-white rounded-xl px-4 py-2.5 text-sm font-bold disabled:bg-slate-300 disabled:cursor-not-allowed transition shadow-sm"
            data-testid="faq-send"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>

      {/* Escalate dialog */}
      {escalateFor !== null && (
        <EscalateDialog
          sessionId={sessionId}
          messages={messages}
          onClose={() => setEscalateFor(null)}
          onDone={() => {
            setEscalateFor(null);
            toast.success("Thanks — a human will reach out shortly.");
          }}
        />
      )}

      <Footer />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────
   Rendered row for one message. Assistant replies include a thumbs
   up/down bar that collapses to "Thanks for the feedback" when picked.
   ────────────────────────────────────────────────────────────────────── */
const MessageRow = ({ msg, index, onFeedback }) => {
  const isUser = msg.role === 'user';
  const html = useMemo(() => (isUser ? '' : mdToHtml(msg.content)), [msg.content, isUser]);
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`} data-testid={`faq-msg-${index}`}>
      {!isUser && (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D63031] to-[#0A1F44] flex items-center justify-center flex-shrink-0 shadow-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`${isUser ? 'max-w-[82%]' : 'max-w-[85%]'}`}>
        <div
          className={`${
            isUser
              ? 'bg-[#0A1F44] text-white rounded-2xl rounded-tr-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm shadow-sm'
          } px-4 py-3 text-sm leading-relaxed break-words`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="pdp-rich" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
        {!isUser && !msg.isWelcome && (
          <div className="mt-1.5 flex items-center gap-1 pl-1 text-xs">
            {msg.feedback === null ? (
              <>
                <span className="text-slate-400 mr-1">Was this helpful?</span>
                <button
                  onClick={() => onFeedback(index, 'up')}
                  className="p-1 rounded hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition"
                  data-testid={`faq-msg-${index}-thumbs-up`}
                  aria-label="Helpful"
                ><ThumbsUp className="w-3.5 h-3.5" /></button>
                <button
                  onClick={() => onFeedback(index, 'down')}
                  className="p-1 rounded hover:bg-red-50 text-slate-500 hover:text-red-600 transition"
                  data-testid={`faq-msg-${index}-thumbs-down`}
                  aria-label="Not helpful"
                ><ThumbsDown className="w-3.5 h-3.5" /></button>
              </>
            ) : msg.feedback === 'up' ? (
              <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Thanks for the feedback</span>
            ) : (
              <span className="text-slate-500">A human will reach out shortly — form below.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ThinkingRow = () => (
  <div className="flex gap-3 justify-start" data-testid="faq-thinking">
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D63031] to-[#0A1F44] flex items-center justify-center shadow-sm">
      <Sparkles className="w-4 h-4 text-white animate-pulse" />
    </div>
    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      <span className="text-xs text-slate-500 ml-1">OLLBot is thinking…</span>
    </div>
  </div>
);

/* ──────────────────────────────────────────────────────────────────────
   Escalation dialog — only shown when user taps 👎. Writes a row to
   support_queries with the full chat transcript so the support team
   can pick up where OLLBot gave up.
   ────────────────────────────────────────────────────────────────────── */
const EscalateDialog = ({ sessionId, messages, onClose, onDone }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prefill message with the last user question
  useEffect(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) setMessage(lastUserMsg.content);
  }, [messages]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !message.trim()) {
      toast.error('Please enter your email and a short description.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/faq-chat/raise-ticket`, {
        session_id: sessionId,
        name, email, phone, message,
      });
      onDone();
    } catch (err) {
      toast.error('Could not raise ticket. Please email support@oll.co directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" data-testid="faq-escalate-dialog">
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[#D63031]">We&apos;ll take it from here</div>
            <h3 className="text-lg font-black text-[#0A1F44]">Raise a support ticket</h3>
            <p className="text-xs text-slate-500 mt-1">A real human from OLL will reply within a few hours.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none" data-testid="faq-escalate-close">&times;</button>
        </div>
        <div className="space-y-2.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#D63031] focus:outline-none"
            data-testid="faq-escalate-name"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@school.in *"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#D63031] focus:outline-none"
            data-testid="faq-escalate-email"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#D63031] focus:outline-none"
            data-testid="faq-escalate-phone"
          />
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="What do you need help with? *"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#D63031] focus:outline-none resize-none"
            data-testid="faq-escalate-message"
          />
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <a
            href="mailto:support@oll.co"
            className="text-xs text-slate-500 hover:text-[#D63031] inline-flex items-center gap-1"
            data-testid="faq-escalate-email-link"
          >
            Or email support@oll.co <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 bg-[#D63031] hover:bg-[#B91C1C] text-white rounded-lg px-4 py-2 text-sm font-bold disabled:bg-slate-300"
            data-testid="faq-escalate-submit"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Raise ticket
          </button>
        </div>
      </form>
    </div>
  );
};

export default FAQPage;
