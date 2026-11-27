import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Copy, Check, Loader2, Smartphone, MessageCircle, RefreshCw, Unlink } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Emergent-style WhatsApp pairing modal. Shows a 6-char code (XXX-XXX),
 * admin sends it from their WhatsApp to our business number, our webhook
 * links the account, this component polls `/admin/whatsapp-link/status`
 * every 3 s and auto-advances to the success state.
 */
export default function WhatsAppLinkDialog({ open, onClose, getAuthHeaders }) {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [waNumber, setWaNumber] = useState('+91 86574 03418');
  const [expiresAt, setExpiresAt] = useState(null);
  const [linked, setLinked] = useState(false);
  const [linkedPhone, setLinkedPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [directPhone, setDirectPhone] = useState('');
  const [directLoading, setDirectLoading] = useState(false);
  const pollTimer = useRef(null);
  const countdownTimer = useRef(null);

  const start = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/admin/whatsapp-link/start`, {}, { headers: getAuthHeaders() });
      setCode(data.code);
      setWaNumber(data.whatsapp_number);
      setExpiresAt(new Date(data.expires_at));
      setLinked(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not start pairing');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectLink = async (e) => {
    e?.preventDefault();
    const digits = directPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setDirectLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/admin/whatsapp-link/direct`,
        { phone: digits },
        { headers: getAuthHeaders() }
      );
      if (data.linked) {
        setLinked(true);
        setLinkedPhone(data.whatsapp_phone || digits.slice(-10));
        setCode('');
        toast.success('WhatsApp connected successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to link phone number');
    } finally {
      setDirectLoading(false);
    }
  };

  const unlink = async () => {
    if (!window.confirm('Unlink your WhatsApp from this account?')) return;
    try {
      await axios.post(`${API}/admin/whatsapp-link/unlink`, {}, { headers: getAuthHeaders() });
      setLinked(false);
      setLinkedPhone('');
      setDirectPhone('');
      setCode('');
      toast.success('WhatsApp unlinked');
      start();
    } catch (e) {
      toast.error('Unlink failed');
    }
  };

  const checkStatus = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/whatsapp-link/status`, { headers: getAuthHeaders() });
      if (data.linked) {
        setLinked(true);
        setLinkedPhone(data.whatsapp_phone || '');
        setCode('');
        return true;
      }
      if (data.pending_code) {
        setCode(data.pending_code);
        if (data.pending_expires_at) setExpiresAt(new Date(data.pending_expires_at));
      }
      return false;
    } catch (e) { return false; }
  };

  // On open: check status first; if already linked, show that. Otherwise start a new code and start polling.
  useEffect(() => {
    if (!open) return;
    (async () => {
      const already = await checkStatus();
      if (!already) {
        // Status also returns pending_code if one exists — only create new when none present
        const { data } = await axios.get(`${API}/admin/whatsapp-link/status`, { headers: getAuthHeaders() });
        if (!data.pending_code) await start();
      }
    })();
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Poll for link completion every 3 s while a code is active + unlinked
  useEffect(() => {
    if (!open || linked || !code) return;
    pollTimer.current = setInterval(async () => {
      const done = await checkStatus();
      if (done) {
        clearInterval(pollTimer.current);
        toast.success('WhatsApp connected successfully!');
      }
    }, 3000);
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, linked, code]);

  // Countdown to expiry
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    countdownTimer.current = setInterval(tick, 1000);
    return () => { if (countdownTimer.current) clearInterval(countdownTimer.current); };
  }, [expiresAt]);

  const mmss = (s) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden" data-testid="whatsapp-link-dialog">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-gradient-to-br from-emerald-500 to-emerald-600">
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5" /> Connect WhatsApp
          </DialogTitle>
          <div className="text-xs text-emerald-50 mt-1">
            Link your WhatsApp to run OLL admin commands from any device
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {linked ? (
            // ─── Already linked state ─────────────────────────────────
            <div className="text-center space-y-4" data-testid="whatsapp-link-success">
              <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <div className="font-bold text-[#0A1F44] text-lg">WhatsApp Connected</div>
                <div className="text-sm text-slate-500 mt-1">
                  Linked to <strong className="font-mono">+{linkedPhone}</strong>
                </div>
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 text-left">
                Send any message to <strong>{waNumber}</strong> from this number and it will run through your admin AI brain.
                Try: <code className="bg-white px-1 rounded">how many leads do I have?</code>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={unlink} data-testid="whatsapp-unlink-btn">
                  <Unlink className="w-4 h-4 mr-1" /> Unlink
                </Button>
                <Button size="sm" onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">Done</Button>
              </div>
            </div>
          ) : (
            // ─── Pairing / Direct Link state ──────────────────────────
            <div className="space-y-5">
              {/* Option 1: Direct Link */}
              <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-4">
                <div className="font-semibold text-xs text-emerald-900 flex items-center gap-1.5 mb-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" /> Instant Connect by Phone Number
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Enter your 10-digit WhatsApp phone number to link your account immediately:
                </p>
                <form onSubmit={handleDirectLink} className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={directPhone}
                      onChange={(e) => setDirectPhone(e.target.value)}
                      maxLength={15}
                      className="w-full pl-10 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      data-testid="whatsapp-direct-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={directLoading || !directPhone.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-xs px-3 font-semibold"
                    data-testid="whatsapp-direct-submit"
                  >
                    {directLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                  </Button>
                </form>
              </div>

              <div className="relative flex items-center py-0.5">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  Or Pair via Message
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Step 1 — Open WhatsApp */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div>
                  <div className="font-semibold text-[#0A1F44] text-sm">Open WhatsApp on your phone</div>
                  <a
                    href={`https://wa.me/${waNumber.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                    data-testid="whatsapp-open-link"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Open chat with {waNumber}
                  </a>
                </div>
              </div>

              {/* Step 2 — Send the code */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#0A1F44] text-sm">Send this exact code</div>

                  {code ? (
                    <>
                      <button
                        type="button"
                        onClick={copyCode}
                        className="mt-2.5 w-full flex items-center justify-between gap-2 px-4 py-3.5 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl transition-colors group"
                        data-testid="whatsapp-pairing-code"
                      >
                        <div className="font-mono text-2xl font-black tracking-[0.2em] text-[#0A1F44]">
                          {code}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 group-hover:text-emerald-600">
                          {copied ? (<><Check className="w-3.5 h-3.5" /> Copied</>) : (<><Copy className="w-3.5 h-3.5" /> Copy</>)}
                        </div>
                      </button>

                      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          <span data-testid="whatsapp-waiting">Waiting for your message…</span>
                        </div>
                        {secondsLeft > 0 && (
                          <span className={secondsLeft < 60 ? 'text-amber-600 font-semibold' : ''}>
                            Expires in {mmss(secondsLeft)}
                          </span>
                        )}
                      </div>

                      {secondsLeft === 0 && expiresAt && (
                        <button
                          type="button"
                          onClick={start}
                          disabled={loading}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg py-2"
                          data-testid="whatsapp-regenerate-code"
                        >
                          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Generate a fresh code
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="mt-3 py-4 flex items-center justify-center text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating code…
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
