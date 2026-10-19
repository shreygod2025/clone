import { useState } from 'react';
import { Download, X } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Fetch → Blob → <a download> so it saves instead of previewing; falls back to a new tab on CORS.
const downloadPdf = async (url, filename) => {
  const click = (href, extra = {}) => {
    const a = Object.assign(document.createElement('a'), { href, download: filename, ...extra });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch-fail');
    const obj = URL.createObjectURL(await res.blob());
    click(obj);
    setTimeout(() => URL.revokeObjectURL(obj), 4000);
  } catch {
    click(url, { target: '_blank', rel: 'noopener noreferrer' });
  }
};

/** School Name + Phone gate → saves a School CRM lead, then downloads the curriculum PDF. */
export default function CurriculumGateModal({ open, onClose, pdfUrl, pdfName, title, offering, program, source, testid = 'curriculum-gate' }) {
  const [form, setForm] = useState({ school_name: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.school_name.trim() || form.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter your school name and a valid 10-digit phone number.'); return;
    }
    setBusy(true); setError('');
    downloadPdf(pdfUrl, pdfName);
    try {
      await fetch(`${API}/api/schools/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: form.school_name.trim(),
          contact_name: '',
          email: `lead_${form.phone.replace(/\D/g, '')}@pending.oll.co`,
          phone: form.phone.trim(),
          selected_offerings: [offering],
          programs_interested: [program],
          source,
          notes: `Lead captured via ${offering} landing page — Curriculum PDF download gate.`,
          assign_option: 'admin',
        }),
      });
    } catch { /* PDF is already downloading */ }
    setBusy(false);
    setForm({ school_name: '', phone: '' });
    onClose();
  };

  const input = 'w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#DC2626] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 text-slate-800';
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose} data-testid={`${testid}-modal`}>
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} style={{ fontFamily: "'Proxima Nova','Montserrat',system-ui,sans-serif" }}>
        <button type="button" onClick={onClose} className="absolute top-3 right-3 text-white/70 hover:text-white" aria-label="Close" data-testid={`${testid}-close`}><X className="w-5 h-5" /></button>
        <div className="p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,#0A1F44 0%, #1E3A5F 100%)' }}>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80"><Download className="w-4 h-4 text-[#DC2626]" /> One quick step</div>
          <div className="text-[#FCA5A5] text-2xl mt-2" style={{ fontFamily: "'Caveat', cursive" }}>get the full curriculum</div>
          <h3 className="text-white text-2xl sm:text-3xl mt-1 font-light leading-tight">{title}</h3>
          <p className="text-white/70 text-sm mt-2 font-light">Enter your school name and phone number — the PDF downloads instantly and a schools-team advisor will reach out with a demo slot.</p>
        </div>
        <form onSubmit={submit} className="p-6 sm:p-8 space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">School Name *</label>
            <input type="text" required autoFocus value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} className={input} placeholder="e.g., Sanjeevani World School" data-testid={`${testid}-school`} />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Contact Phone Number *</label>
            <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} placeholder="+91 98XXXXXXXX" data-testid={`${testid}-phone`} />
          </div>
          {error && <div className="text-sm text-[#DC2626] font-bold" data-testid={`${testid}-error`}>{error}</div>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-full border-2 border-[#0A1F44] text-[#0A1F44] font-bold hover:bg-[#0A1F44] hover:text-white transition-colors" data-testid={`${testid}-cancel`}>Cancel</button>
            <button type="submit" disabled={busy} className="flex-1 py-3 rounded-full text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'linear-gradient(90deg, #DC2626 0%, #1E3A8A 100%)' }} data-testid={`${testid}-submit`}>
              {busy ? 'Sending…' : (<>Download PDF <Download className="w-4 h-4" /></>)}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-center pt-1">We'll never spam. One-time contact from OLL's schools team.</p>
        </form>
      </div>
    </div>
  );
}
