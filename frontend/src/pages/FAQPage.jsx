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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Send, Sparkles, MessageSquare, Loader2, ThumbsUp, ThumbsDown,
  Lightbulb, RotateCcw, CheckCircle2, ExternalLink, ArrowRight,
  MessageCircle, Mail, Ticket, Mic, Square, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
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
        content: "I couldn't reach the server. Please email **info@oll.co** or WhatsApp **+91 99201 88188**.",
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

  // Use a ref so markFeedback (useCallback) can read the latest messages
  // without being invalidated — keeping the callback stable means
  // React.memo(MessageRow) works and the YouTube iframe / shop card no
  // longer flash on every keystroke in the composer.
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const markFeedback = useCallback((idx, value) => {
    setMessages((m) => m.map((msg, i) => i === idx ? { ...msg, feedback: value } : msg));
    if (value === 'down') setEscalateFor(idx);
    try {
      const latest = messagesRef.current;
      const lastUserQ = latest.slice(0, idx).reverse().find((x) => x.role === 'user')?.content || '';
      axios.post(`${API}/faq-chat/feedback`, {
        session_id: sessionId,
        verdict: value,
        question: lastUserQ,
      }).catch(() => {});
    } catch {}
  }, [sessionId]);

  const handleEscalate = useCallback((idx) => setEscalateFor(idx), []);

  // ─── Voice input (Web Speech API) ────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const voiceSupported = typeof window !== 'undefined' && (
    'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  );

  const toggleVoiceInput = useCallback(() => {
    if (!voiceSupported) {
      toast.error('Voice input isn\'t supported in this browser. Try Chrome or Safari.');
      return;
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;             // keep listening until user taps mic again
    rec.interimResults = true;         // show live transcript as user speaks
    rec.lang = 'en-IN';                // Indian English default — browser auto-falls-back if unsupported
    rec.maxAlternatives = 1;

    // Snapshot the input text at start so interim transcripts replace cleanly.
    const baseInput = input.trim();

    rec.onstart = () => setIsListening(true);
    rec.onerror = (ev) => {
      setIsListening(false);
      if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
        toast.error('Mic permission denied. Enable microphone in browser settings.');
      } else if (ev?.error === 'no-speech') {
        toast('I didn\'t catch that — tap the mic and try again.', { duration: 2500 });
      }
    };
    rec.onend = () => setIsListening(false);
    rec.onresult = (ev) => {
      let finalText = '';
      let interimText = '';
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      const combined = (baseInput + ' ' + finalText + interimText).trim();
      setInput(combined);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      setIsListening(false);
      toast.error('Couldn\'t start the mic — try again.');
    }
  }, [input, isListening, voiceSupported]);

  // Stop recognition when the page unmounts so it doesn\'t keep listening.
  useEffect(() => () => {
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

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
            {messages.map((m, i) => {
              const lastUserQuestion = messages.slice(0, i).reverse().find((x) => x.role === 'user')?.content || '';
              return (
                <div
                  key={i}
                  ref={(el) => { messageRefs.current[i] = el; }}
                >
                  <MessageRow
                    msg={m}
                    index={i}
                    onFeedback={markFeedback}
                    lastUserQuestion={lastUserQuestion}
                    onEscalate={handleEscalate}
                    data-testid={`faq-msg-${i}`}
                  />
                </div>
              );
            })}
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
            placeholder={isListening ? 'Listening — speak now…' : 'Type your question…'}
            className="flex-1 resize-none max-h-32 bg-transparent focus:outline-none text-sm px-3 py-2.5 min-h-[42px]"
            disabled={sending}
            data-testid="faq-input"
          />
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              className={`p-2.5 rounded-xl transition flex-shrink-0 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={isListening ? 'Stop listening' : 'Speak your question'}
              data-testid="faq-voice"
            >
              {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={resetChat}
            className="hidden sm:inline-flex text-slate-500 hover:text-slate-900 p-2.5 rounded-xl hover:bg-slate-100 transition"
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
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────
   Rendered row for one message. Assistant replies include a thumbs
   up/down bar that collapses to "Thanks for the feedback" when picked.
   ────────────────────────────────────────────────────────────────────── */
const WHATSAPP_NUMBER = '919920188188';
const SUPPORT_EMAIL = 'info@oll.co';

const buildWaUrl = (prefillText) => {
  const text = encodeURIComponent(prefillText || 'Hi OLL, I need help from the Techfest team.');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
};
const buildMailUrl = (prefillText) => {
  const subject = encodeURIComponent('Help request from oll.co/faq');
  const body = encodeURIComponent(prefillText || 'Hi OLL team, I need help with the following —\n\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
};

const MessageRow = React.memo(function MessageRow({ msg, index, onFeedback, lastUserQuestion, onEscalate }) {
  const isUser = msg.role === 'user';
  const html = useMemo(() => (isUser ? '' : mdToHtml(msg.content)), [msg.content, isUser]);
  const bubbleRef = useRef(null);
  const hydratedRef = useRef(false);
  const prefillText = `Question: ${lastUserQuestion || ''}\n\nI'd like a human to help with this.`;

  // Hydrate .faq-product-card placeholders ONCE per message. Guarding with
  // hydratedRef so parent re-renders (e.g. input typing, opening the ticket
  // modal) don't wipe & re-fetch the card — that was causing the "card
  // disappears when I click Raise ticket" and the "YouTube iframe flashes on
  // every keystroke" bugs.
  useEffect(() => {
    if (isUser || !bubbleRef.current || hydratedRef.current) return;
    hydratedRef.current = true;
    const placeholders = bubbleRef.current.querySelectorAll('.faq-product-card[data-pending="1"]');
    placeholders.forEach(async (el) => {
      el.setAttribute('data-pending', '0');
      const slug = el.getAttribute('data-slug');
      const url = el.getAttribute('data-url') || `https://oll.co/shop/product/${slug}`;
      el.innerHTML = `<div class="animate-pulse rounded-xl bg-slate-100 h-24 w-full"></div>`;
      try {
        const r = await axios.get(`${API}/faq-chat/product-lookup`, { params: { slug } });
        const p = r.data;
        if (!p?.found) {
          el.innerHTML = `<a href="${url}" target="_blank" rel="noreferrer" class="text-[#D63031] font-semibold underline">${url}</a>`;
          return;
        }
        const img = (p.image || '').replace(/"/g, '&quot;');
        const priceStr = typeof p.selling_price === 'number' ? `₹${p.selling_price.toLocaleString('en-IN')}` : 'Price on request';
        const mrpStr = (typeof p.mrp === 'number' && typeof p.selling_price === 'number' && p.mrp > p.selling_price)
          ? `<span class="text-slate-400 line-through text-xs ml-1">₹${p.mrp.toLocaleString('en-IN')}</span>` : '';
        el.outerHTML = `
          <div class="faq-product-card not-prose my-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div class="flex gap-3 p-3">
              <a href="${p.url}" target="_blank" rel="noreferrer" class="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                ${img ? `<img src="${img}" alt="${(p.name || '').replace(/"/g, '&quot;')}" loading="lazy" class="w-full h-full object-cover" />` : ''}
              </a>
              <div class="flex-1 min-w-0">
                ${p.category ? `<div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">${p.category}</div>` : ''}
                <a href="${p.url}" target="_blank" rel="noreferrer" class="text-sm font-bold text-[#0A1F44] hover:text-[#D63031] block mb-1 leading-tight break-words">${p.name || ''}</a>
                <div class="text-base font-black text-[#D63031]">${priceStr}${mrpStr}</div>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <a href="${p.url}" target="_blank" rel="noreferrer" class="inline-flex items-center text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full px-2.5 py-1">See details</a>
                  <a href="${p.url}" target="_blank" rel="noreferrer" class="inline-flex items-center text-[11px] font-semibold bg-[#D63031] hover:bg-[#B91C1C] text-white rounded-full px-2.5 py-1">Buy now</a>
                </div>
              </div>
            </div>
          </div>`;
      } catch (e) {
        el.innerHTML = `<a href="${url}" target="_blank" rel="noreferrer" class="text-[#D63031] font-semibold underline">${url}</a>`;
      }
    });
  }, [isUser]);

  const copyAnswer = async () => {
    try {
      const plain = String(msg.content || '')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
        .replace(/[*_`#>]+/g, '')
        .trim();
      await navigator.clipboard.writeText(plain);
      toast.success('Answer copied');
    } catch {
      toast.error('Could not copy — long-press to select instead.');
    }
  };

  const copyToClipboard = async (text, successMsg) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMsg || 'Copied');
    } catch {
      toast.error('Could not copy — try tapping and holding the link.');
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`} data-testid={`faq-msg-${index}`}>
      {!isUser && (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D63031] to-[#0A1F44] flex items-center justify-center flex-shrink-0 shadow-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`${isUser ? 'max-w-[82%]' : 'max-w-[88%] w-full'}`}>
        <div
          ref={bubbleRef}
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
          <>
            {/* Quick-action buttons under every answer — each primary action
                has a tiny copy-link button next to it so users can share
                the exact URL instead of clicking through. */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
              <a
                href={buildWaUrl(prefillText)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] rounded-full px-2.5 py-1 transition"
                data-testid={`faq-msg-${index}-whatsapp`}
              >
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </a>
              <button
                onClick={() => copyToClipboard(buildWaUrl(prefillText), 'WhatsApp link copied')}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                aria-label="Copy WhatsApp link"
                data-testid={`faq-msg-${index}-whatsapp-copy`}
              ><Copy className="w-3 h-3" /></button>
              <a
                href={buildMailUrl(prefillText)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full px-2.5 py-1 transition"
                data-testid={`faq-msg-${index}-email`}
              >
                <Mail className="w-3 h-3" /> Email
              </a>
              <button
                onClick={() => copyToClipboard('info@oll.co', 'Email copied')}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                aria-label="Copy email"
                data-testid={`faq-msg-${index}-email-copy`}
              ><Copy className="w-3 h-3" /></button>
              <button
                onClick={() => onEscalate(index)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#D63031]/10 hover:bg-[#D63031]/20 text-[#D63031] rounded-full px-2.5 py-1 transition"
                data-testid={`faq-msg-${index}-raise-ticket`}
              >
                <Ticket className="w-3 h-3" /> Raise ticket
              </button>
              <button
                onClick={copyAnswer}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full px-2.5 py-1 transition"
                data-testid={`faq-msg-${index}-copy-answer`}
              >
                <Copy className="w-3 h-3" /> Copy answer
              </button>
            </div>
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
                <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Thanks!</span>
              ) : (
                <span className="text-slate-500">Noted — raise a ticket above and we'll follow up.</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

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
const TICKET_CATEGORIES = {
  Techfest: ['Registration', 'Rules & specs', 'Submission', 'Regional round', 'Grand Finale', 'Prize money', 'Other'],
  Shop: ['Product details', 'Order status', 'Payment', 'Delivery', 'Return / refund', 'Other'],
  'School programs': ['Robotics & AI Program', 'Future Skills (ICSE/CBSE)', 'AI Center', 'Group 3', 'Workshops', 'Pricing / demo', 'Other'],
  'B2C programs': ['AI Foundations', 'Summer Camp', 'Continuous Learning', 'Workshops', 'Other'],
  Account: ['Login / password', 'Billing', 'My orders', 'Profile update', 'Other'],
  Other: ['General question'],
};

const EscalateDialog = ({ sessionId, messages, onClose, onDone }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [category, setCategory] = useState('Techfest');
  const [subcategory, setSubcategory] = useState('Registration');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prefill message with the last user question
  useEffect(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) setMessage(lastUserMsg.content);
  }, [messages]);

  // Keep subcategory consistent when category changes.
  useEffect(() => {
    const list = TICKET_CATEGORIES[category] || [];
    if (list.length && !list.includes(subcategory)) {
      setSubcategory(list[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name.'); return; }
    if (!email.trim()) { toast.error('Please enter your email.'); return; }
    if (!phone.trim()) { toast.error('Please enter your phone number.'); return; }
    if (!schoolName.trim()) { toast.error('Please enter your school name.'); return; }
    if (!message.trim()) { toast.error('Please add a short description.'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/faq-chat/raise-ticket`, {
        session_id: sessionId,
        name, email, phone, school_name: schoolName,
        category, subcategory, message,
      });
      onDone();
    } catch (err) {
      toast.error('Could not raise ticket. Please email info@oll.co directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const subList = TICKET_CATEGORIES[category] || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" data-testid="faq-escalate-dialog">
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
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
            placeholder="Your name *"
            required
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
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number *"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#D63031] focus:outline-none"
            data-testid="faq-escalate-phone"
          />
          <input
            type="text"
            required
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="School name *"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#D63031] focus:outline-none"
            data-testid="faq-escalate-school"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#D63031] focus:outline-none bg-white"
              data-testid="faq-escalate-category"
            >
              {Object.keys(TICKET_CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#D63031] focus:outline-none bg-white"
              data-testid="faq-escalate-subcategory"
            >
              {subList.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
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
            href="mailto:info@oll.co"
            className="text-xs text-slate-500 hover:text-[#D63031] inline-flex items-center gap-1"
            data-testid="faq-escalate-email-link"
          >
            Or email info@oll.co <ExternalLink className="w-3 h-3" />
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
